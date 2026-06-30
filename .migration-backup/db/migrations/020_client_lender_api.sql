-- =====================================================================
-- 020 · Lender-facing integration API credentials
-- =====================================================================
-- getClientSupabase() (lib/client-db.ts) currently pushes loan data into
-- a lender's own Supabase database using either a raw service_role key
-- stored on clients.supabase_service_key, or a fallback that fetches a
-- lender's *decrypted* Vercel project env vars (including their Supabase
-- service role key) via VERCEL_API_TOKEN. Both give MINT full read/write
-- access to a lender's entire database, not just loan creation.
--
-- New pattern: each lender exposes a scoped integration endpoint
-- (e.g. ZwaneOfficial's POST /api/integrations/loans) that only accepts
-- a dedicated API key with no direct database access. MINT calls that
-- endpoint over HTTP instead of connecting to the lender's Supabase
-- directly.
-- =====================================================================

alter table clients
  add column if not exists lender_api_base_url text,
  add column if not exists lender_api_key      text;

comment on column clients.lender_api_base_url is 'Base URL of the lender''s scoped loan-intake API (e.g. https://zwane-official-three-seven.vercel.app). Preferred over direct Supabase access.';
comment on column clients.lender_api_key      is 'Bearer token for the lender''s scoped loan-intake API. Scoped to loan creation only — not a database credential. Never return in API responses.';

-- Track delivery of each offer's loan-push to the lender, instead of the
-- previous fire-and-forget console.warn-only failure handling.
alter table quote_offers
  add column if not exists lender_push_status      text
    check (lender_push_status in ('pending','sent','failed')) default 'pending',
  add column if not exists lender_push_error        text,
  add column if not exists lender_application_ref   text,   -- applicationId returned by the lender's API
  add column if not exists lender_pushed_at          timestamptz;

create index if not exists idx_quote_offers_push_status on quote_offers (lender_push_status) where lender_push_status = 'failed';
