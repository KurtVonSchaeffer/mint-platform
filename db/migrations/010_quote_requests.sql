-- =====================================================================
-- 010 · Quote requests + offers — Mint aggregator
-- =====================================================================
-- quote_requests: one row per consumer who submits through the Mint app.
-- quote_offers:   one row per lender per request (offered or declined).
-- =====================================================================

-- ── Status enums ────────────────────────────────────────────────────
do $$ begin
  create type quote_status as enum (
    'pending',    -- credit checks running
    'complete',   -- all lenders evaluated
    'error',      -- credit pull failed
    'expired'     -- >24 h old
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type offer_status as enum (
    'offered',    -- lender will lend
    'declined',   -- lender cannot offer
    'error',      -- evaluation threw
    'accepted'    -- consumer accepted this offer
  );
exception when duplicate_object then null;
end $$;

-- ── Quote requests ───────────────────────────────────────────────────
create table if not exists quote_requests (
  id                  uuid        primary key default gen_random_uuid(),
  reference           text        not null unique,   -- QR-YYYYMMDD-XXXX

  -- Consumer details (snapshot)
  consumer_email      text        not null,
  consumer_name       text        not null,
  consumer_id_number  text,
  consumer_mobile     text,
  business_name       text,
  years_in_operation  integer,

  -- What they want
  requested_amount    numeric(15,2) not null,
  requested_term      integer       not null,   -- months
  purpose             text,

  -- Credit data (stored server-side, never sent to client in full)
  credit_profile      jsonb,                    -- Experian + SureSystems normalised result
  credit_pulled_at    timestamptz,

  -- Workflow
  status              quote_status not null default 'pending',
  error_message       text,
  lenders_evaluated   integer not null default 0,
  offers_count        integer not null default 0,

  -- Lifecycle
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  expires_at          timestamptz not null default now() + interval '24 hours'
);

comment on table quote_requests is 'One credit check per consumer. Fan-out to all active lender_policies. Expires after 24 h.';

create index if not exists idx_quote_requests_status    on quote_requests (status, created_at desc);
create index if not exists idx_quote_requests_email     on quote_requests (consumer_email);
create index if not exists idx_quote_requests_reference on quote_requests (reference);

drop trigger if exists set_quote_requests_updated_at on quote_requests;
create trigger set_quote_requests_updated_at
  before update on quote_requests
  for each row execute function tg_set_updated_at();

-- ── Quote offers ─────────────────────────────────────────────────────
create table if not exists quote_offers (
  id                  uuid        primary key default gen_random_uuid(),
  request_id          uuid        not null references quote_requests(id) on delete cascade,
  client_id           uuid        not null references clients(id) on delete cascade,

  -- Decision
  status              offer_status not null default 'declined',
  decision_reason     text,          -- human-readable decline reason or null for offers

  -- Offer terms (null when declined)
  offered_amount      numeric(15,2),
  offered_rate_pct    numeric(5,2),
  offered_term_months integer,
  monthly_installment numeric(15,2),
  total_repayment     numeric(15,2),
  initiation_fee      numeric(15,2),

  -- Consumer action
  accepted_at         timestamptz,
  application_id      uuid references loan_applications(id) on delete set null,

  -- Lifecycle
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (request_id, client_id)
);

comment on table quote_offers is 'One row per lender per quote request. Populated by the aggregator fan-out.';

create index if not exists idx_quote_offers_request on quote_offers (request_id);
create index if not exists idx_quote_offers_status  on quote_offers (status, request_id);

drop trigger if exists set_quote_offers_updated_at on quote_offers;
create trigger set_quote_offers_updated_at
  before update on quote_offers
  for each row execute function tg_set_updated_at();

-- RLS: quote data is sensitive — service role only (Mint app uses service key)
alter table quote_requests enable row level security;
alter table quote_offers    enable row level security;

-- Block all direct authenticated access — Mint API routes use service role
drop policy if exists quote_requests_deny on quote_requests;
create policy quote_requests_deny on quote_requests for all using (false);

drop policy if exists quote_offers_deny on quote_offers;
create policy quote_offers_deny on quote_offers for all using (false);

-- Super-admin read-only (for debugging in mint-admin)
drop policy if exists quote_requests_superadmin on quote_requests;
create policy quote_requests_superadmin on quote_requests
  for select using (is_super_admin());

drop policy if exists quote_offers_superadmin on quote_offers;
create policy quote_offers_superadmin on quote_offers
  for select using (is_super_admin());
