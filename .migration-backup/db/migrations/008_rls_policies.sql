-- =====================================================================
-- 008 · Row-Level Security policies
-- =====================================================================
-- The keystone of the multi-tenant model. Every domain table is locked
-- down so that an authenticated user can only see rows belonging to
-- their own tenant. Super-admins see everything.
--
-- The functions `current_client_id()`, `current_user_role()`,
-- `is_super_admin()`, and `is_staff()` are defined in 002.
-- =====================================================================

-- ── Enable RLS on every domain table ────────────────────────────────
alter table clients               enable row level security;
alter table client_features       enable row level security;
alter table profiles              enable row level security;
alter table branches              enable row level security;
alter table loan_applications     enable row level security;
alter table application_status_history enable row level security;
alter table documents             enable row level security;
alter table contracts             enable row level security;
alter table loans                 enable row level security;
alter table repayment_schedule    enable row level security;
alter table pulls                 enable row level security;
alter table usage_logs            enable row level security;
alter table invoices              enable row level security;
alter table invoice_line_items    enable row level security;
-- audit_log RLS already enabled in 007 (with no-update / no-delete).

-- =====================================================================
-- CLIENTS — tenant root
-- =====================================================================
-- Borrowers see only their own client. Staff see only their own client.
-- Super-admin sees all. Updates restricted to admin + super_admin.

drop policy if exists clients_read on clients;
create policy clients_read on clients
  for select using (
    deleted_at is null
    and (is_super_admin() or id = current_client_id())
  );

drop policy if exists clients_insert on clients;
create policy clients_insert on clients
  for insert with check (is_super_admin());

drop policy if exists clients_update on clients;
create policy clients_update on clients
  for update using (
    is_super_admin()
    or (current_user_role() = 'admin' and id = current_client_id())
  );

-- =====================================================================
-- CLIENT FEATURES
-- =====================================================================
drop policy if exists client_features_read on client_features;
create policy client_features_read on client_features
  for select using (is_super_admin() or client_id = current_client_id());

drop policy if exists client_features_write on client_features;
create policy client_features_write on client_features
  for all using (is_super_admin()) with check (is_super_admin());

-- =====================================================================
-- PROFILES
-- =====================================================================
-- Read: super-admin sees all. Staff in a tenant see all profiles in
-- their tenant. Borrowers see only their own profile.

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select using (
    deleted_at is null and (
      is_super_admin()
      or id = auth.uid()
      or (is_staff() and client_id = current_client_id())
    )
  );

-- Update: a user can update their own profile (non-sensitive fields).
-- Role + client_id are immutable except via super_admin / admin.
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and client_id = (select client_id from profiles where id = auth.uid())  -- can't move tenants
    and role      = (select role      from profiles where id = auth.uid())  -- can't escalate
  );

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles
  for update using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );

-- Insert: handled by the auth trigger in 002. No direct INSERT policy.

-- =====================================================================
-- BRANCHES
-- =====================================================================
drop policy if exists branches_read on branches;
create policy branches_read on branches
  for select using (
    deleted_at is null
    and (is_super_admin() or client_id = current_client_id())
  );

drop policy if exists branches_write on branches;
create policy branches_write on branches
  for all using (
    is_super_admin()
    or (current_user_role() in ('admin', 'branch_manager') and client_id = current_client_id())
  ) with check (
    is_super_admin()
    or (current_user_role() in ('admin', 'branch_manager') and client_id = current_client_id())
  );

-- =====================================================================
-- LOAN APPLICATIONS
-- =====================================================================
-- Read:
--   - Borrower: only their own applications
--   - Staff: any application within their tenant
--   - Super-admin: all

drop policy if exists apps_read on loan_applications;
create policy apps_read on loan_applications
  for select using (
    deleted_at is null and (
      is_super_admin()
      or (is_staff() and client_id = current_client_id())
      or borrower_id = auth.uid()
    )
  );

-- Insert:
--   - Borrower can create their own application within their own tenant
--   - Staff can create on behalf of a borrower in their tenant

drop policy if exists apps_insert on loan_applications;
create policy apps_insert on loan_applications
  for insert with check (
    client_id = current_client_id()
    and (
      borrower_id = auth.uid()
      or is_staff()
    )
  );

-- Update:
--   - Borrower can update their own DRAFT application only
--   - Staff can update any application in their tenant
--   - Status changes require staff (enforced at app layer too)

drop policy if exists apps_update_borrower_draft on loan_applications;
create policy apps_update_borrower_draft on loan_applications
  for update using (
    borrower_id = auth.uid() and status = 'draft'
  ) with check (
    borrower_id = auth.uid() and status in ('draft', 'submitted')
  );

drop policy if exists apps_update_staff on loan_applications;
create policy apps_update_staff on loan_applications
  for update using (
    is_super_admin()
    or (is_staff() and client_id = current_client_id())
  );

-- =====================================================================
-- APPLICATION STATUS HISTORY (read-only for non-admins)
-- =====================================================================
drop policy if exists status_history_read on application_status_history;
create policy status_history_read on application_status_history
  for select using (
    is_super_admin()
    or exists (
      select 1 from loan_applications a
      where a.id = application_id
        and (
          (is_staff() and a.client_id = current_client_id())
          or a.borrower_id = auth.uid()
        )
    )
  );

-- Inserts only via the status-change trigger (security definer). No INSERT policy.

-- =====================================================================
-- DOCUMENTS
-- =====================================================================
drop policy if exists documents_read on documents;
create policy documents_read on documents
  for select using (
    deleted_at is null and (
      is_super_admin()
      or (is_staff() and client_id = current_client_id())
      or borrower_id = auth.uid()
    )
  );

drop policy if exists documents_insert on documents;
create policy documents_insert on documents
  for insert with check (
    client_id = current_client_id()
    and (borrower_id = auth.uid() or is_staff())
  );

drop policy if exists documents_update_staff on documents;
create policy documents_update_staff on documents
  for update using (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  );

drop policy if exists documents_delete_owner on documents;
create policy documents_delete_owner on documents
  for delete using (
    borrower_id = auth.uid()
    or is_super_admin()
    or (is_staff() and client_id = current_client_id())
  );

-- =====================================================================
-- CONTRACTS
-- =====================================================================
drop policy if exists contracts_read on contracts;
create policy contracts_read on contracts
  for select using (
    is_super_admin()
    or (is_staff() and client_id = current_client_id())
    or exists (
      select 1 from loan_applications a
      where a.id = application_id and a.borrower_id = auth.uid()
    )
  );

drop policy if exists contracts_write on contracts;
create policy contracts_write on contracts
  for all using (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  ) with check (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  );

-- =====================================================================
-- LOANS + REPAYMENT SCHEDULE + PULLS
-- =====================================================================
drop policy if exists loans_read on loans;
create policy loans_read on loans
  for select using (
    is_super_admin()
    or (is_staff() and client_id = current_client_id())
    or borrower_id = auth.uid()
  );

drop policy if exists loans_write on loans;
create policy loans_write on loans
  for all using (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  ) with check (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  );

drop policy if exists schedule_read on repayment_schedule;
create policy schedule_read on repayment_schedule
  for select using (
    is_super_admin()
    or (is_staff() and client_id = current_client_id())
    or exists (
      select 1 from loans l where l.id = loan_id and l.borrower_id = auth.uid()
    )
  );

drop policy if exists schedule_write on repayment_schedule;
create policy schedule_write on repayment_schedule
  for all using (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  ) with check (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  );

drop policy if exists pulls_read on pulls;
create policy pulls_read on pulls
  for select using (
    is_super_admin()
    or (is_staff() and client_id = current_client_id())
    or borrower_id = auth.uid()
  );

drop policy if exists pulls_write on pulls;
create policy pulls_write on pulls
  for all using (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  ) with check (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  );

-- =====================================================================
-- USAGE LOGS — append-only for the app, read-scoped to tenant
-- =====================================================================
drop policy if exists usage_logs_read on usage_logs;
create policy usage_logs_read on usage_logs
  for select using (
    is_super_admin() or (is_staff() and client_id = current_client_id())
  );

-- Inserts come from server-side (service role bypasses RLS). Block
-- direct INSERT from authenticated clients to keep the ledger trusted.
drop policy if exists usage_logs_insert on usage_logs;
create policy usage_logs_insert on usage_logs
  for insert with check (false);

-- No UPDATE / DELETE — usage_logs is append-only.

-- =====================================================================
-- INVOICES
-- =====================================================================
drop policy if exists invoices_read on invoices;
create policy invoices_read on invoices
  for select using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );

drop policy if exists invoices_write on invoices;
create policy invoices_write on invoices
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists line_items_read on invoice_line_items;
create policy line_items_read on invoice_line_items
  for select using (
    is_super_admin()
    or exists (
      select 1 from invoices i
      where i.id = invoice_id
        and current_user_role() = 'admin'
        and i.client_id = current_client_id()
    )
  );

drop policy if exists line_items_write on invoice_line_items;
create policy line_items_write on invoice_line_items
  for all using (is_super_admin()) with check (is_super_admin());

-- =====================================================================
-- AUDIT LOG — already has no-update / no-delete from 007
-- =====================================================================
drop policy if exists audit_log_read on audit_log;
create policy audit_log_read on audit_log
  for select using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );

-- Inserts come exclusively through the write_audit() function (security definer)
-- or trigger-driven; direct INSERT from clients is blocked.
drop policy if exists audit_log_no_insert on audit_log;
create policy audit_log_no_insert on audit_log
  for insert with check (false);

-- =====================================================================
-- Final sanity grants — make sure authenticated role has table-level
-- privileges so RLS can mediate access (without these, RLS won't even
-- run because the role has no underlying privilege).
-- =====================================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables    in schema public to authenticated;
grant usage,  select                  on all sequences in schema public to authenticated;
grant execute                         on all functions in schema public to authenticated;

-- Anonymous (pre-login) needs to be able to read nothing of value.
revoke all on all tables in schema public from anon;
