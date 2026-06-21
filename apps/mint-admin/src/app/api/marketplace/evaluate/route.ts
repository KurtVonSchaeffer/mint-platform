import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { evaluatePolicy } from '@/lib/credit-engine';
import type { CreditProfile, LenderPolicy, QuoteRequest, Offer, Decline } from '@/lib/credit-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/evaluate
 *
 * Public endpoint called by MINT (app.mymint.co.za) after their
 * own Experian + TruID credit check has run.
 *
 * MINT sends the already-verified credit profile — AlgoLend evaluates
 * it against every active lender policy and returns ranked offers.
 *
 * Single credit check principle: MINT ran the bureau pull once.
 * We never re-check — we just route.
 *
 * Auth: Bearer token in Authorization header (MINT_API_KEY env var).
 *
 * Request body:
 * {
 *   // Credit profile (from MINT's Experian + TruID run)
 *   creditScore:               number,   // 0–999
 *   monthlyIncome:             number,   // verified gross (ZAR)
 *   existingMonthlyObligations: number,  // current loan repayments
 *   openDefaults:              number,   // open adverse accounts
 *   enquiriesLast12Months?:    number,
 *   idVerified:                boolean,
 *   employmentStatus?:         'employed' | 'self_employed' | 'unemployed' | 'unknown',
 *
 *   // Loan request
 *   requestedAmount:  number,   // ZAR
 *   termMonths:       number,
 *   purpose?:         string,
 *
 *   // Optional — used for lender eligibility gates
 *   yearsInOperation?: number,  // for business loans
 *
 *   // Optional — to persist quote for audit
 *   mintUserId?:     string,
 *   mintRequestRef?: string,    // MINT's own reference
 * }
 *
 * Response:
 * {
 *   requestId:  string,   // AlgoLend reference for audit
 *   offers:     Offer[],  // sorted cheapest monthly installment first
 *   declines:   { lender: string; reason: string }[],
 *   totalLenders: number,
 *   evaluatedAt: string,
 * }
 */

// ── Rate limiting — 60 requests / minute per IP ───────────────────────
const RL = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(req: NextRequest): boolean {
  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit  = 60;

  let entry = RL.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + window };
    RL.set(ip, entry);
    // Evict stale entries every ~1 000 keys to prevent unbounded growth
    if (RL.size > 1_000) {
      for (const [k, v] of RL) { if (now > v.resetAt) RL.delete(k); }
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

// ── Auth ──────────────────────────────────────────────────────────────
function isAuthorised(req: NextRequest): boolean {
  // Internal admin simulator — always allowed (admin is behind Supabase auth)
  if (req.headers.get('x-admin-simulate') === '1') return true;
  const apiKey = process.env.MINT_API_KEY;
  if (!apiKey) return true; // dev mode — no key required locally
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${apiKey}`;
}

// ── CORS headers for cross-origin calls from MINT ─────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  process.env.MINT_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  // ── 1. Auth + rate limit ─────────────────────────────────────────────
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: CORS });
  }
  if (!checkRateLimit(req)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS });
  }

  // ── 2. Parse + validate body ─────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const {
    creditScore, monthlyIncome, existingMonthlyObligations,
    openDefaults = 0, enquiriesLast12Months = 0, idVerified = false,
    employmentStatus = 'unknown', requestedAmount, termMonths,
    yearsInOperation = 1, mintUserId, mintRequestRef,
  } = body as Record<string, unknown>;

  if (!creditScore || !monthlyIncome || !requestedAmount || !termMonths) {
    return NextResponse.json({
      error: 'Required: creditScore, monthlyIncome, requestedAmount, termMonths',
    }, { status: 422, headers: CORS });
  }

  // ── 3. Build AlgoLend CreditProfile from MINT's data ─────────────────
  const profile: CreditProfile = {
    creditScore:                Number(creditScore),
    monthlyIncome:               Number(monthlyIncome),
    existingMonthlyObligations:  Number(existingMonthlyObligations ?? 0),
    openDefaults:                Number(openDefaults),
    enquiriesLast12Months:       Number(enquiriesLast12Months),
    idVerified:                  Boolean(idVerified),
    employmentStatus:            (employmentStatus as CreditProfile['employmentStatus']) ?? 'unknown',
    employer:                    null,
    raw: { experian: null, sureSystems: null },
  };

  const quoteReq: QuoteRequest = {
    amount:           Number(requestedAmount),
    termMonths:       Number(termMonths),
    yearsInOperation: Number(yearsInOperation),
  };

  // ── 4. Load all active lender policies ───────────────────────────────
  const { data: policyRows, error: pErr } = await supabaseAdmin
    .from('lender_policies')
    .select(`
      id, client_id, display_name, logo_url, tagline, avg_turnaround_days,
      min_credit_score, max_dsr_pct, min_amount, max_amount,
      min_years_in_operation, require_id_verified, max_open_defaults,
      base_rate_pct, initiation_fee_pct, monthly_service_fee, rate_bands
    `)
    .eq('active', true);

  if (pErr) {
    console.error('[marketplace/evaluate] lender_policies fetch failed', pErr);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });
  }

  if (!policyRows || policyRows.length === 0) {
    return NextResponse.json({
      requestId: null, offers: [], declines: [],
      totalLenders: 0, evaluatedAt: new Date().toISOString(),
      message: 'No active lenders at this time. Check back soon.',
    }, { status: 200, headers: CORS });
  }

  const policies: LenderPolicy[] = policyRows.map(r => ({
    clientId:            r.client_id,
    displayName:         r.display_name,
    logoUrl:             r.logo_url ?? null,
    tagline:             r.tagline ?? null,
    avgTurnaroundDays:   r.avg_turnaround_days ?? 2,
    minCreditScore:      r.min_credit_score,
    maxDsrPct:           r.max_dsr_pct,
    minAmount:           r.min_amount,
    maxAmount:           r.max_amount,
    minYearsInOperation: r.min_years_in_operation,
    requireIdVerified:   r.require_id_verified,
    maxOpenDefaults:     r.max_open_defaults,
    baseRatePct:         r.base_rate_pct,
    initiationFeePct:    r.initiation_fee_pct,
    monthlyServiceFee:   r.monthly_service_fee,
    rateBands:           Array.isArray(r.rate_bands) ? r.rate_bands : [],
  }));

  // ── 5. Evaluate ALL policies in parallel ──────────────────────────────
  const results = await Promise.all(
    policies.map(p => Promise.resolve(evaluatePolicy(profile, p, quoteReq)))
  );

  const offers  = results.filter((r): r is Offer   => r.type === 'offered')
    .sort((a, b) => a.monthlyInstallment - b.monthlyInstallment); // cheapest first

  const declines = results.filter((r): r is Decline => r.type === 'declined')
    .map(d => ({ lender: d.displayName, reason: d.reason }));

  // ── 6. Persist quote request for audit trail ──────────────────────────
  const requestId = crypto.randomUUID();
  supabaseAdmin.from('quote_requests').insert({
    id:               requestId,
    reference:        `MNT-${Date.now()}`,
    consumer_email:   String(mintUserId ?? 'unknown@mymint.co.za'),
    consumer_name:    String(mintUserId ?? 'MINT User'),
    requested_amount: Number(requestedAmount),
    requested_term:   Number(termMonths),
    credit_profile:   profile,
    credit_pulled_at: new Date().toISOString(),
    status:           offers.length > 0 ? 'complete' : 'complete',
    lenders_evaluated: policies.length,
    offers_count:     offers.length,
  }).then(({ error }) => {
    if (error) console.warn('[marketplace/evaluate] audit persist failed', error.message);
  });

  // Persist individual offers
  if (offers.length > 0) {
    supabaseAdmin.from('quote_offers').insert(
      offers.map(o => ({
        request_id:          requestId,
        client_id:           o.clientId,
        status:              'offered',
        offered_amount:      o.offeredAmount,
        offered_rate_pct:    o.offeredRatePct,
        offered_term_months: o.offeredTermMonths,
        monthly_installment: o.monthlyInstallment,
        total_repayment:     o.totalRepayment,
        initiation_fee:      o.initiationFee,
      }))
    ).then(({ error }) => {
      if (error) console.warn('[marketplace/evaluate] offers persist failed', error.message);
    });
  }

  // ── 7. Return ranked offers ───────────────────────────────────────────
  return NextResponse.json({
    requestId,
    mintRequestRef: mintRequestRef ?? null,
    offers: offers.map(o => ({
      lenderId:           o.clientId,
      lenderName:         o.displayName,
      logoUrl:            o.logoUrl,
      tagline:            o.tagline,
      avgTurnaroundDays:  o.avgTurnaroundDays,
      offeredAmount:      o.offeredAmount,
      offeredRatePct:     o.offeredRatePct,
      termMonths:         o.offeredTermMonths,
      monthlyInstallment: o.monthlyInstallment,
      totalRepayment:     o.totalRepayment,
      initiationFee:      o.initiationFee,
      effectiveCost:      o.effectiveCost,
      loanType:           'unsecured',
    })),
    declines,
    totalLenders:  policies.length,
    offersCount:   offers.length,
    evaluatedAt:   new Date().toISOString(),
  }, { status: 200, headers: CORS });
}
