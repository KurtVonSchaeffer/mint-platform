-- =====================================================================
-- 001 · Clients (tenants)
-- =====================================================================
-- The root table of the multi-tenant model. Every domain row carries a
-- client_id pointing here.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ── Enums ───────────────────────────────────────────────────────────
do $$ begin
  create type client_status as enum ('trial', 'active', 'suspended', 'churned');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type client_tier as enum ('core', 'growth', 'enterprise');
exception when duplicate_object then null;
end $$;

-- ── Clients ─────────────────────────────────────────────────────────
create table if not exists clients (
  id                  uuid          primary key default gen_random_uuid(),
  slug                text          not null unique,         -- e.g. "bridgecapital"
  name                text          not null,                -- e.g. "BridgeCapital Finance"
  legal_name          text,
  domain              text          unique,                  -- custom domain, optional
  subdomain           text          unique,                  -- e.g. "bridgecapital" → bridgecapital.algolend.co.za
  ncr_number          text,                                  -- e.g. "NCRCP22892"
  tier                client_tier   not null default 'core',
  status              client_status not null default 'trial',

  -- Branding (also exposed as Vercel env vars at deploy time)
  primary_color       text          default '#7C3AED',
  secondary_color     text          default '#1A1F36',
  logo_url            text,

  -- Contacts
  support_email       text,
  support_phone       text,
  contact_email       text          not null,
  contact_name        text,

  -- Configuration as JSONB — branding, rates, fees, rules, feature flags.
  -- See `settings_schema.json` in this folder for the canonical shape.
  settings            jsonb         not null default '{}'::jsonb,

  -- Billing
  monthly_fee_cents   integer       not null default 0,
  api_quota           integer       not null default 10000,

  -- Lifecycle
  created_at          timestamptz   not null default now(),
  activated_at        timestamptz,
  suspended_at        timestamptz,
  deleted_at          timestamptz
);

comment on table clients is 'Tenant root. Every domain row references clients.id.';
comment on column clients.settings is 'Per-client configuration JSON: branding, rates, fees, loan rules, feature flags.';

create index if not exists idx_clients_status     on clients (status) where deleted_at is null;
create index if not exists idx_clients_slug       on clients (slug)   where deleted_at is null;
create index if not exists idx_clients_subdomain  on clients (subdomain) where deleted_at is null;

-- ── Feature flags (per-client, normalised for easy querying) ────────
do $$ begin
  create type feature_flag as enum (
    'open_banking',
    'e_contracts',
    'credit_scoring',
    'sacrra_bureau',
    'multi_branch',
    'working_capital',
    'term_loans',
    'invoice_finance',
    'whatsapp_notify',
    'advanced_analytics',
    'sure_systems',
    'biometric_kyc'
  );
exception when duplicate_object then null;
end $$;

create table if not exists client_features (
  client_id   uuid         not null references clients(id) on delete cascade,
  flag        feature_flag not null,
  enabled     boolean      not null default false,
  enabled_at  timestamptz,
  primary key (client_id, flag)
);

comment on table client_features is 'Per-client feature toggles. Bypass alternative: clients.settings JSONB.';

-- ── Auto-update timestamp trigger ───────────────────────────────────
create or replace function tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- (clients has no updated_at — we treat the settings JSONB as the
-- versioned config and rely on audit_log for change history.)
