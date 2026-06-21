-- =====================================================================
-- 014 · Client API keys
-- =====================================================================
-- Each client gets one or more API keys for authenticating calls to
-- /api/usage/log and other tenant-facing endpoints.
-- Keys are stored as SHA-256 hashes. The raw key is shown once on
-- creation and never stored.
-- =====================================================================

create table if not exists client_api_keys (
  id           uuid         primary key default gen_random_uuid(),
  client_id    uuid         not null references clients(id) on delete cascade,
  name         text         not null,                   -- human label, e.g. "Production"
  key_prefix   text         not null,                   -- first 8 chars, shown in UI
  key_hash     text         not null unique,             -- SHA-256 of full key (hex)
  last_used_at timestamptz,
  created_at   timestamptz  not null default now(),
  revoked_at   timestamptz
);

create index if not exists idx_api_keys_client  on client_api_keys (client_id) where revoked_at is null;
create index if not exists idx_api_keys_hash    on client_api_keys (key_hash)  where revoked_at is null;

comment on table client_api_keys is 'Per-client API keys for tenant app authentication. Raw key shown once; only hash stored.';
