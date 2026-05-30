/* ─── Credit profile (assembled from Experian + SureSystems) ──────── */

export interface CreditProfile {
  creditScore:                 number;   // 0–999 (SA bureau range)
  monthlyIncome:               number;   // verified gross monthly income (ZAR)
  existingMonthlyObligations:  number;   // sum of all current loan repayments
  openDefaults:                number;   // count of open default accounts
  enquiriesLast12Months:       number;
  idVerified:                  boolean;
  employmentStatus:            'employed' | 'self_employed' | 'unemployed' | 'unknown';
  employer:                    string | null;
  raw: {
    experian:    unknown;
    sureSystems: unknown;
  };
}

/* ─── Per-lender policy (from lender_policies table) ─────────────── */

export interface RateBand {
  minScore:        number;
  rateAdjustment:  number | null;   // null = auto-decline this band
}

export interface LenderPolicy {
  clientId:             string;
  displayName:          string;
  logoUrl:              string | null;
  tagline:              string | null;
  avgTurnaroundDays:    number;

  // Gates
  minCreditScore:       number;
  maxDsrPct:            number;
  minAmount:            number;
  maxAmount:            number;
  minYearsInOperation:  number;
  requireIdVerified:    boolean;
  maxOpenDefaults:      number;

  // Pricing
  baseRatePct:          number;
  initiationFeePct:     number;
  monthlyServiceFee:    number;
  rateBands:            RateBand[];
}

/* ─── Consumer quote request ─────────────────────────────────────── */

export interface QuoteRequest {
  amount:            number;
  termMonths:        number;
  yearsInOperation?: number;
}

/* ─── Evaluation result ──────────────────────────────────────────── */

export interface Offer {
  type:                 'offered';
  clientId:             string;
  displayName:          string;
  logoUrl:              string | null;
  tagline:              string | null;
  avgTurnaroundDays:    number;
  offeredAmount:        number;
  offeredRatePct:       number;
  offeredTermMonths:    number;
  monthlyInstallment:   number;
  totalRepayment:       number;
  initiationFee:        number;
  effectiveCost:        number;   // total repayment + initiation fee
}

export interface Decline {
  type:           'declined';
  clientId:       string;
  displayName:    string;
  reason:         string;
}

export type EvaluationResult = Offer | Decline;
