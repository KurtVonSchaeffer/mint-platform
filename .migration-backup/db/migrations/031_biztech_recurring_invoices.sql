-- =====================================================================
-- 031 · BizTech recurring (retainer) invoices
-- =====================================================================
-- A template of line items billed to a client every month on a fixed
-- day. A daily cron checks for templates due "today" and generates a
-- real draft biztech_invoices row from them, same shape as a manually
-- created invoice.
-- =====================================================================

create table if not exists biztech_recurring_invoices (
  id                  uuid          primary key default gen_random_uuid(),
  client_id           uuid          not null references biztech_clients(id) on delete cascade,
  description         text          not null,
  items               jsonb         not null default '[]'::jsonb,  -- [{description, quantity, unit_price_cents}]
  day_of_month        integer       not null check (day_of_month between 1 and 28),
  active              boolean       not null default true,
  last_generated_at   timestamptz,

  created_by          uuid          references auth.users(id) on delete set null,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

create index if not exists idx_biztech_recurring_invoices_client on biztech_recurring_invoices (client_id);
create index if not exists idx_biztech_recurring_invoices_active on biztech_recurring_invoices (active, day_of_month);

drop trigger if exists trg_biztech_recurring_invoices_updated_at on biztech_recurring_invoices;
create trigger trg_biztech_recurring_invoices_updated_at
  before update on biztech_recurring_invoices
  for each row execute function tg_set_updated_at();

alter table biztech_recurring_invoices enable row level security;

drop policy if exists "biztech_recurring_invoices_service_role" on biztech_recurring_invoices;
create policy "biztech_recurring_invoices_service_role" on biztech_recurring_invoices
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
