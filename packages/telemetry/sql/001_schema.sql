-- =====================================================================
-- mint_telemetry schema — central API usage tracking across all clients
-- =====================================================================
-- This schema lives in a DEDICATED Supabase project (mint_telemetry)
-- that is SEPARATE from every client's own Supabase database.
--
-- Every client's Express server pushes events here using a service-role
-- key. Mint admin reads from here for the /usage dashboard.
-- =====================================================================

-- Clients registry (mirrors mint-admin's client list)
create table if not exists clients (
  slug            text primary key,           -- e.g. "bridgecapital"
  name            text not null,              -- e.g. "BridgeCapital Finance"
  tier            text not null,              -- "core" | "growth" | "enterprise"
  status          text not null default 'active', -- "active" | "trial" | "suspended" | "churned"
  monthly_quota   integer not null default 10000,
  created_at      timestamptz not null default now()
);

-- Raw event log — one row per API call
-- Partition by month for performance once volume grows
create table if not exists events (
  id              bigserial primary key,
  client_slug     text not null references clients(slug),
  endpoint        text not null,              -- e.g. "/api/loans/apply"
  method          text not null,              -- "GET" | "POST" | ...
  status_code     integer not null,           -- HTTP status
  latency_ms      integer not null,
  user_id         text,                       -- Supabase user.id if authenticated
  ip              text,
  user_agent      text,
  occurred_at     timestamptz not null default now()
);

create index if not exists idx_events_client_time on events (client_slug, occurred_at desc);
create index if not exists idx_events_endpoint    on events (endpoint, occurred_at desc);

-- External API calls (Experian, TruID, DocuSeal) — separate so we can bill
-- pass-through costs accurately per client
create table if not exists external_api_calls (
  id              bigserial primary key,
  client_slug     text not null references clients(slug),
  provider        text not null,              -- "experian" | "truid" | "docuseal"
  endpoint        text not null,              -- e.g. "credit_score" | "bank_connect"
  cost_zar_cents  integer not null default 0, -- cost in ZAR cents (e.g. 800 = R8.00)
  reference       text,                       -- provider's transaction reference
  status          text not null,              -- "success" | "failure"
  occurred_at     timestamptz not null default now()
);

create index if not exists idx_ext_client_time on external_api_calls (client_slug, occurred_at desc);
create index if not exists idx_ext_provider    on external_api_calls (provider, occurred_at desc);

-- Daily rollup — aggregated nightly for fast dashboard reads
-- Refresh with: refresh materialized view daily_usage;
create materialized view if not exists daily_usage as
select
  client_slug,
  date_trunc('day', occurred_at)::date           as day,
  endpoint,
  count(*)                                       as calls,
  count(*) filter (where status_code >= 400)     as errors,
  avg(latency_ms)::int                           as avg_latency_ms,
  percentile_cont(0.99) within group (order by latency_ms)::int as p99_latency_ms
from events
group by client_slug, day, endpoint;

create unique index if not exists idx_daily_usage_unique
  on daily_usage (client_slug, day, endpoint);

-- Monthly cost rollup — for invoicing pass-through API costs
create materialized view if not exists monthly_external_costs as
select
  client_slug,
  date_trunc('month', occurred_at)::date         as month,
  provider,
  count(*)                                       as calls,
  sum(cost_zar_cents)                            as total_cost_zar_cents
from external_api_calls
where status = 'success'
group by client_slug, month, provider;

create unique index if not exists idx_monthly_external_unique
  on monthly_external_costs (client_slug, month, provider);

-- Quota usage view — current-month consumption per client
create or replace view current_month_usage as
select
  c.slug                                         as client_slug,
  c.name                                         as client_name,
  c.tier,
  c.monthly_quota,
  coalesce(count(e.id), 0)                       as calls_used,
  case
    when c.monthly_quota > 0
    then round((coalesce(count(e.id), 0)::numeric / c.monthly_quota) * 100, 1)
    else 0
  end                                            as pct_consumed
from clients c
left join events e
  on e.client_slug = c.slug
  and e.occurred_at >= date_trunc('month', now())
group by c.slug, c.name, c.tier, c.monthly_quota;

-- Row-Level Security
-- Only the service-role key (used by ingest middleware + mint admin) can read/write.
alter table clients               enable row level security;
alter table events                enable row level security;
alter table external_api_calls    enable row level security;

-- No public policies — service role bypasses RLS, so no rows are visible
-- to anon clients. This is intentional: telemetry data is admin-only.
