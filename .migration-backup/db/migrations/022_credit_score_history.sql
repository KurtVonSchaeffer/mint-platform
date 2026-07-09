-- =====================================================================
-- 022 · Credit score history (mint-admin marketplace)
-- =====================================================================
-- mint-admin has no concept of a borrower's score changing over time —
-- only the single current score on a quote_request's credit_profile JSON.
-- Zwane already had this data (every credit_checks row accumulates per
-- borrower with no dedup), it just wasn't rendered. mint-admin has no
-- equivalent table at all, so this adds one from scratch.
--
-- Join key: consumer_id_number is the most reliable cross-request
-- identifier (a real, stable person-level ID independent of whether MINT's
-- integration metadata is present), with mint_user_id as a fallback for
-- rows where the ID number wasn't captured. Both are nullable and neither
-- is unique — a borrower is identified by matching either field.
-- =====================================================================

create table if not exists credit_score_history (
  id                          uuid primary key default gen_random_uuid(),
  request_id                  uuid not null references quote_requests(id) on delete cascade,
  mint_user_id                text,
  consumer_id_number          text,
  credit_score                numeric(5,1) not null,
  monthly_income              numeric(15,2),
  existing_monthly_obligations numeric(15,2),
  evaluated_at                timestamptz not null default now()
);

comment on table credit_score_history is
  'One row per /api/marketplace/evaluate call with a fresh (non-reused) credit profile — lets a borrower''s score be plotted over time.';

create index if not exists idx_credit_score_history_id_number
  on credit_score_history (consumer_id_number, evaluated_at desc)
  where consumer_id_number is not null;

create index if not exists idx_credit_score_history_mint_user
  on credit_score_history (mint_user_id, evaluated_at desc)
  where mint_user_id is not null;
