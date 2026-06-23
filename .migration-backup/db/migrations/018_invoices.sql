-- =====================================================================
-- 018 · Sales invoices + extended quote statuses
-- =====================================================================
-- NOTE: uses `sales_invoices` to avoid collision with the existing
-- `invoices` table (which is linked to `clients` for monthly billing).
-- =====================================================================

-- Extend quote statuses with pre-close stages
alter type sales_quote_status add value if not exists 'negotiating'   after 'viewed';
alter type sales_quote_status add value if not exists 'contract_sent' after 'negotiating';

-- Sales invoice status / type enums
do $$ begin
  create type sales_invoice_status as enum ('unpaid', 'paid', 'overdue', 'waived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type sales_invoice_type as enum ('setup', 'monthly');
exception when duplicate_object then null;
end $$;

create table if not exists sales_invoices (
  id           uuid                  primary key default gen_random_uuid(),
  reference    text                  not null unique,         -- INV-2026-001
  quote_id     uuid                  not null references sales_quotes(id) on delete cascade,

  -- What is being billed
  type         sales_invoice_type    not null,                -- setup | monthly
  amount       numeric(12,2)         not null,
  period_start date,                                          -- for monthly: billing period
  period_end   date,

  -- Payment
  due_date     date                  not null,
  status       sales_invoice_status  not null default 'unpaid',
  paid_at      timestamptz,
  payment_ref  text,                                          -- EFT ref, proof upload path
  notes        text,

  created_at   timestamptz           not null default now(),
  updated_at   timestamptz           not null default now()
);

create index if not exists idx_sales_invoices_quote_id  on sales_invoices (quote_id, created_at desc);
create index if not exists idx_sales_invoices_status    on sales_invoices (status, due_date);
create index if not exists idx_sales_invoices_reference on sales_invoices (reference);

drop trigger if exists set_sales_invoices_updated_at on sales_invoices;
create trigger set_sales_invoices_updated_at
  before update on sales_invoices
  for each row execute function tg_set_updated_at();

-- RLS: super_admin only
alter table sales_invoices enable row level security;

drop policy if exists sales_invoices_superadmin on sales_invoices;
create policy sales_invoices_superadmin on sales_invoices
  for all using (is_super_admin());
