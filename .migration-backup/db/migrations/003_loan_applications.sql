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
