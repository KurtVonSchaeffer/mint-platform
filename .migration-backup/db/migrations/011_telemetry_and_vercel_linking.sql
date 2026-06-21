-- =====================================================================
-- 011 · Telemetry, per-client Vercel linking, migration tracking
-- =====================================================================
-- Three additions:
--   1. clients.vercel_project_id / supabase_project_ref — the bridge
--      between a mint-admin client record and its live deployment.
--   2. mint_telemetry.api_events — central append-only log that every
--      client deployment writes to (service-role key sent once at
--      provisioning time, stored as env var MINT_TELEMETRY_KEY).
--   3. clients.migration_status / loanbook_import_log — tracks the
--      one-time loanbook import from ZwaneOfficial.
-- =====================================================================

-- ── 1. Vercel + Supabase link columns on clients ─────────────────────

alter table clients
  add column if not exists vercel_project_id   text unique,
  add column if not exists vercel_team_id      text,
  -- Project ref is the subdomain part of the Supabase URL:
  -- https://<ref>.supabase.co
  add column if not exists supabase_project_ref text,
  -- Migration tracking
  add column if not exists migration_status    text    not null default 'pending'
    check (migration_status in ('pending','in_progress','completed','failed')),
  add column if not exists migration_started_at  timestamptz,
  add column if not exists migration_completed_at timestamptz,
  add column if not exists migrated_loan_count   integer,
  add column if not exists migration_error       text;

comment on column clients.vercel_project_id    is 'Vercel project ID (prj_xxxx). Allows mint-admin to fetch metrics and env vars via the Vercel API.';
comment on column clients.supabase_project_ref is 'Supabase project ref (xxxx in xxxx.supabase.co). Stored for display; actual credentials are fetched from Vercel env vars at runtime.';
comment on column clients.migration_status     is 'State of the one-time loanbook import from ZwaneOfficial.';

create index if not exists idx_clients_vercel_project on clients (vercel_project_id) where vercel_project_id is not null;

-- ── 2. Central telemetry schema ───────────────────────────────────────

create schema if not exists mint_telemetry;

-- Every API call from every client deployment lands here.
-- Clients write via their own MINT_TELEMETRY_KEY (scoped service role
-- that only has INSERT on this table).
create table if not exists mint_telemetry.api_events (
  id             bigint       generated always as identity primary key,
  client_id      uuid         not null references clients(id) on delete cascade,
  ts             timestamptz  not null default now(),
  method         text         not null,        -- GET | POST | PATCH | …
  path           text         not null,        -- /api/loans/apply
  status         smallint     not null,        -- HTTP status code
  duration_ms    integer,                      -- server-side duration
  deployment_id  text,                         -- VERCEL_DEPLOYMENT_ID env var
  region         text,                         -- VERCEL_REGION env var
  error_msg      text                          -- first 500 chars of error if status ≥ 400
);

-- Partition-friendly indexes (query by client + time range most often)
create index if not exists idx_api_events_client_ts on mint_telemetry.api_events (client_id, ts desc);
create index if not exists idx_api_events_ts        on mint_telemetry.api_events (ts desc);
create index if not exists idx_api_events_path      on mint_telemetry.api_events (path, ts desc);
create index if not exists idx_api_events_status    on mint_telemetry.api_events (status, ts desc);

comment on table  mint_telemetry.api_events is 'Append-only API call log from all client deployments. One row per HTTP response.';
comment on column mint_telemetry.api_events.client_id    is 'Resolves to clients.id — set from MINT_CLIENT_ID env var in each deployment.';
comment on column mint_telemetry.api_events.deployment_id is 'VERCEL_DEPLOYMENT_ID — links to a specific Vercel build.';

-- Convenience view: monthly summary per client
create or replace view mint_telemetry.monthly_summary as
select
  client_id,
  date_trunc('month', ts)                                     as month,
  count(*)                                                    as total_calls,
  count(*) filter (where status >= 400)                       as error_calls,
  round(avg(duration_ms))::int                                as avg_ms,
  round(percentile_cont(0.99) within group (order by duration_ms))::int as p99_ms,
  count(distinct deployment_id)                               as deployments_used
from mint_telemetry.api_events
group by client_id, date_trunc('month', ts);

-- ── 3. Loanbook import log ────────────────────────────────────────────

-- Records each batch of rows imported during the one-time migration.
-- Allows retry on failure and gives an audit trail.
create table if not exists mint_telemetry.loanbook_import_log (
  id              uuid         primary key default gen_random_uuid(),
  client_id       uuid         not null references clients(id) on delete cascade,
  imported_at     timestamptz  not null default now(),
  imported_by     uuid,                        -- admin user who triggered it
  source_file     text,                        -- original CSV filename
  row_count       integer      not null,
  success_count   integer      not null default 0,
  error_count     integer      not null default 0,
  errors          jsonb,                       -- [{row, message}, …]
  status          text         not null default 'pending'
    check (status in ('pending','running','done','failed')),
  completed_at    timestamptz
);

create index if not exists idx_import_log_client on mint_telemetry.loanbook_import_log (client_id, imported_at desc);

-- ── 4. RLS: only service role can insert telemetry ───────────────────

alter table mint_telemetry.api_events enable row level security;
drop policy if exists "service_role_all" on mint_telemetry.api_events;
create policy "service_role_all" on mint_telemetry.api_events
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table mint_telemetry.loanbook_import_log enable row level security;
drop policy if exists "service_role_all" on mint_telemetry.loanbook_import_log;
create policy "service_role_all" on mint_telemetry.loanbook_import_log
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
