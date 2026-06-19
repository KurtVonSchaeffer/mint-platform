-- =====================================================================
-- 012 · Leads — marketing enquiries from algolend.co.za
-- =====================================================================

do $$ begin
  create type lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lead_source as enum ('marketing-site', 'referral', 'manual');
exception when duplicate_object then null;
end $$;

create table if not exists leads (
  id          uuid          primary key default gen_random_uuid(),
  name        text          not null,
  email       text          not null,
  company     text          not null,
  message     text,
  source      lead_source   not null default 'manual',
  status      lead_status   not null default 'new',
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index if not exists idx_leads_status     on leads (status);
create index if not exists idx_leads_created_at on leads (created_at desc);

drop trigger if exists set_leads_updated_at on leads;
create trigger set_leads_updated_at
  before update on leads
  for each row execute function tg_set_updated_at();

-- RLS: only service role and admins can read/write leads
alter table leads enable row level security;

create policy "leads_service_role" on leads
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
