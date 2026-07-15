-- =====================================================================
-- 029 · BizTech services catalog
-- =====================================================================
-- A rate card of billable services BizTech sells. Quote/invoice line
-- items can be built from these instead of freeform typing, keeping
-- pricing consistent and giving Reports something to break revenue
-- down by later.
-- =====================================================================

create table if not exists biztech_services (
  id                uuid          primary key default gen_random_uuid(),
  name              text          not null,
  description       text,
  unit_price_cents  integer       not null default 0,
  unit              text          not null default 'once-off',  -- e.g. 'hour', 'month', 'once-off'
  active            boolean       not null default true,

  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists idx_biztech_services_active on biztech_services (active);

drop trigger if exists trg_biztech_services_updated_at on biztech_services;
create trigger trg_biztech_services_updated_at
  before update on biztech_services
  for each row execute function tg_set_updated_at();

alter table biztech_services enable row level security;

drop policy if exists "biztech_services_service_role" on biztech_services;
create policy "biztech_services_service_role" on biztech_services
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
