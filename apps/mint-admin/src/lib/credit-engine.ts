/**
 * Credit engine — inlined from packages/credit-engine so this Next.js
 * app needs no workspace dependency configuration.
 *
 * Single source of truth lives in packages/credit-engine/src/*.
 * If you change the algorithm there, mirror it here too.
 */

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface CreditProfile {
  creditScore:                 number;
  monthlyIncome:               number;
  existingMonthlyObligations:  number;
  openDefaults:                number;
  enquiriesLast12Months:       number;
  idVerified:                  boolean;
  employmentStatus:            'employed' | 'self_employed' | 'unemployed' | 'unknown';
  employer:                    string | null;
  raw: { experian: unknown; sureSystems: unknown };
}

export interface RateBand {
  minScore:       number;
  rateAdjustment: number | null;
}

export interface LenderPolicy {
  clientId:             string;
  displayName:          string;
  logoUrl:              string | null;
  tagline:              string | null;
  avgTurnaroundDays:    number;
  minCreditScore:       number;
  maxDsrPct:            number;
  minAmount:            number;
  maxAmount:            number;
  requireIdVerified:    boolean;
  maxOpenDefaults:      number;
  baseRatePct:          number;
  initiationFeePct:     number;
  monthlyServiceFee:    number;
  rateBands:            RateBand[];
}

export interface QuoteRequest {
  amount:             number;
  termMonths:         number;
}

export interface Offer {
  type:                'offered';
  clientId:            string;
  displayName:         string;
  logoUrl:             string | null;
  tagline:             string | null;
  avgTurnaroundDays:   number;
  offeredAmount:       number;
  offeredRatePct:      number;
  offeredTermMonths:   number;
  monthlyInstallment:  number;
  totalRepayment:      number;
  initiationFee:       number;
  effectiveCost:       number;
  requestedAmount:     number;
  amountAdjusted:      boolean;
}

export interface Decline {
  type:        'declined';
  clientId:    string;
  displayName: string;
  reason:      string;
}

export type EvaluationResult = Offer | Decline;

/* ─── PMT — standard fixed-rate amortisation ─────────────────────────── */

function pmt(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/* ─── evaluatePolicy — pure, no I/O ─────────────────────────────────── */

export function evaluatePolicy(
  profile:  CreditProfile,
  policy:   LenderPolicy,
  request:  QuoteRequest,
): EvaluationResult {
  const decline = (reason: string): EvaluationResult => ({
    type: 'declined', clientId: policy.clientId, displayName: policy.displayName, reason,
  });

  // Hard gates — each reason carries the actual numbers so a borrower/ops
  // can see how close they were and what would need to change, instead of
  // a static string that's identical whether they missed by 1 point or 200.
  if (policy.requireIdVerified && !profile.idVerified)
    return decline('Identity could not be verified — ID verification is required by this lender');
  if (profile.openDefaults > policy.maxOpenDefaults)
    return decline(`Open defaults (${profile.openDefaults}) exceed this lender's maximum of ${policy.maxOpenDefaults}`);
  if (profile.creditScore < policy.minCreditScore)
    return decline(`Credit score ${profile.creditScore} is below this lender's minimum of ${policy.minCreditScore}`);
  // Amount clamping — record whether the amount offered differs from what
  // was actually requested, so the caller can flag it instead of silently
  // presenting a different figure as if it were the request.
  const requestedAmount = request.amount;
  const amount = Math.min(Math.max(request.amount, policy.minAmount), policy.maxAmount);
  const amountAdjusted = amount !== requestedAmount;

  // Rate from score bands — highest minScore first; on tie, lowest rateAdjustment wins (best rate for borrower)
  const sorted = [...policy.rateBands].sort((a, b) =>
    b.minScore - a.minScore || (a.rateAdjustment ?? 0) - (b.rateAdjustment ?? 0),
  );
  const band = sorted.find(b => profile.creditScore >= b.minScore);
  if (!band || band.rateAdjustment === null)
    return decline(`Credit score ${profile.creditScore} qualifies on the minimum gate but has no matching rate band for this lender's pricing`);

  const finalRate  = Math.max(0, policy.baseRatePct + band.rateAdjustment);
  const installment = pmt(amount, finalRate, request.termMonths);

  // DSR check
  const totalDebt = profile.existingMonthlyObligations + installment;
  const dsr       = profile.monthlyIncome > 0 ? totalDebt / profile.monthlyIncome : Infinity;
  if (dsr > policy.maxDsrPct / 100) {
    const dsrPct    = profile.monthlyIncome > 0 ? Math.round(dsr * 1000) / 10 : null;
    const dsrLabel  = dsrPct === null ? 'undeterminable (no income on record)' : `${dsrPct}%`;
    return decline(`Debt service ratio ${dsrLabel} exceeds this lender's maximum of ${policy.maxDsrPct}%`);
  }

  const initiationFee  = amount * (policy.initiationFeePct / 100);
  const totalRepayment = installment * request.termMonths + policy.monthlyServiceFee * request.termMonths;

  return {
    type:               'offered',
    clientId:           policy.clientId,
    displayName:        policy.displayName,
    logoUrl:            policy.logoUrl,
    tagline:            policy.tagline,
    avgTurnaroundDays:  policy.avgTurnaroundDays,
    offeredAmount:      amount,
    offeredRatePct:     finalRate,
    offeredTermMonths:  request.termMonths,
    monthlyInstallment: Math.round(installment    * 100) / 100,
    totalRepayment:     Math.round(totalRepayment * 100) / 100,
    initiationFee:      Math.round(initiationFee  * 100) / 100,
    effectiveCost:      Math.round((totalRepayment + initiationFee) * 100) / 100,
    requestedAmount,
    amountAdjusted,
  };
}
