/**
 * Mint aggregator — orchestrates the full quote flow:
 *
 * 1. Pull Experian + SureSystems in parallel (ONE credit check total)
 * 2. Merge into a single CreditProfile
 * 3. Fan out to every active lender_policy via evaluatePolicy()
 * 4. Persist offers to quote_offers
 * 5. Mark quote_request as complete
 */

import { evaluatePolicy } from '@mint/credit-engine';
import type { CreditProfile, LenderPolicy } from '@mint/credit-engine';
import { pullExperianProfile }    from './credit/experian';
import { pullSureSystemsProfile } from './credit/suresystems';
import { db } from './supabase';

/* ─── Types ──────────────────────────────────────────────────────── */

interface AggregatorInput {
  requestId:        string;
  consumerName:     string;
  consumerIdNumber: string;
  consumerMobile?:  string;
  requestedAmount:  number;
  requestedTerm:    number;
  yearsInOperation: number;
}

/* ─── Main entry point ───────────────────────────────────────────── */

export async function runAggregator(input: AggregatorInput): Promise<void> {
  try {
    // ── 1. Credit pulls in parallel ──────────────────────────────
    const nameParts = input.consumerName.trim().split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName  = nameParts.slice(1).join(' ') || firstName;

    const [experianPartial, sureSystemsPartial] = await Promise.allSettled([
      pullExperianProfile({ idNumber: input.consumerIdNumber, firstName, lastName }),
      pullSureSystemsProfile({ idNumber: input.consumerIdNumber, mobile: input.consumerMobile }),
    ]);

    // If both fail — mark request as error
    if (experianPartial.status === 'rejected' && sureSystemsPartial.status === 'rejected') {
      await db.from('quote_requests').update({
        status:        'error',
        error_message: `Credit bureaus unavailable: ${experianPartial.reason}`,
      }).eq('id', input.requestId);
      return;
    }

    // Merge partial results
    const experian    = experianPartial.status    === 'fulfilled' ? experianPartial.value    : {};
    const sureSystems = sureSystemsPartial.status === 'fulfilled' ? sureSystemsPartial.value : {};

    const profile: CreditProfile = {
      creditScore:               experian.creditScore              ?? 0,
      monthlyIncome:             sureSystems.monthlyIncome         ?? 0,
      existingMonthlyObligations: sureSystems.existingMonthlyObligations ?? 0,
      openDefaults:              experian.openDefaults             ?? 0,
      enquiriesLast12Months:     experian.enquiriesLast12Months    ?? 0,
      idVerified:                experian.idVerified               ?? false,
      employmentStatus:          sureSystems.employmentStatus      ?? 'unknown',
      employer:                  sureSystems.employer              ?? null,
      raw: {
        experian:    experian.raw?.experian    ?? null,
        sureSystems: sureSystems.raw?.sureSystems ?? null,
      },
    };

    // Persist credit profile to request (for audit)
    await db.from('quote_requests').update({
      credit_profile:   profile,
      credit_pulled_at: new Date().toISOString(),
    }).eq('id', input.requestId);

    // ── 2. Load active lender policies ───────────────────────────
    const { data: policyRows } = await db
      .from('lender_policies')
      .select(`
        id, client_id, display_name, logo_url, tagline, avg_turnaround_days,
        min_credit_score, max_dsr_pct, min_amount, max_amount,
        min_years_in_operation, require_id_verified, max_open_defaults,
        base_rate_pct, initiation_fee_pct, monthly_service_fee, rate_bands
      `)
      .eq('active', true);

    const policies: LenderPolicy[] = (policyRows ?? []).map(mapPolicy);

    if (policies.length === 0) {
      await db.from('quote_requests').update({
        status: 'complete', lenders_evaluated: 0, offers_count: 0,
      }).eq('id', input.requestId);
      return;
    }

    // ── 3. Fan out — evaluate all policies in parallel ───────────
    const quoteRequest = {
      amount:            input.requestedAmount,
      termMonths:        input.requestedTerm,
      yearsInOperation:  input.yearsInOperation,
    };

    const results = await Promise.all(
      policies.map(async (policy) => {
        const result = evaluatePolicy(profile, policy, quoteRequest);

        if (result.type === 'offered') {
          await db.from('quote_offers').upsert({
            request_id:          input.requestId,
            client_id:           policy.clientId,
            status:              'offered',
            offered_amount:      result.offeredAmount,
            offered_rate_pct:    result.offeredRatePct,
            offered_term_months: result.offeredTermMonths,
            monthly_installment: result.monthlyInstallment,
            total_repayment:     result.totalRepayment,
            initiation_fee:      result.initiationFee,
            decision_reason:     null,
          }, { onConflict: 'request_id,client_id' });
        } else {
          await db.from('quote_offers').upsert({
            request_id:      input.requestId,
            client_id:       policy.clientId,
            status:          'declined',
            decision_reason: result.reason,
          }, { onConflict: 'request_id,client_id' });
        }

        return result.type;
      }),
    );

    const offersCount = results.filter((t) => t === 'offered').length;

    // ── 4. Mark complete ─────────────────────────────────────────
    await db.from('quote_requests').update({
      status:            'complete',
      lenders_evaluated: policies.length,
      offers_count:      offersCount,
    }).eq('id', input.requestId);

  } catch (err) {
    console.error('[aggregator] Unhandled error:', err);
    await db.from('quote_requests').update({
      status: 'error',
      error_message: err instanceof Error ? err.message : String(err),
    }).eq('id', input.requestId);
  }
}

/* ─── Reference generator ────────────────────────────────────────── */

export function generateReference(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QR-${date}-${rand}`;
}

/* ─── DB row → LenderPolicy mapper ──────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPolicy(row: any): LenderPolicy {
  return {
    clientId:            row.client_id,
    displayName:         row.display_name,
    logoUrl:             row.logo_url ?? null,
    tagline:             row.tagline  ?? null,
    avgTurnaroundDays:   row.avg_turnaround_days ?? 2,
    minCreditScore:      row.min_credit_score,
    maxDsrPct:           row.max_dsr_pct,
    minAmount:           row.min_amount,
    maxAmount:           row.max_amount,
    minYearsInOperation: row.min_years_in_operation,
    requireIdVerified:   row.require_id_verified,
    maxOpenDefaults:     row.max_open_defaults,
    baseRatePct:         row.base_rate_pct,
    initiationFeePct:    row.initiation_fee_pct,
    monthlyServiceFee:   row.monthly_service_fee,
    rateBands:           Array.isArray(row.rate_bands) ? row.rate_bands : [],
  };
}
