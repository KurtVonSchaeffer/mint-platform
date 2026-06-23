-- =====================================================================
-- 017 · Sales quotes — B2B proposals sent to prospective lender clients
-- =====================================================================
-- Separate from quote_requests (B2C MINT marketplace).
-- These are pricing proposals created by Mint staff in the admin console.
-- =====================================================================

do $$ begin
  create type sales_quote_status as enum (
    'draft',
    'sent',
    'viewed',
    'accepted',
    'declined',
    'expired'
  );
exception when duplicate_object then null;
end $$;

create table if not exists sales_quotes (
  id              uuid          primary key default gen_random_uuid(),
  reference       text          not null unique,        -- Q-2026-014 format

  -- Prospect details
  client_name     text          not null,
  contact_name    text          not null,
  contact_email   text          not null,

  -- Pricing
  setup_fee       numeric(12,2) not null default 0,
  monthly_fee     numeric(12,2) not null default 0,
  selected_checks text[]        not null default '{}',  -- CheckId[]
  volume_tier     text          not null default '0-50',
  branches        integer       not null default 1,
  custom_items    jsonb         not null default '[]',  -- CustomItem[]

  -- Workflow
  status          sales_quote_status not null default 'draft',
  sent_at         timestamptz,
  valid_until     date,
  viewed_at       timestamptz,
  accepted_at     timestamptz,

  -- Lifecycle
  created_by      uuid          references profiles(id) on delete set null,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists idx_sales_quotes_status    on sales_quotes (status, created_at desc);
create index if not exists idx_sales_quotes_email     on sales_quotes (contact_email);
create index if not exists idx_sales_quotes_reference on sales_quotes (reference);

drop trigger if exists set_sales_quotes_updated_at on sales_quotes;
create trigger set_sales_quotes_updated_at
  before update on sales_quotes
  for each row execute function tg_set_updated_at();

-- RLS: super_admin only
alter table sales_quotes enable row level security;

drop policy if exists sales_quotes_superadmin on sales_quotes;
create policy sales_quotes_superadmin on sales_quotes
  for all using (is_super_admin());
