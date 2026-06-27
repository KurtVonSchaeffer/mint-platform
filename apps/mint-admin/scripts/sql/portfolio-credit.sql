-- Run in Supabase SQL editor to create the portfolio-backed credit tracking table.
-- Records are written by the MINT app when a portfolio credit facility is created
-- (POST /api/marketplace/portfolio-credit from the MINT backend).

CREATE TABLE IF NOT EXISTS portfolio_credit_facilities (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Borrower (MINT user)
  mint_user_id        text        NOT NULL,
  consumer_email      text        NOT NULL,
  consumer_name       text,

  -- Collateral
  portfolio_value     numeric     NOT NULL,  -- ZAR value of portfolio at origination
  collateral_type     text        NOT NULL DEFAULT 'mixed',  -- equities | bonds | mixed | unit_trusts

  -- Facility terms
  facility_amount     numeric     NOT NULL,  -- approved credit limit (ZAR)
  drawn_amount        numeric     NOT NULL DEFAULT 0,  -- amount currently drawn
  ltv_ratio           numeric     NOT NULL,  -- drawn_amount / portfolio_value (e.g. 0.65 = 65%)
  interest_rate_pct   numeric     NOT NULL,
  term_months         integer,

  -- Status
  status              text        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('pending','active','margin_call','repaid','defaulted')),

  -- Dates
  originated_at       timestamptz,
  repaid_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Flexible extra data (MINT reference, product details, etc.)
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pcf_email  ON portfolio_credit_facilities (consumer_email);
CREATE INDEX IF NOT EXISTS idx_pcf_status ON portfolio_credit_facilities (status);
CREATE INDEX IF NOT EXISTS idx_pcf_user   ON portfolio_credit_facilities (mint_user_id);

ALTER TABLE portfolio_credit_facilities ENABLE ROW LEVEL SECURITY;

-- Admin-only: no borrower-facing RLS (this table is managed by the AlgoLend admin backend).
DROP POLICY IF EXISTS "service role only" ON portfolio_credit_facilities;
CREATE POLICY "service role only"
  ON portfolio_credit_facilities
  FOR ALL
  USING (true)
  WITH CHECK (true);
