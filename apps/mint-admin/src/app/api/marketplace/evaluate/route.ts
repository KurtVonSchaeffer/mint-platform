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
 *
 *   // Optional — required by most lenders' loan-intake APIs (e.g. Zwane's
 *   // POST /api/integrations/loans rejects applications without idNumber).
 *   // Pull from your own KYC record, e.g. profiles.id_number or
 *   // user_onboarding.sumsub_raw.identity_details.identity_number.
 *   idNumber?: string,
 *   phone?:    string,
 *   purpose?:  string,
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
  // Internal admin simulator path — requires a matching ADMIN_SIMULATE_SECRET
  // so an external caller who knows the header name cannot bypass auth.
  if (req.headers.get('x-admin-simulate') === '1') {
    const secret = process.env.ADMIN_SIMULATE_SECRET;
    return !!secret && req.headers.get('x-admin-simulate-secret') === secret;
  }
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
    mintUserId, mintRequestRef, idNumber, phone, purpose,
  } = body as Record<string, unknown>;

  if (!creditScore || !monthlyIncome || !requestedAmount || !termMonths) {
    return NextResponse.json({
      error: 'Required: creditScore, monthlyIncome, requestedAmount, termMonths',
    }, { status: 422, headers: CORS });
  }

  // ── 2b. Numeric range validation ────────────────────────────────────────
  const cs  = Number(creditScore);
  const inc = Number(monthlyIncome);
  const amt = Number(requestedAmount);
  const trm = Number(termMonths);

  if (!Number.isFinite(cs)  || cs  < 0   || cs  > 999)
    return NextResponse.json({ error: 'creditScore must be 0–999' }, { status: 422, headers: CORS });
  if (!Number.isFinite(inc) || inc <= 0)
    return NextResponse.json({ error: 'monthlyIncome must be greater than 0' }, { status: 422, headers: CORS });
  if (!Number.isFinite(amt) || amt <= 0)
    return NextResponse.json({ error: 'requestedAmount must be greater than 0' }, { status: 422, headers: CORS });
  if (!Number.isInteger(trm) || trm < 1 || trm > 360)
    return NextResponse.json({ error: 'termMonths must be an integer between 1 and 360' }, { status: 422, headers: CORS });

  // ── 2c. Duplicate-request guard ───────────────────────────────────────
  // Every call previously created a brand-new quote_requests row with no
  // idempotency check, so a retried network call or a borrower refreshing
  // the offers screen re-evaluated against every lender from scratch —
  // spamming lenders with duplicate applications and inflating enquiry-like
  // noise. If the same MINT user requested the same amount/term in the last
  // 5 minutes, return that existing result instead of re-evaluating.
  const mintUserIdStr = mintUserId ? String(mintUserId) : null;
  if (mintUserIdStr) {
    const lookbackCutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('quote_requests')
      .select('id, created_at')
      .eq('mint_user_id', mintUserIdStr)
      .eq('requested_amount', amt)
      .eq('requested_term', trm)
      .eq('status', 'complete')
      .gte('created_at', lookbackCutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      // quote_offers and lender_policies both reference `clients` separately —
      // there's no direct FK between them for PostgREST to embed, so fetch
      // and merge in two queries instead of one embedded select.
      const nowIso = new Date().toISOString();
      const { data: existingOffers } = await supabaseAdmin
        .from('quote_offers')
        .select('client_id, offered_amount, offered_rate_pct, offered_term_months, monthly_installment, total_repayment, initiation_fee, expires_at')
        .eq('request_id', recent.id)
        .eq('status', 'offered')
        .gt('expires_at', nowIso); // don't reuse a request whose offers have since expired

      // Only short-circuit if there's something live to return. If the prior
      // request's offers have all since expired (or it had none), fall
      // through to a full re-evaluation rather than returning an empty
      // "reused" result that looks like a real no-offers outcome.
      if (existingOffers && existingOffers.length > 0) {
        const clientIds = [...new Set(existingOffers.map(o => o.client_id))];
        const { data: lenderRows } = clientIds.length
          ? await supabaseAdmin
              .from('lender_policies')
              .select('client_id, display_name, logo_url, tagline, avg_turnaround_days')
              .in('client_id', clientIds)
          : { data: [] as { client_id: string; display_name: string; logo_url: string | null; tagline: string | null; avg_turnaround_days: number | null }[] };
        const lenderByClientId = new Map((lenderRows ?? []).map(l => [l.client_id, l]));

        return NextResponse.json({
          requestId: recent.id,
          mintRequestRef: mintRequestRef ?? null,
          offers: existingOffers.map((o) => {
            const lender = lenderByClientId.get(o.client_id);
            const totalRepayment = Number(o.total_repayment);
            const initiationFee  = Number(o.initiation_fee);
            return {
              lenderId:           o.client_id,
              lenderName:         lender?.display_name ?? null,
              logoUrl:            lender?.logo_url ?? null,
              tagline:            lender?.tagline ?? null,
              avgTurnaroundDays:  lender?.avg_turnaround_days ?? null,
              offeredAmount:      Number(o.offered_amount),
              offeredRatePct:     Number(o.offered_rate_pct),
              termMonths:         o.offered_term_months,
              monthlyInstallment: Number(o.monthly_installment),
              totalRepayment,
              initiationFee,
              effectiveCost:      Math.round((totalRepayment + initiationFee) * 100) / 100,
              loanType:           'unsecured',
            };
          }),
          declines: [],
          totalLenders: existingOffers.length,
          offersCount:  existingOffers.length,
          evaluatedAt:  recent.created_at,
          reused:       true,
        }, { status: 200, headers: CORS });
      }
    }
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
    amount:     Number(requestedAmount),
    termMonths: Number(termMonths),
  };

  // ── 4. Load all active lender policies ───────────────────────────────
  const { data: policyRows, error: pErr } = await supabaseAdmin
    .from('lender_policies')
    .select(`
      id, client_id, display_name, logo_url, tagline, avg_turnaround_days,
      min_credit_score, max_dsr_pct, min_amount, max_amount,
      require_id_verified, max_open_defaults,
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

  // Rank by total cost of credit (effectiveCost = total repayment + initiation
  // fee), not just the monthly installment — a lower installment can still be
  // the more expensive offer once fees are included. Tie-break on installment
  // for offers with identical total cost.
  const offers  = results.filter((r): r is Offer   => r.type === 'offered')
    .sort((a, b) => a.effectiveCost - b.effectiveCost || a.monthlyInstallment - b.monthlyInstallment);

  const declines = results.filter((r): r is Decline => r.type === 'declined')
    .map(d => ({ lender: d.displayName, reason: d.reason }));

  // ── 6. Persist quote request for audit trail ──────────────────────────
  const requestId = crypto.randomUUID();
  supabaseAdmin.from('quote_requests').insert({
    id:                 requestId,
    reference:          `MNT-${Date.now()}`,
    consumer_email:     String(mintUserId ?? 'unknown@mymint.co.za'),
    consumer_name:      String(mintUserId ?? 'MINT User'),
    mint_user_id:       mintUserIdStr,
    consumer_id_number: idNumber ? String(idNumber) : null,
    consumer_mobile:    phone ? String(phone) : null,
    purpose:            purpose ? String(purpose) : null,
    requested_amount:   Number(requestedAmount),
    requested_term:     Number(termMonths),
    credit_profile:     profile,
    credit_pulled_at:   new Date().toISOString(),
    status:             offers.length > 0 ? 'complete' : 'complete',
    lenders_evaluated:  policies.length,
    offers_count:       offers.length,
  }).then(({ error }) => {
    if (error) console.warn('[marketplace/evaluate] audit persist failed', error.message);
  });

  // Persist a credit-score-history row so a borrower's score can be plotted
  // over time (see migration 022) — mint-admin previously had no history
  // concept at all, only the single current score on this request. Only
  // recorded on a genuinely fresh evaluation (this code path never runs on
  // the duplicate-request reuse path above), and only when we have at least
  // one identifier to key it by — a history row with neither ID number nor
  // MINT user id can never be matched back to this borrower later.
  if (mintUserIdStr || idNumber) {
    supabaseAdmin.from('credit_score_history').insert({
      request_id:                    requestId,
      mint_user_id:                  mintUserIdStr,
      consumer_id_number:            idNumber ? String(idNumber) : null,
      credit_score:                  profile.creditScore,
      monthly_income:                profile.monthlyIncome,
      existing_monthly_obligations:  profile.existingMonthlyObligations,
    }).then(({ error }) => {
      if (error) console.warn('[marketplace/evaluate] credit_score_history persist failed', error.message);
    });
  }

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
        expires_at:          new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString(),
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
