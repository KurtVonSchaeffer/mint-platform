import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { pushLoanToLender } from '@/lib/lender-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorised(req: NextRequest): boolean {
  const apiKey = process.env.MINT_API_KEY;
  if (!apiKey) return true;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${apiKey}`;
}

const CORS = {
  'Access-Control-Allow-Origin':  process.env.MINT_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/marketplace/offers
 *
 * Called by the borrower portal when a borrower selects an offer.
 * Records the acceptance against the quote request for audit + lender notification.
 *
 * Body: { requestId, lenderId, mintUserId? }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: CORS });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { requestId, lenderId, mintUserId } = body as Record<string, string>;

  if (!requestId || !lenderId) {
    return NextResponse.json({ error: 'Required: requestId, lenderId' }, { status: 422, headers: CORS });
  }

  // Verify the quote request exists and offer matches (join request for borrower details)
  const { data: offerRow } = await supabaseAdmin
    .from('quote_offers')
    .select(`
      id, status, offered_amount, offered_rate_pct, offered_term_months, monthly_installment,
      total_repayment, initiation_fee,
      quote_requests (
        id, reference, consumer_email, consumer_name, consumer_id_number, consumer_mobile, purpose,
        requested_amount, requested_term, credit_profile
      )
    `)
    .eq('request_id', requestId)
    .eq('client_id', lenderId)
    .single();

  if (!offerRow) {
    return NextResponse.json({ error: 'Offer not found for this request + lender' }, { status: 404, headers: CORS });
  }

  if (offerRow.status === 'accepted') {
    return NextResponse.json({ error: 'Offer already accepted' }, { status: 409, headers: CORS });
  }

  // Mark offer accepted, decline all others in this request
  const [acceptResult] = await Promise.all([
    supabaseAdmin
      .from('quote_offers')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', offerRow.id),
    supabaseAdmin
      .from('quote_offers')
      .update({ status: 'declined_by_borrower' })
      .eq('request_id', requestId)
      .neq('id', offerRow.id)
      .eq('status', 'offered'),
    supabaseAdmin
      .from('quote_requests')
      .update({ status: 'accepted', selected_lender_id: lenderId })
      .eq('id', requestId),
  ]);

  if (acceptResult.error) {
    return NextResponse.json({ error: acceptResult.error.message }, { status: 500, headers: CORS });
  }

  console.log(`[marketplace/offers] accepted requestId=${requestId} lenderId=${lenderId} user=${mintUserId ?? 'unknown'}`);

  // Push the accepted offer into the lender's own system via their scoped
  // integration API (not a direct Supabase connection — see lib/lender-api.ts).
  // This is what makes the application appear in the lender's dashboard.
  //
  // Awaited (not fire-and-forget): on Vercel, an un-awaited promise can be
  // killed once the response is sent, leaving lender_push_status stuck at
  // 'pending' forever with no error recorded. An accepted loan must reliably
  // reach the lender, so we accept the extra latency here.
  const qr = Array.isArray(offerRow.quote_requests)
    ? offerRow.quote_requests[0]
    : offerRow.quote_requests;

  let lenderPushResult: { ok: boolean; error?: string; applicationId?: string } | null = null;

  if (qr) {
    if (!qr.consumer_id_number) {
      console.warn(`[marketplace/offers] requestId=${requestId} has no consumer_id_number — lender push will likely be rejected`);
    }

    try {
      lenderPushResult = await pushLoanToLender(lenderId, {
        idNumber:   qr.consumer_id_number ?? '',
        fullName:   qr.consumer_name ?? qr.consumer_email,
        phone:      qr.consumer_mobile,
        email:      qr.consumer_email,
        amount:     offerRow.offered_amount,
        termMonths: offerRow.offered_term_months,
        purpose:    qr.purpose ?? 'Personal loan via MINT marketplace',
        source:     'mint_marketplace',
      });
    } catch (err: unknown) {
      lenderPushResult = { ok: false, error: (err as Error).message };
    }

    await supabaseAdmin
      .from('quote_offers')
      .update({
        lender_push_status:     lenderPushResult.ok ? 'sent' : 'failed',
        lender_push_error:      lenderPushResult.ok ? null : lenderPushResult.error,
        lender_application_ref: lenderPushResult.applicationId ?? null,
        lender_pushed_at:       new Date().toISOString(),
      })
      .eq('id', offerRow.id);

    if (lenderPushResult.ok) {
      console.log(`[marketplace/offers] pushed to lender=${lenderId} applicationId=${lenderPushResult.applicationId} mintRequestId=${requestId} mintUserId=${mintUserId ?? 'unknown'}`);
    } else {
      console.error(`[marketplace/offers] lender push FAILED lender=${lenderId} requestId=${requestId}:`, lenderPushResult.error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Offer accepted. The lender will be in touch within their stated turnaround time.',
    offer: {
      offeredAmount:      offerRow.offered_amount,
      offeredRatePct:     offerRow.offered_rate_pct,
      monthlyInstallment: offerRow.monthly_installment,
    },
    lenderSync: lenderPushResult
      ? { ok: lenderPushResult.ok, error: lenderPushResult.error ?? null }
      : null,
  }, { status: 200, headers: CORS });
}
