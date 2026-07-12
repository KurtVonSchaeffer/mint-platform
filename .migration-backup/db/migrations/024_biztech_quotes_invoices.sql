-- =====================================================================
-- 024 · MINT BizTech quotes + invoices (Phase 3)
-- =====================================================================
-- Quoting/invoicing for BizTech's own consulting clients (biztech_clients),
-- separate from AlgoLend's sales_quotes/invoices (017/018) which bill
-- lender tenants for the AlgoLend SaaS product itself.
--
-- An invoice can optionally originate from an accepted quote
-- (quote_id), or be created standalone. Service-role RLS, same as the
-- rest of the BizTech tables — no tenant scoping needed.
-- =====================================================================

do $$ begin
  create type biztech_quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type biztech_invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
exception when duplicate_object then null;
end $$;

-- ── Quotes ──────────────────────────────────────────────────────────
create table if not exists biztech_quotes (
  id            uuid                  primary key default gen_random_uuid(),
  reference     text                  not null unique,        -- BQ-2026-0001
  client_id     uuid                  not null references biztech_clients(id) on delete restrict,

  status        biztech_quote_status  not null default 'draft',
  valid_until   date,
  notes         text,

  subtotal_cents integer              not null default 0,
  vat_cents      integer              not null default 0,
  total_cents    integer              not null default 0,

  sent_at       timestamptz,
  accepted_at   timestamptz,
  declined_at   timestamptz,

  created_by    uuid                  references auth.users(id) on delete set null,
  created_at    timestamptz           not null default now(),
  updated_at    timestamptz           not null default now()
);

create index if not exists idx_biztech_quotes_client  on biztech_quotes (client_id);
create index if not exists idx_biztech_quotes_status  on biztech_quotes (status, created_at desc);

drop trigger if exists trg_biztech_quotes_updated_at on biztech_quotes;
create trigger trg_biztech_quotes_updated_at
  before update on biztech_quotes
  for each row execute function tg_set_updated_at();

create table if not exists biztech_quote_items (
  id                uuid           primary key default gen_random_uuid(),
  quote_id          uuid           not null references biztech_quotes(id) on delete cascade,
  description       text           not null,
  quantity          integer        not null default 1,
  unit_price_cents  integer        not null default 0,
  total_cents       integer        not null default 0,
  sort_order        integer        not null default 0
);

create index if not exists idx_biztech_quote_items_quote on biztech_quote_items (quote_id, sort_order);

-- ── Invoices ────────────────────────────────────────────────────────
create table if not exists biztech_invoices (
  id            uuid                    primary key default gen_random_uuid(),
  reference     text                    not null unique,      -- BI-2026-0001
  client_id     uuid                    not null references biztech_clients(id) on delete restrict,
  quote_id      uuid                    references biztech_quotes(id) on delete set null,

  status        biztech_invoice_status  not null default 'draft',
  notes         text,

  subtotal_cents integer                not null default 0,
  vat_cents      integer                not null default 0,
  total_cents    integer                not null default 0,

  issued_at     timestamptz,
  due_at        timestamptz,
  paid_at       timestamptz,
  void_at       timestamptz,

  created_by    uuid                    references auth.users(id) on delete set null,
  created_at    timestamptz             not null default now(),
  updated_at    timestamptz             not null default now()
);

create index if not exists idx_biztech_invoices_client on biztech_invoices (client_id);
create index if not exists idx_biztech_invoices_status on biztech_invoices (status, created_at desc);
create index if not exists idx_biztech_invoices_due    on biztech_invoices (due_at) where status in ('sent', 'overdue');

drop trigger if exists trg_biztech_invoices_updated_at on biztech_invoices;
create trigger trg_biztech_invoices_updated_at
  before update on biztech_invoices
  for each row execute function tg_set_updated_at();

create table if not exists biztech_invoice_items (
  id                uuid           primary key default gen_random_uuid(),
  invoice_id        uuid           not null references biztech_invoices(id) on delete cascade,
  description       text           not null,
  quantity          integer        not null default 1,
  unit_price_cents  integer        not null default 0,
  total_cents       integer        not null default 0,
  sort_order        integer        not null default 0
);

create index if not exists idx_biztech_invoice_items_invoice on biztech_invoice_items (invoice_id, sort_order);

-- ── RLS: service-role only ──────────────────────────────────────────
alter table biztech_quotes       enable row level security;
alter table biztech_quote_items  enable row level security;
alter table biztech_invoices     enable row level security;
alter table biztech_invoice_items enable row level security;

drop policy if exists "biztech_quotes_service_role" on biztech_quotes;
create policy "biztech_quotes_service_role" on biztech_quotes
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_quote_items_service_role" on biztech_quote_items;
create policy "biztech_quote_items_service_role" on biztech_quote_items
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_invoices_service_role" on biztech_invoices;
create policy "biztech_invoices_service_role" on biztech_invoices
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_invoice_items_service_role" on biztech_invoice_items;
create policy "biztech_invoice_items_service_role" on biztech_invoice_items
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
