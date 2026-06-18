-- =====================================================================
-- 015 · Leads + Onboarding columns (idempotent — safe to re-run)
-- =====================================================================

-- Enum types (skip if already exist)
do $$ begin
  create type lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lead_source as enum ('marketing-site', 'referral', 'manual');
exception when duplicate_object then null;
end $$;

-- Leads table
create table if not exists leads (
  id                 uuid         primary key default gen_random_uuid(),
  name               text         not null,
  email              text         not null,
  company            text         not null,
  message            text,
  source             lead_source  not null default 'manual',
  status             lead_status  not null default 'new',
  onboarding_token   uuid         default gen_random_uuid(),
  onboarding_status  text         default 'pending',
  onboarding_data    jsonb,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now()
);

-- Add any columns that might be missing if the table pre-existed
alter table leads add column if not exists source            lead_source  not null default 'manual';
alter table leads add column if not exists status            lead_status  not null default 'new';
alter table leads add column if not exists updated_at        timestamptz  not null default now();
alter table leads add column if not exists onboarding_token  uuid         default gen_random_uuid();
alter table leads add column if not exists onboarding_status text         default 'pending';
alter table leads add column if not exists onboarding_data   jsonb;

-- Link documents to a lead (only if documents table exists)
do $$ begin
  alter table documents add column if not exists lead_id uuid references leads(id);
exception when undefined_table then null;
end $$;

-- Indexes
create index if not exists idx_leads_status     on leads (status);
create index if not exists idx_leads_created_at on leads (created_at desc);
create index if not exists idx_leads_email      on leads (email);

-- Updated-at trigger
drop trigger if exists set_leads_updated_at on leads;
create trigger set_leads_updated_at before update on leads for each row execute function tg_set_updated_at();

-- RLS: only service role can read/write leads
alter table leads enable row level security;
drop policy if exists "leads_service_role" on leads;
create policy "leads_service_role" on leads using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');
