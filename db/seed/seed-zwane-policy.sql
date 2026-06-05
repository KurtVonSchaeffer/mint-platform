-- =====================================================================
-- ZwaneOfficial lender policy seed
-- Rules derived directly from apps/algolend/public/admin/src/modules/applications.js
-- =====================================================================
-- Run in the MINT ADMIN Supabase SQL editor (not ZwaneOfficial's Supabase).
-- Idempotent: uses ON CONFLICT to update if already exists.
-- =====================================================================

-- Rate sources (from applications.js):
--   INTEREST_RATE_MONTHLY = 0.05   → 60% p.a.
--   INITIATION_FEE_RATE   = 0.15   → 15% of principal (NCA cap)
--   SERVICE_FEE_MONTHLY   = 69     → R69/month (NCA cap)
--   CREDIT_LIFE_RATE      = 0.0045 → tracked separately; not in policy
--   VAT_RATE              = 0.15   → charged on initiation + service fees
--   Affordability gate: NDI surplus (income - expenses) — not score-based

insert into lender_policies (
  client_id,
  display_name,
  tagline,
  avg_turnaround_days,
  min_credit_score,
  max_dsr_pct,
  min_amount,
  max_amount,
  min_years_in_operation,
  require_id_verified,
  max_open_defaults,
  base_rate_pct,
  initiation_fee_pct,
  monthly_service_fee,
  rate_bands,
  active
)
select
  id,
  'Zwane Official',
  'NCA-compliant short-term credit — same-day decisions',
  1,
  0,        -- No credit score minimum; affordability (NDI surplus) is the gate
  100,      -- max_dsr_pct: 100% of NDI surplus available for loan repayment
  500,      -- min_amount: R 500
  50000,    -- max_amount: R 50,000 (short-term personal credit)
  0,        -- min_years_in_operation: personal product, not business
  true,
  0,
  60,       -- 5%/month × 12 = 60% p.a. (NCA short-term maximum)
  15,       -- 15% initiation fee (NCA cap; waived for first loan of year — handled in algolend)
  69,       -- R69/month service fee (NCA cap)
  '[
    {"minScore": 600, "rateAdjustment": 0},
    {"minScore": 0,   "rateAdjustment": 0}
  ]'::jsonb,
  true
from clients
where slug = 'zwane-official'
on conflict (client_id) do update set
  display_name         = excluded.display_name,
  tagline              = excluded.tagline,
  base_rate_pct        = excluded.base_rate_pct,
  initiation_fee_pct   = excluded.initiation_fee_pct,
  monthly_service_fee  = excluded.monthly_service_fee,
  min_credit_score     = excluded.min_credit_score,
  max_dsr_pct          = excluded.max_dsr_pct,
  min_amount           = excluded.min_amount,
  max_amount           = excluded.max_amount,
  min_years_in_operation = excluded.min_years_in_operation,
  rate_bands           = excluded.rate_bands,
  active               = excluded.active,
  updated_at           = now();
