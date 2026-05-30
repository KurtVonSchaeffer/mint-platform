import type { CreditProfile, LenderPolicy, QuoteRequest, EvaluationResult } from './types';

/**
 * PMT — standard fixed-rate amortisation formula.
 * Returns monthly payment for a loan.
 */
function pmt(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * evaluatePolicy
 *
 * Pure function — takes a credit profile, a lender's policy, and the
 * consumer's request. Returns an Offer or Decline. No I/O.
 *
 * Called in parallel for every active lender_policy row.
 */
export function evaluatePolicy(
  profile:  CreditProfile,
  policy:   LenderPolicy,
  request:  QuoteRequest,
): EvaluationResult {
  const decline = (reason: string): EvaluationResult => ({
    type: 'declined',
    clientId:    policy.clientId,
    displayName: policy.displayName,
    reason,
  });

  // ── Hard gates ───────────────────────────────────────────────────

  if (policy.requireIdVerified && !profile.idVerified) {
    return decline('Identity could not be verified');
  }

  if (profile.openDefaults > policy.maxOpenDefaults) {
    return decline('Open defaults exceed maximum allowed');
  }

  if (profile.creditScore < policy.minCreditScore) {
    return decline('Credit score below minimum requirement');
  }

  if ((request.yearsInOperation ?? 0) < policy.minYearsInOperation) {
    return decline(`Business must have at least ${policy.minYearsInOperation} year(s) of operation`);
  }

  // ── Amount clamping ──────────────────────────────────────────────

  const amount = Math.min(Math.max(request.amount, policy.minAmount), policy.maxAmount);

  // ── Rate lookup from score bands ─────────────────────────────────
  // Bands are ordered highest minScore first; pick the first band
  // where creditScore >= minScore.

  const sorted = [...policy.rateBands].sort((a, b) => b.minScore - a.minScore);
  const band = sorted.find((b) => profile.creditScore >= b.minScore);

  if (!band || band.rateAdjustment === null) {
    return decline('Credit profile does not qualify for available rate bands');
  }

  const finalRate = Math.max(0, policy.baseRatePct + band.rateAdjustment);

  // ── Installment + DSR check ──────────────────────────────────────

  const term        = request.termMonths;
  const installment = pmt(amount, finalRate, term);
  const totalDebt   = profile.existingMonthlyObligations + installment;
  const dsr         = profile.monthlyIncome > 0 ? totalDebt / profile.monthlyIncome : Infinity;

  if (dsr > policy.maxDsrPct / 100) {
    return decline('Debt service ratio exceeds maximum allowed');
  }

  // ── Build offer ──────────────────────────────────────────────────

  const initiationFee = amount * (policy.initiationFeePct / 100);
  const totalRepayment = installment * term + policy.monthlyServiceFee * term;

  return {
    type:                'offered',
    clientId:            policy.clientId,
    displayName:         policy.displayName,
    logoUrl:             policy.logoUrl,
    tagline:             policy.tagline,
    avgTurnaroundDays:   policy.avgTurnaroundDays,
    offeredAmount:       amount,
    offeredRatePct:      finalRate,
    offeredTermMonths:   term,
    monthlyInstallment:  Math.round(installment * 100) / 100,
    totalRepayment:      Math.round(totalRepayment * 100) / 100,
    initiationFee:       Math.round(initiationFee * 100) / 100,
    effectiveCost:       Math.round((totalRepayment + initiationFee) * 100) / 100,
  };
}
