-- =====================================================================
-- 009 · Lender policies — credit marketplace participation
-- =====================================================================
-- Each AlgoLend client (lender) that opts into the Mint marketplace
-- configures their credit policy here. The aggregator evaluates every
-- incoming quote request against every active policy in parallel.
-- =====================================================================

create table if not exists lender_policies (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references clients(id) on delete cascade,

  -- Marketplace display
  display_name    text        not null,           -- shown to consumers (may differ from client name)
  logo_url        text,
  tagline         text,                           -- e.g. "Fast approvals for established businesses"
  avg_turnaround_days integer not null default 2,

  -- Eligibility gates
  min_credit_score      integer not null default 550 check (min_credit_score between 0 and 999),
  max_dsr_pct           numeric(5,2) not null default 40,   -- max debt service ratio %
  min_amount            numeric(15,2) not null default 5000,
  max_amount            numeric(15,2) not null default 500000,
  min_years_in_operation integer not null default 1,
  require_id_verified   boolean not null default true,
  max_open_defaults     integer not null default 0,

  -- Pricing
  base_rate_pct         numeric(5,2) not null,    -- annual % p.a. base rate
  initiation_fee_pct    numeric(5,2) not null default 0,  -- % of loan amount
  monthly_service_fee   numeric(10,2) not null default 0,

  -- Score-band rate adjustments — JSONB array of:
  --   [{ "minScore": 700, "rateAdjustment": -2.0 },
  --    { "minScore": 650, "rateAdjustment": -0.5 },
  --    { "minScore": 600, "rateAdjustment":  0.0 },
  --    { "minScore": 550, "rateAdjustment":  3.0 },
  --    { "minScore":   0, "rateAdjustment": null  }]  ← null = decline
  -- Evaluated top-to-bottom; first band where creditScore >= minScore wins.
  rate_bands      jsonb not null default '[]',

  -- Eligible products
  products        loan_product[] not null default '{business_loan}',

  -- Lifecycle
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (client_id)   -- one policy per lender; extend to multi-product later
);

comment on table lender_policies is 'Credit policy config per participating lender. Evaluated by the Mint aggregator for every quote request.';

create index if not exists idx_lender_policies_active on lender_policies (active) where active = true;

drop trigger if exists set_lender_policies_updated_at on lender_policies;
create trigger set_lender_policies_updated_at
  before update on lender_policies
  for each row execute function tg_set_updated_at();

-- RLS: only super_admin and the client's own admin can read/write
alter table lender_policies enable row level security;

drop policy if exists lender_policies_read on lender_policies;
create policy lender_policies_read on lender_policies
  for select using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );

drop policy if exists lender_policies_write on lender_policies;
create policy lender_policies_write on lender_policies
  for all using (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  ) with check (
    is_super_admin()
    or (current_user_role() = 'admin' and client_id = current_client_id())
  );
