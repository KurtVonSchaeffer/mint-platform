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
