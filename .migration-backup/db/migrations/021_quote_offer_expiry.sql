-- =====================================================================
-- 021 · Offer expiry + duplicate-request guard
-- =====================================================================
-- Two marketplace safeguards found missing during the credit-marketplace
-- refinement pass:
--
--   1. quote_offers had no expiry. A credit profile evaluated weeks ago
--      could still be "accepted" today against stale rates and eligibility,
--      with no re-check against the lender's current policy. Offers now
--      expire 14 days after creation; offers/route.ts checks this before
--      allowing acceptance.
--
--   2. /api/marketplace/evaluate created a fresh quote_requests row on
--      every call with no idempotency — repeated calls for the same MINT
--      user within a short window spammed every lender with duplicate
--      applications and inflated enquiry counts. Indexing mint_user_id +
--      created_at lets the route look back for a recent request instead
--      of re-evaluating from scratch.
-- =====================================================================

-- 'expired' is a new terminal state for an offer whose expires_at has
-- passed by the time a borrower tries to accept it (checked in
-- POST /api/marketplace/offers). ALTER TYPE ... ADD VALUE must run outside
-- an explicit transaction block — run this statement on its own if your
-- SQL client wraps the whole file in one transaction.
alter type offer_status add value if not exists 'expired';

alter table quote_offers
  add column if not exists expires_at timestamptz;

-- Backfill existing rows so old offers aren't treated as "expires_at IS
-- NULL = never expires" — 14 days from their creation, same as new rows.
update quote_offers
  set expires_at = created_at + interval '14 days'
  where expires_at is null;

comment on column quote_offers.expires_at is
  'Offer is no longer acceptable after this time — 14 days from creation. Checked in POST /api/marketplace/offers before allowing acceptance.';

-- quote_requests needs a way to identify "the same borrower" across calls
-- for the duplicate-request lookback. mint_user_id isn't currently a
-- distinct column (it was only ever passed through into credit_profile
-- JSON) — add it as a real column so it can be indexed and queried.
alter table quote_requests
  add column if not exists mint_user_id text;

create index if not exists idx_quote_requests_mint_user_recent
  on quote_requests (mint_user_id, created_at desc)
  where mint_user_id is not null;
