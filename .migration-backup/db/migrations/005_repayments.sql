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
