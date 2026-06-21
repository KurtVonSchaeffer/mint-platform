-- ============================================================
-- 001_clients.sql
-- ============================================================
-- =====================================================================
-- 001 · Clients (tenants)
-- =====================================================================
-- The root table of the multi-tenant model. Every domain row carries a
-- client_id pointing here.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ── Enums ───────────────────────────────────────────────────────────
do $$ begin
  create type client_status as enum ('trial', 'active', 'suspended', 'churned');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type client_tier as enum ('core', 'growth', 'enterprise');
exception when duplicate_object then null;
end $$;

-- ── Clients ─────────────────────────────────────────────────────────
create table if not exists clients (
  id                  uuid          primary key default gen_random_uuid(),
  slug                text          not null unique,         -- e.g. "bridgecapital"
  name                text          not null,                -- e.g. "BridgeCapital Finance"
  legal_name          text,
  domain              text          unique,                  -- custom domain, optional
  subdomain           text          unique,                  -- e.g. "bridgecapital" → bridgecapital.algolend.co.za
  ncr_number          text,                                  -- e.g. "NCRCP22892"
  tier                client_tier   not null default 'core',
  status              client_status not null default 'trial',

  -- Branding (also exposed as Vercel env vars at deploy time)
  primary_color       text          default '#7C3AED',
  secondary_color     text          default '#1A1F36',
  logo_url            text,

  -- Contacts
  support_email       text,
  support_phone       text,
  contact_email       text          not null,
  contact_name        text,

  -- Configuration as JSONB — branding, rates, fees, rules, feature flags.
  -- See `settings_schema.json` in this folder for the canonical shape.
  settings            jsonb         not null default '{}'::jsonb,

  -- Billing
  monthly_fee_cents   integer       not null default 0,
  api_quota           integer       not null default 10000,

  -- Lifecycle
  created_at          timestamptz   not null default now(),
  activated_at        timestamptz,
  suspended_at        timestamptz,
  deleted_at          timestamptz
);

comment on table clients is 'Tenant root. Every domain row references clients.id.';
comment on column clients.settings is 'Per-client configuration JSON: branding, rates, fees, loan rules, feature flags.';

create index if not exists idx_clients_status     on clients (status) where deleted_at is null;
create index if not exists idx_clients_slug       on clients (slug)   where deleted_at is null;
create index if not exists idx_clients_subdomain  on clients (subdomain) where deleted_at is null;

-- ── Feature flags (per-client, normalised for easy querying) ────────
do $$ begin
  create type feature_flag as enum (
    'open_banking',
    'e_contracts',
    'credit_scoring',
    'sacrra_bureau',
    'multi_branch',
    'working_capital',
    'term_loans',
    'invoice_finance',
    'whatsapp_notify',
    'advanced_analytics',
    'sure_systems',
    'biometric_kyc'
  );
exception when duplicate_object then null;
end $$;

create table if not exists client_features (
  client_id   uuid         not null references clients(id) on delete cascade,
  flag        feature_flag not null,
  enabled     boolean      not null default false,
  enabled_at  timestamptz,
  primary key (client_id, flag)
);

comment on table client_features is 'Per-client feature toggles. Bypass alternative: clients.settings JSONB.';

-- ── Auto-update timestamp trigger ───────────────────────────────────
create or replace function tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- (clients has no updated_at — we treat the settings JSONB as the
-- versioned config and rely on audit_log for change history.)


-- ============================================================
-- 002_profiles.sql
-- ============================================================
-- =====================================================================
-- 002 · Profiles (extends Supabase auth.users)
-- =====================================================================
-- Supabase auth.users holds email/password/session. We attach our own
-- profile row to it for role, tenant binding, and personal info.
--
-- Trigger creates a profile automatically when a new auth user is created.
-- =====================================================================

-- ── Roles enum ──────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum (
    'borrower',
    'consultant',
    'branch_manager',
    'admin',           -- client-side admin
    'super_admin'      -- Mint Platforms staff
  );
exception when duplicate_object then null;
end $$;

-- ── Profiles ────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  client_id       uuid        references clients(id) on delete restrict,
                                  -- NULL only for super_admin users
  email           text        not null,
  full_name       text        not null,
  role            user_role   not null default 'borrower',

  -- Personal (for borrowers)
  id_number       text,                  -- SA ID number (encrypted at rest via pgcrypto if needed)
  contact_number  text,
  date_of_birth   date,
  address         jsonb,                 -- { line1, line2, city, postal_code, province }

  -- Staff (for branch_manager, consultant)
  branch_id       uuid,                  -- FK in 003 once branches exist (forward ref OK)
  avatar_url      text,

  -- Lifecycle
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

comment on table  profiles                is 'Domain profile linked 1:1 with auth.users. client_id NULL for super_admin only.';
comment on column profiles.client_id      is 'NULL only when role = super_admin. Otherwise NOT NULL is enforced by check constraint.';
comment on column profiles.role           is 'super_admin = Mint Platforms staff. All others scoped to client_id.';

-- Constraint: only super_admin may have NULL client_id
alter table profiles
  drop constraint if exists profiles_client_required;
alter table profiles
  add  constraint profiles_client_required
  check (role = 'super_admin' or client_id is not null);

create index if not exists idx_profiles_client_id on profiles (client_id) where deleted_at is null;
create index if not exists idx_profiles_role      on profiles (role)      where deleted_at is null;
create index if not exists idx_profiles_email     on profiles (email)     where deleted_at is null;

-- ── updated_at trigger ──────────────────────────────────────────────
drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function tg_set_updated_at();

-- ── Auto-create profile when auth.users row is created ──────────────
-- The signup metadata may carry client_id (sent from the borrower portal
-- as it knows its tenant) and full_name. role defaults to 'borrower'.
create or replace function tg_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, client_id, email, full_name, role, contact_number, id_number)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'borrower'::user_role),
    nullif(new.raw_user_meta_data->>'mobile', ''),
    nullif(new.raw_user_meta_data->>'id_number', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function tg_handle_new_user();

-- ── Helper: current_client_id() ─────────────────────────────────────
-- Returns the client_id of the currently-authenticated user, looking it up
-- from profiles. Used by RLS policies on every domain table.
-- SECURITY DEFINER so it can read profiles even when the caller can't.
create or replace function current_client_id()
returns uuid language sql security definer stable as $$
  select client_id from profiles where id = auth.uid()
$$;

-- ── Helper: current_role() ──────────────────────────────────────────
create or replace function current_user_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- ── Helper: is_super_admin() ────────────────────────────────────────
create or replace function is_super_admin()
returns boolean language sql security definer stable as $$
  select role = 'super_admin' from profiles where id = auth.uid()
$$;

-- ── Helper: is_staff() ─ any staff role for the current tenant ──────
create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select role in ('consultant', 'branch_manager', 'admin', 'super_admin')
  from profiles where id = auth.uid()
$$;


-- ============================================================
-- 003_loan_applications.sql
-- ============================================================
-- =====================================================================
-- 003 · Loan applications + status history + branches
-- =====================================================================

-- ── Branches (multi-branch lenders) ─────────────────────────────────
create table if not exists branches (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references clients(id) on delete cascade,
  name        text        not null,
  address     jsonb,
  manager_id  uuid        references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (client_id, name)
);

create index if not exists idx_branches_client on branches (client_id) where deleted_at is null;

-- ── Application status enum ─────────────────────────────────────────
do $$ begin
  create type application_status as enum (
    'draft',
    'submitted',
    'under_review',
    'awaiting_documents',
    'approved',
    'declined',
    'withdrawn',
    'disbursed',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type loan_product as enum (
    'business_loan',
    'working_capital',
    'term_loan',
    'invoice_finance',
    'salary_advance'
  );
exception when duplicate_object then null;
end $$;

-- ── Loan applications ───────────────────────────────────────────────
create table if not exists loan_applications (
  id                    uuid               primary key default gen_random_uuid(),
  reference             text               not null,                     -- human-readable ID (APP-2026-014)
  client_id             uuid               not null references clients(id) on delete restrict,
  borrower_id           uuid               not null references profiles(id) on delete restrict,
  consultant_id         uuid               references profiles(id) on delete set null,
  branch_id             uuid               references branches(id) on delete set null,

  -- Loan parameters
  product               loan_product       not null default 'business_loan',
  amount                numeric(15, 2)     not null check (amount >= 0),
  term_months           integer            not null check (term_months > 0),
  interest_rate         numeric(5, 2)      not null check (interest_rate >= 0),  -- annual % p.a.
  initiation_fee        numeric(15, 2)     not null default 0,
  monthly_service_fee   numeric(15, 2)     not null default 0,
  purpose               text,

  -- Business details (snapshot at application time)
  business_name         text,
  cipc_number           text,
  industry              text,
  years_in_operation    integer,
  monthly_revenue       numeric(15, 2),
  monthly_expenses      numeric(15, 2),

  -- Workflow state
  status                application_status not null default 'draft',
  status_reason         text,                                            -- e.g. decline reason

  -- Integration data (kept as JSONB for flexibility)
  trueid_data           jsonb,                                           -- TrueID verification + employment + salary
  experian_data         jsonb,                                           -- Credit bureau response
  affordability         jsonb,                                           -- Income / expenses / risk flags
  composite_score       integer            check (composite_score between 0 and 100),

  -- Lifecycle
  submitted_at          timestamptz,
  decision_at           timestamptz,
  disbursed_at          timestamptz,
  created_at            timestamptz        not null default now(),
  updated_at            timestamptz        not null default now(),
  deleted_at            timestamptz,

  unique (client_id, reference)
);

comment on table loan_applications is 'Core lending entity. One row per loan application across its full lifecycle.';

create index if not exists idx_apps_client_status   on loan_applications (client_id, status)      where deleted_at is null;
create index if not exists idx_apps_borrower        on loan_applications (borrower_id)            where deleted_at is null;
create index if not exists idx_apps_consultant      on loan_applications (consultant_id)          where deleted_at is null;
create index if not exists idx_apps_submitted_at    on loan_applications (submitted_at desc)      where deleted_at is null;

drop trigger if exists set_loan_applications_updated_at on loan_applications;
create trigger set_loan_applications_updated_at
  before update on loan_applications
  for each row execute function tg_set_updated_at();

-- ── Status history (every status change recorded) ──────────────────
create table if not exists application_status_history (
  id              uuid               primary key default gen_random_uuid(),
  application_id  uuid               not null references loan_applications(id) on delete cascade,
  from_status     application_status,                                 -- NULL on initial submission
  to_status       application_status not null,
  changed_by      uuid               references profiles(id) on delete set null,
  reason          text,
  changed_at      timestamptz        not null default now()
);

create index if not exists idx_status_history_app on application_status_history (application_id, changed_at desc);

-- Trigger: write history whenever status changes
create or replace function tg_log_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    insert into application_status_history (application_id, from_status, to_status, changed_by, reason)
    values (new.id, old.status, new.status, auth.uid(), new.status_reason);
  elsif tg_op = 'INSERT' then
    insert into application_status_history (application_id, from_status, to_status, changed_by, reason)
    values (new.id, null, new.status, auth.uid(), new.status_reason);
  end if;
  return new;
end $$;

drop trigger if exists log_app_status_changes on loan_applications;
create trigger log_app_status_changes
  after insert or update of status on loan_applications
  for each row execute function tg_log_status_change();

-- ── Foreign key from profiles.branch_id (deferred from 002) ────────
alter table profiles
  drop constraint if exists profiles_branch_id_fkey;
alter table profiles
  add  constraint profiles_branch_id_fkey
  foreign key (branch_id) references branches(id) on delete set null;


-- ============================================================
-- 004_documents_contracts.sql
-- ============================================================
-- =====================================================================
-- 004 · Documents + contracts
-- =====================================================================
-- Documents = anything the borrower or system uploaded (payslip, bank
-- statement, ID copy, etc.) stored in Supabase Storage with metadata here.
--
-- Contracts = loan agreements generated from templates + signed via
-- DocuSeal (or other provider). Append-only audit of signed PDFs.
-- =====================================================================

do $$ begin
  create type document_category as enum (
    'identity',        -- ID / passport / director ID
    'cipc',            -- CIPC registration certificate
    'payslip',
    'bank_statement',
    'financial_statement',
    'tax_clearance',
    'contract',        -- the loan agreement itself
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type document_status as enum ('uploaded', 'pending_review', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists documents (
  id              uuid              primary key default gen_random_uuid(),
  client_id       uuid              not null references clients(id) on delete restrict,
  application_id  uuid              references loan_applications(id) on delete cascade,
  borrower_id     uuid              not null references profiles(id) on delete restrict,

  category        document_category not null default 'other',
  filename        text              not null,
  mime_type       text,
  size_bytes      bigint,
  storage_path    text              not null,                  -- Supabase Storage object path
  storage_bucket  text              not null default 'documents',

  status          document_status   not null default 'uploaded',
  ocr_data        jsonb,                                       -- parsed result, when OCR runs
  verified_by     uuid              references profiles(id) on delete set null,
  verified_at     timestamptz,
  rejection_reason text,

  uploaded_at     timestamptz       not null default now(),
  deleted_at      timestamptz
);

comment on table  documents              is 'File metadata for documents in Supabase Storage. Storage path is canonical.';
comment on column documents.application_id is 'NULL if uploaded outside an application (e.g. KYC docs uploaded once and reused).';

create index if not exists idx_docs_application on documents (application_id) where deleted_at is null;
create index if not exists idx_docs_borrower    on documents (borrower_id)    where deleted_at is null;
create index if not exists idx_docs_client_cat  on documents (client_id, category) where deleted_at is null;

-- ── Contracts ───────────────────────────────────────────────────────
do $$ begin
  create type contract_status as enum ('draft', 'sent', 'signed', 'declined', 'expired', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists contracts (
  id              uuid             primary key default gen_random_uuid(),
  client_id       uuid             not null references clients(id) on delete restrict,
  application_id  uuid             not null references loan_applications(id) on delete restrict,

  -- Provider (DocuSeal, Adobe Sign, internal)
  provider              text          not null default 'docuseal',
  provider_envelope_id  text,                                  -- DocuSeal submission ID
  template_id           text,

  -- Branded content snapshot (at the time of sending)
  content_pdf_url       text,                                  -- generated PDF, pre-signature
  signed_pdf_url        text,                                  -- final signed copy
  certificate_url       text,                                  -- DocuSeal certificate of completion

  status                contract_status not null default 'draft',
  signed_at             timestamptz,
  expires_at            timestamptz,

  created_at            timestamptz     not null default now(),
  updated_at            timestamptz     not null default now()
);

create index if not exists idx_contracts_application on contracts (application_id);
create index if not exists idx_contracts_client_status on contracts (client_id, status);

drop trigger if exists set_contracts_updated_at on contracts;
create trigger set_contracts_updated_at
  before update on contracts
  for each row execute function tg_set_updated_at();


-- ============================================================
-- 005_repayments.sql
-- ============================================================
-- =====================================================================
-- 005 · Loans + repayment schedule + pulls
-- =====================================================================
-- A loan_application becomes a *loan* once disbursed. The repayment
-- schedule is generated up front; individual pull/payment attempts are
-- tracked separately so we can implement the "pulling clients" feature
-- (T-3 reminders, retry on failed debit orders, etc.).
-- =====================================================================

do $$ begin
  create type loan_status as enum ('active', 'arrears', 'closed', 'written_off', 'settled');
exception when duplicate_object then null;
end $$;

-- ── Loans ───────────────────────────────────────────────────────────
create table if not exists loans (
  id                    uuid           primary key default gen_random_uuid(),
  reference             text           not null,                          -- e.g. LN-2026-014
  client_id             uuid           not null references clients(id) on delete restrict,
  application_id        uuid           not null references loan_applications(id) on delete restrict,
  borrower_id           uuid           not null references profiles(id) on delete restrict,

  -- Snapshot of agreed terms (locked at disbursement)
  principal             numeric(15, 2) not null check (principal > 0),
  term_months           integer        not null check (term_months > 0),
  interest_rate         numeric(5, 2)  not null,
  monthly_installment   numeric(15, 2) not null,
  total_repayment       numeric(15, 2) not null,
  initiation_fee        numeric(15, 2) not null default 0,
  monthly_service_fee   numeric(15, 2) not null default 0,

  -- Running totals (updated by triggers on repayments)
  total_paid            numeric(15, 2) not null default 0,
  outstanding_balance   numeric(15, 2) not null,
  arrears_amount        numeric(15, 2) not null default 0,
  days_overdue          integer        not null default 0,

  status                loan_status    not null default 'active',
  disbursed_at          timestamptz    not null default now(),
  first_due_date        date           not null,
  final_due_date        date           not null,
  closed_at             timestamptz,

  created_at            timestamptz    not null default now(),
  updated_at            timestamptz    not null default now(),

  unique (client_id, reference)
);

create index if not exists idx_loans_client_status on loans (client_id, status);
create index if not exists idx_loans_borrower      on loans (borrower_id);
create index if not exists idx_loans_arrears       on loans (client_id, days_overdue) where days_overdue > 0;

drop trigger if exists set_loans_updated_at on loans;
create trigger set_loans_updated_at
  before update on loans
  for each row execute function tg_set_updated_at();

-- ── Repayment schedule (generated when loan is disbursed) ──────────
do $$ begin
  create type schedule_status as enum ('upcoming', 'due', 'paid', 'partially_paid', 'missed', 'rescheduled');
exception when duplicate_object then null;
end $$;

create table if not exists repayment_schedule (
  id              uuid            primary key default gen_random_uuid(),
  client_id       uuid            not null references clients(id) on delete restrict,
  loan_id         uuid            not null references loans(id) on delete cascade,
  instalment_no   integer         not null,                                  -- 1, 2, 3, …
  due_date        date            not null,
  amount_due      numeric(15, 2)  not null check (amount_due >= 0),
  principal_part  numeric(15, 2)  not null default 0,
  interest_part   numeric(15, 2)  not null default 0,
  fees_part       numeric(15, 2)  not null default 0,
  amount_paid     numeric(15, 2)  not null default 0,
  status          schedule_status not null default 'upcoming',
  paid_at         timestamptz,
  unique (loan_id, instalment_no)
);

create index if not exists idx_schedule_client_due on repayment_schedule (client_id, due_date, status);
create index if not exists idx_schedule_loan       on repayment_schedule (loan_id, instalment_no);

-- ── Pulls (debit-order attempts) ────────────────────────────────────
-- Tracks every attempt to collect a payment (whether by debit order,
-- card-on-file, EFT credit push, etc.). One repayment can have multiple
-- pull attempts (e.g. first attempt returns "insufficient funds", retry
-- succeeds).
do $$ begin
  create type pull_status as enum ('scheduled', 'sent', 'cleared', 'returned', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type pull_method as enum ('debit_order', 'eft', 'card', 'cash', 'wallet');
exception when duplicate_object then null;
end $$;

create table if not exists pulls (
  id                  uuid           primary key default gen_random_uuid(),
  client_id           uuid           not null references clients(id) on delete restrict,
  loan_id             uuid           not null references loans(id) on delete restrict,
  schedule_id         uuid           references repayment_schedule(id) on delete set null,
  borrower_id         uuid           not null references profiles(id) on delete restrict,

  amount              numeric(15, 2) not null check (amount > 0),
  method              pull_method    not null default 'debit_order',
  status              pull_status    not null default 'scheduled',

  scheduled_for       date           not null,
  attempted_at        timestamptz,
  cleared_at          timestamptz,
  return_reason       text,                                                  -- e.g. "Insufficient funds"

  external_reference  text,                                                  -- bank/PSP ref

  -- Reminders sent
  reminder_t_minus_3_sent_at  timestamptz,
  reminder_t_zero_sent_at     timestamptz,

  created_at          timestamptz    not null default now(),
  updated_at          timestamptz    not null default now()
);

comment on table pulls is 'Debit-order / payment-pull attempts. Multiple per repayment row when retrying.';

create index if not exists idx_pulls_scheduled    on pulls (client_id, scheduled_for) where status in ('scheduled', 'sent');
create index if not exists idx_pulls_loan         on pulls (loan_id, scheduled_for desc);
create index if not exists idx_pulls_needs_reminder on pulls (scheduled_for)
  where status = 'scheduled' and reminder_t_minus_3_sent_at is null;

drop trigger if exists set_pulls_updated_at on pulls;
create trigger set_pulls_updated_at
  before update on pulls
  for each row execute function tg_set_updated_at();

-- ── Loan running-totals trigger ─────────────────────────────────────
-- When a pull clears, update the loan's totals.
create or replace function tg_update_loan_totals_from_pull()
returns trigger language plpgsql as $$
declare
  v_loan loans%rowtype;
begin
  if new.status = 'cleared' and old.status is distinct from 'cleared' then
    select * into v_loan from loans where id = new.loan_id;
    update loans
      set total_paid          = v_loan.total_paid + new.amount,
          outstanding_balance = greatest(v_loan.outstanding_balance - new.amount, 0),
          status              = case
                                  when v_loan.outstanding_balance - new.amount <= 0 then 'closed'
                                  else v_loan.status
                                end,
          closed_at           = case
                                  when v_loan.outstanding_balance - new.amount <= 0 then now()
                                  else v_loan.closed_at
                                end
      where id = new.loan_id;

    -- Mark the linked schedule row as paid
    if new.schedule_id is not null then
      update repayment_schedule
        set status      = 'paid',
            amount_paid = amount_paid + new.amount,
            paid_at     = now()
        where id = new.schedule_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_pull_clears on pulls;
create trigger trg_pull_clears
  after update of status on pulls
  for each row execute function tg_update_loan_totals_from_pull();


-- ============================================================
-- 006_usage_logs.sql
-- ============================================================
-- =====================================================================
-- 006 · Usage logs (for billing)
-- =====================================================================
-- Every billable event — TruID call, Experian pull, SMS sent, loan
-- registered, etc. — lands here with a cost. The billing engine
-- aggregates this into monthly invoices.
-- =====================================================================

do $$ begin
  create type usage_service as enum (
    'trueid_lookup',
    'experian_score',
    'docuseal_envelope',
    'sacrra_submission',
    'sure_systems_pull',
    'sms_outbound',
    'email_outbound',
    'loan_registered',
    'loan_disbursed',
    'api_call'             -- generic catch-all
  );
exception when duplicate_object then null;
end $$;

create table if not exists usage_logs (
  id              bigserial      primary key,
  client_id       uuid           not null references clients(id) on delete cascade,
  service         usage_service  not null,
  quantity        integer        not null default 1 check (quantity > 0),
  cost_cents      integer        not null default 0,    -- ZAR cents, can be 0 for in-platform events
  metadata        jsonb,                                 -- reference IDs, endpoint, status code

  -- Optional links so we can attribute usage back to specific entities
  application_id  uuid           references loan_applications(id) on delete set null,
  loan_id         uuid           references loans(id) on delete set null,
  user_id         uuid           references profiles(id) on delete set null,

  occurred_at     timestamptz    not null default now()
);

comment on table usage_logs is 'Append-only billing events. Aggregated monthly into invoices.';

create index if not exists idx_usage_client_time    on usage_logs (client_id, occurred_at desc);
create index if not exists idx_usage_client_service on usage_logs (client_id, service, occurred_at desc);

-- ── Monthly rollup (materialized view, refreshed nightly) ───────────
create materialized view if not exists usage_monthly_rollup as
select
  client_id,
  date_trunc('month', occurred_at)::date as month,
  service,
  sum(quantity)        as total_quantity,
  sum(cost_cents)      as total_cost_cents,
  count(*)             as event_count
from usage_logs
group by client_id, month, service;

create unique index if not exists idx_usage_rollup_unique
  on usage_monthly_rollup (client_id, month, service);

-- ── Invoices (generated from rollup) ───────────────────────────────
do $$ begin
  create type invoice_type as enum ('monthly_licence', 'setup', 'usage', 'add_on');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
exception when duplicate_object then null;
end $$;

create table if not exists invoices (
  id                uuid           primary key default gen_random_uuid(),
  reference         text           not null unique,                   -- INV-2026-0001
  client_id         uuid           not null references clients(id) on delete restrict,

  type              invoice_type   not null default 'monthly_licence',
  status            invoice_status not null default 'draft',

  -- Money
  subtotal_cents    integer        not null default 0,
  vat_cents         integer        not null default 0,
  total_cents       integer        not null default 0,

  -- Period covered (for monthly licence + usage invoices)
  period_start      date,
  period_end        date,

  -- Dates
  issued_at         timestamptz,
  due_at            timestamptz,
  paid_at           timestamptz,
  void_at           timestamptz,

  -- Files
  pdf_url           text,

  notes             text,
  metadata          jsonb,

  created_at        timestamptz    not null default now(),
  updated_at        timestamptz    not null default now()
);

create index if not exists idx_invoices_client_status on invoices (client_id, status);
create index if not exists idx_invoices_due           on invoices (due_at) where status in ('sent', 'overdue');

drop trigger if exists set_invoices_updated_at on invoices;
create trigger set_invoices_updated_at
  before update on invoices
  for each row execute function tg_set_updated_at();

-- Line items — what's on each invoice
create table if not exists invoice_line_items (
  id            uuid           primary key default gen_random_uuid(),
  invoice_id    uuid           not null references invoices(id) on delete cascade,
  description   text           not null,
  quantity      integer        not null default 1,
  unit_price_cents integer     not null default 0,
  total_cents   integer        not null default 0,
  service       usage_service                              -- NULL for fixed fees
);

create index if not exists idx_line_items_invoice on invoice_line_items (invoice_id);


-- ============================================================
-- 007_audit_log.sql
-- ============================================================
-- =====================================================================
-- 007 · Audit log (append-only, never UPDATE/DELETE)
-- =====================================================================
-- Required by the brief as non-negotiable for a financial product.
-- Every status change on a domain row + every privileged action
-- writes a row here. RLS blocks UPDATE/DELETE entirely.
-- =====================================================================

do $$ begin
  create type audit_action as enum (
    'create',
    'update',
    'delete',
    'status_change',
    'login',
    'logout',
    'permission_change',
    'data_export',
    'config_change',
    'integration_call'
  );
exception when duplicate_object then null;
end $$;

create table if not exists audit_log (
  id            bigserial    primary key,
  client_id     uuid         references clients(id) on delete restrict,
                              -- NULL only for super_admin platform-level events
  actor_id      uuid         references profiles(id) on delete set null,
  actor_role    user_role,                              -- snapshotted at time of action
  actor_ip      inet,

  action        audit_action not null,
  entity_type   text         not null,                   -- 'loan_applications', 'profiles', 'clients', ...
  entity_id     uuid,                                    -- the row affected
  description   text,                                    -- human-readable summary

  -- Before / after snapshots (JSONB so the schema can evolve without breaking history)
  before_data   jsonb,
  after_data    jsonb,

  occurred_at   timestamptz  not null default now()
);

comment on table audit_log is 'Append-only audit trail. UPDATE and DELETE are blocked by RLS.';

create index if not exists idx_audit_client_time    on audit_log (client_id, occurred_at desc);
create index if not exists idx_audit_entity         on audit_log (entity_type, entity_id, occurred_at desc);
create index if not exists idx_audit_actor          on audit_log (actor_id, occurred_at desc);

-- Block UPDATE and DELETE on audit_log even for owners.
-- The table is enabled for RLS below; these policies make it append-only.
alter table audit_log enable row level security;

drop policy if exists audit_log_no_update on audit_log;
create policy audit_log_no_update on audit_log
  for update using (false) with check (false);

drop policy if exists audit_log_no_delete on audit_log;
create policy audit_log_no_delete on audit_log
  for delete using (false);

-- Inserts and selects are governed by the standard tenant scoping in
-- migration 008 (rls_policies.sql).

-- ── Helper: write_audit() — invoked from app code or triggers ───────
create or replace function write_audit(
  p_client_id     uuid,
  p_action        audit_action,
  p_entity_type   text,
  p_entity_id     uuid,
  p_description   text,
  p_before_data   jsonb default null,
  p_after_data    jsonb default null
) returns void language plpgsql security definer as $$
begin
  insert into audit_log (
    client_id, actor_id, actor_role,
    action, entity_type, entity_id,
    description, before_data, after_data
  ) values (
    p_client_id,
    auth.uid(),
    current_user_role(),
    p_action, p_entity_type, p_entity_id,
    p_description, p_before_data, p_after_data
  );
end $$;

-- ── Auto-audit trigger for loan_applications status changes ─────────
create or replace function tg_audit_application_status()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform write_audit(
      new.client_id,
      'status_change'::audit_action,
      'loan_applications',
      new.id,
      format('Application %s: %s → %s', new.reference, old.status, new.status),
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'reason', new.status_reason)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_application_status on loan_applications;
create trigger trg_audit_application_status
  after update of status on loan_applications
  for each row execute function tg_audit_application_status();

-- ── Auto-audit for client_features changes ─────────────────────────
create or replace function tg_audit_client_features()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and new.enabled is distinct from old.enabled then
    perform write_audit(
      new.client_id,
      'config_change'::audit_action,
      'client_features',
      null,
      format('Feature %s: %s → %s', new.flag, old.enabled, new.enabled),
      jsonb_build_object('flag', new.flag, 'enabled', old.enabled),
      jsonb_build_object('flag', new.flag, 'enabled', new.enabled)
    );
  elsif tg_op = 'INSERT' then
    perform write_audit(
      new.client_id,
      'config_change'::audit_action,
      'client_features',
      null,
      format('Feature %s enabled', new.flag),
      null,
      jsonb_build_object('flag', new.flag, 'enabled', new.enabled)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_client_features on client_features;
create trigger trg_audit_client_features
  after insert or update on client_features
  for each row execute function tg_audit_client_features();


-- ============================================================
-- 008_rls_policies.sql
-- ============================================================
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


-- ============================================================
-- 009_lender_policies.sql
-- ============================================================
-- =====================================================================
-- 009 · Lender policies — credit marketplace participation
-- =====================================================================
-- Each AlgoLend client (lender) that opts into the Mint marketplace
-- configures their credit policy here. The aggregator evaluates every
-- incoming quote request against every active policy in parallel.
-- =====================================================================

create table if not exists lender_policies (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references clients(id) on delete cascade,

  -- Marketplace display
  display_name    text        not null,           -- shown to consumers (may differ from client name)
  logo_url        text,
  tagline         text,                           -- e.g. "Fast approvals for established businesses"
  avg_turnaround_days integer not null default 2,

  -- Eligibility gates
  min_credit_score      integer not null default 550 check (min_credit_score between 0 and 999),
  max_dsr_pct           numeric(5,2) not null default 40,   -- max debt service ratio %
  min_amount            numeric(15,2) not null default 5000,
  max_amount            numeric(15,2) not null default 500000,
  min_years_in_operation integer not null default 1,
  require_id_verified   boolean not null default true,
  max_open_defaults     integer not null default 0,

  -- Pricing
  base_rate_pct         numeric(5,2) not null,    -- annual % p.a. base rate
  initiation_fee_pct    numeric(5,2) not null default 0,  -- % of loan amount
  monthly_service_fee   numeric(10,2) not null default 0,

  -- Score-band rate adjustments — JSONB array of:
  --   [{ "minScore": 700, "rateAdjustment": -2.0 },
  --    { "minScore": 650, "rateAdjustment": -0.5 },
  --    { "minScore": 600, "rateAdjustment":  0.0 },
  --    { "minScore": 550, "rateAdjustment":  3.0 },
  --    { "minScore":   0, "rateAdjustment": null  }]  ← null = decline
  -- Evaluated top-to-bottom; first band where creditScore >= minScore wins.
  rate_bands      jsonb not null default '[]',

  -- Eligible products
  products        loan_product[] not null default '{business_loan}',

  -- Lifecycle
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (client_id)   -- one policy per lender; extend to multi-product later
);

comment on table lender_policies is 'Credit policy config per participating lender. Evaluated by the Mint aggregator for every quote request.';

create index if not exists idx_lender_policies_active on lender_policies (active) where active = true;

drop trigger if exists set_lender_policies_updated_at on lender_policies;
create trigger set_lender_policies_updated_at
  before update on lender_policies
  for each row execute function tg_set_updated_at();

-- RLS: only super_admin and the client's own admin can read/write
alter table lender_policies enable row level security;

drop policy if exists lender_policies_read on lender_policies;
create policy lender_policies_read on lender_policies
  for select using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );

drop policy if exists lender_policies_write on lender_policies;
create policy lender_policies_write on lender_policies
  for all using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  ) with check (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );


-- ============================================================
-- 010_quote_requests.sql
-- ============================================================
-- =====================================================================
-- 010 · Quote requests + offers — Mint aggregator
-- =====================================================================
-- quote_requests: one row per consumer who submits through the Mint app.
-- quote_offers:   one row per lender per request (offered or declined).
-- =====================================================================

-- ── Status enums ────────────────────────────────────────────────────
do $$ begin
  create type quote_status as enum (
    'pending',    -- credit checks running
    'complete',   -- all lenders evaluated
    'error',      -- credit pull failed
    'expired'     -- >24 h old
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type offer_status as enum (
    'offered',    -- lender will lend
    'declined',   -- lender cannot offer
    'error',      -- evaluation threw
    'accepted'    -- consumer accepted this offer
  );
exception when duplicate_object then null;
end $$;

-- ── Quote requests ───────────────────────────────────────────────────
create table if not exists quote_requests (
  id                  uuid        primary key default gen_random_uuid(),
  reference           text        not null unique,   -- QR-YYYYMMDD-XXXX

  -- Consumer details (snapshot)
  consumer_email      text        not null,
  consumer_name       text        not null,
  consumer_id_number  text,
  consumer_mobile     text,
  business_name       text,
  years_in_operation  integer,

  -- What they want
  requested_amount    numeric(15,2) not null,
  requested_term      integer       not null,   -- months
  purpose             text,

  -- Credit data (stored server-side, never sent to client in full)
  credit_profile      jsonb,                    -- Experian + SureSystems normalised result
  credit_pulled_at    timestamptz,

  -- Workflow
  status              quote_status not null default 'pending',
  error_message       text,
  lenders_evaluated   integer not null default 0,
  offers_count        integer not null default 0,

  -- Lifecycle
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  expires_at          timestamptz not null default now() + interval '24 hours'
);

comment on table quote_requests is 'One credit check per consumer. Fan-out to all active lender_policies. Expires after 24 h.';

create index if not exists idx_quote_requests_status    on quote_requests (status, created_at desc);
create index if not exists idx_quote_requests_email     on quote_requests (consumer_email);
create index if not exists idx_quote_requests_reference on quote_requests (reference);

drop trigger if exists set_quote_requests_updated_at on quote_requests;
create trigger set_quote_requests_updated_at
  before update on quote_requests
  for each row execute function tg_set_updated_at();

-- ── Quote offers ─────────────────────────────────────────────────────
create table if not exists quote_offers (
  id                  uuid        primary key default gen_random_uuid(),
  request_id          uuid        not null references quote_requests(id) on delete cascade,
  client_id           uuid        not null references clients(id) on delete cascade,

  -- Decision
  status              offer_status not null default 'declined',
  decision_reason     text,          -- human-readable decline reason or null for offers

  -- Offer terms (null when declined)
  offered_amount      numeric(15,2),
  offered_rate_pct    numeric(5,2),
  offered_term_months integer,
  monthly_installment numeric(15,2),
  total_repayment     numeric(15,2),
  initiation_fee      numeric(15,2),

  -- Consumer action
  accepted_at         timestamptz,
  application_id      uuid references loan_applications(id) on delete set null,

  -- Lifecycle
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (request_id, client_id)
);

comment on table quote_offers is 'One row per lender per quote request. Populated by the aggregator fan-out.';

create index if not exists idx_quote_offers_request on quote_offers (request_id);
create index if not exists idx_quote_offers_status  on quote_offers (status, request_id);

drop trigger if exists set_quote_offers_updated_at on quote_offers;
create trigger set_quote_offers_updated_at
  before update on quote_offers
  for each row execute function tg_set_updated_at();

-- RLS: quote data is sensitive — service role only (Mint app uses service key)
alter table quote_requests enable row level security;
alter table quote_offers    enable row level security;

-- Block all direct authenticated access — Mint API routes use service role
drop policy if exists quote_requests_deny on quote_requests;
create policy quote_requests_deny on quote_requests for all using (false);

drop policy if exists quote_offers_deny on quote_offers;
create policy quote_offers_deny on quote_offers for all using (false);

-- Super-admin read-only (for debugging in mint-admin)
drop policy if exists quote_requests_superadmin on quote_requests;
create policy quote_requests_superadmin on quote_requests
  for select using (is_super_admin());

drop policy if exists quote_offers_superadmin on quote_offers;
create policy quote_offers_superadmin on quote_offers
  for select using (is_super_admin());


-- ============================================================
-- 011_telemetry_and_vercel_linking.sql
-- ============================================================
-- =====================================================================
-- 011 · Telemetry, per-client Vercel linking, migration tracking
-- =====================================================================
-- Three additions:
--   1. clients.vercel_project_id / supabase_project_ref — the bridge
--      between a mint-admin client record and its live deployment.
--   2. mint_telemetry.api_events — central append-only log that every
--      client deployment writes to (service-role key sent once at
--      provisioning time, stored as env var MINT_TELEMETRY_KEY).
--   3. clients.migration_status / loanbook_import_log — tracks the
--      one-time loanbook import from ZwaneOfficial.
-- =====================================================================

-- ── 1. Vercel + Supabase link columns on clients ─────────────────────

alter table clients
  add column if not exists vercel_project_id   text unique,
  add column if not exists vercel_team_id      text,
  -- Project ref is the subdomain part of the Supabase URL:
  -- https://<ref>.supabase.co
  add column if not exists supabase_project_ref text,
  -- Migration tracking
  add column if not exists migration_status    text    not null default 'pending'
    check (migration_status in ('pending','in_progress','completed','failed')),
  add column if not exists migration_started_at  timestamptz,
  add column if not exists migration_completed_at timestamptz,
  add column if not exists migrated_loan_count   integer,
  add column if not exists migration_error       text;

comment on column clients.vercel_project_id    is 'Vercel project ID (prj_xxxx). Allows mint-admin to fetch metrics and env vars via the Vercel API.';
comment on column clients.supabase_project_ref is 'Supabase project ref (xxxx in xxxx.supabase.co). Stored for display; actual credentials are fetched from Vercel env vars at runtime.';
comment on column clients.migration_status     is 'State of the one-time loanbook import from ZwaneOfficial.';

create index if not exists idx_clients_vercel_project on clients (vercel_project_id) where vercel_project_id is not null;

-- ── 2. Central telemetry schema ───────────────────────────────────────

create schema if not exists mint_telemetry;

-- Every API call from every client deployment lands here.
-- Clients write via their own MINT_TELEMETRY_KEY (scoped service role
-- that only has INSERT on this table).
create table if not exists mint_telemetry.api_events (
  id             bigint       generated always as identity primary key,
  client_id      uuid         not null references clients(id) on delete cascade,
  ts             timestamptz  not null default now(),
  method         text         not null,        -- GET | POST | PATCH | …
  path           text         not null,        -- /api/loans/apply
  status         smallint     not null,        -- HTTP status code
  duration_ms    integer,                      -- server-side duration
  deployment_id  text,                         -- VERCEL_DEPLOYMENT_ID env var
  region         text,                         -- VERCEL_REGION env var
  error_msg      text                          -- first 500 chars of error if status ≥ 400
);

-- Partition-friendly indexes (query by client + time range most often)
create index if not exists idx_api_events_client_ts on mint_telemetry.api_events (client_id, ts desc);
create index if not exists idx_api_events_ts        on mint_telemetry.api_events (ts desc);
create index if not exists idx_api_events_path      on mint_telemetry.api_events (path, ts desc);
create index if not exists idx_api_events_status    on mint_telemetry.api_events (status, ts desc);

comment on table  mint_telemetry.api_events is 'Append-only API call log from all client deployments. One row per HTTP response.';
comment on column mint_telemetry.api_events.client_id    is 'Resolves to clients.id — set from MINT_CLIENT_ID env var in each deployment.';
comment on column mint_telemetry.api_events.deployment_id is 'VERCEL_DEPLOYMENT_ID — links to a specific Vercel build.';

-- Convenience view: monthly summary per client
create or replace view mint_telemetry.monthly_summary as
select
  client_id,
  date_trunc('month', ts)                                     as month,
  count(*)                                                    as total_calls,
  count(*) filter (where status >= 400)                       as error_calls,
  round(avg(duration_ms))::int                                as avg_ms,
  round(percentile_cont(0.99) within group (order by duration_ms))::int as p99_ms,
  count(distinct deployment_id)                               as deployments_used
from mint_telemetry.api_events
group by client_id, date_trunc('month', ts);

-- ── 3. Loanbook import log ────────────────────────────────────────────

-- Records each batch of rows imported during the one-time migration.
-- Allows retry on failure and gives an audit trail.
create table if not exists mint_telemetry.loanbook_import_log (
  id              uuid         primary key default gen_random_uuid(),
  client_id       uuid         not null references clients(id) on delete cascade,
  imported_at     timestamptz  not null default now(),
  imported_by     uuid,                        -- admin user who triggered it
  source_file     text,                        -- original CSV filename
  row_count       integer      not null,
  success_count   integer      not null default 0,
  error_count     integer      not null default 0,
  errors          jsonb,                       -- [{row, message}, …]
  status          text         not null default 'pending'
    check (status in ('pending','running','done','failed')),
  completed_at    timestamptz
);

create index if not exists idx_import_log_client on mint_telemetry.loanbook_import_log (client_id, imported_at desc);

-- ── 4. RLS: only service role can insert telemetry ───────────────────

alter table mint_telemetry.api_events enable row level security;
drop policy if exists "service_role_all" on mint_telemetry.api_events;
create policy "service_role_all" on mint_telemetry.api_events
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table mint_telemetry.loanbook_import_log enable row level security;
drop policy if exists "service_role_all" on mint_telemetry.loanbook_import_log;
create policy "service_role_all" on mint_telemetry.loanbook_import_log
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


