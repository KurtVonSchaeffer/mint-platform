import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientSupabase } from '@/lib/client-db';

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
        id, reference, consumer_email, consumer_name,
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

  // Push a loan_application into the lender's own Supabase database (fire-and-forget).
  // This is what makes the application appear in the lender's AlgoLend dashboard.
  const qr = Array.isArray(offerRow.quote_requests)
    ? offerRow.quote_requests[0]
    : offerRow.quote_requests;

  if (qr) {
    const appRef = `MINT-${requestId.slice(0, 8).toUpperCase()}`;
    getClientSupabase(lenderId).then(async (clientDb) => {
      if (!clientDb) {
        console.warn(`[marketplace/offers] no Supabase credentials for lender=${lenderId} — skipping loan_application insert`);
        return;
      }

      // Upsert a borrower profile so the application has a borrower_id
      const borrowerId = crypto.randomUUID();
      await clientDb.from('profiles').upsert({
        id:        borrowerId,
        full_name: qr.consumer_name ?? qr.consumer_email,
        email:     qr.consumer_email,
        role:      'borrower',
        client_id: lenderId,
      }, { onConflict: 'email', ignoreDuplicates: true });

      // Resolve actual borrower id (may already exist on email conflict)
      const { data: existingProfile } = await clientDb
        .from('profiles')
        .select('id')
        .eq('email', qr.consumer_email)
        .single();

      const { error } = await clientDb.from('loan_applications').insert({
        reference:     appRef,
        client_id:     lenderId,
        borrower_id:   existingProfile?.id ?? borrowerId,
        product:       'unsecured_personal_loan',
        amount:        offerRow.offered_amount,
        term_months:   offerRow.offered_term_months,
        interest_rate: offerRow.offered_rate_pct,
        purpose:       'Personal loan via MINT marketplace',
        status:        'submitted',
        submitted_at:  new Date().toISOString(),
        metadata: {
          mint_request_id:     requestId,
          mint_user_id:        mintUserId ?? null,
          monthly_installment: offerRow.monthly_installment,
          total_repayment:     offerRow.total_repayment,
          initiation_fee:      offerRow.initiation_fee,
          credit_score:        (qr.credit_profile as Record<string, unknown> | null)?.creditScore ?? null,
          source:              'mint_marketplace',
        },
      });

      if (error) console.warn(`[marketplace/offers] loan_application insert failed lender=${lenderId}:`, error.message);
      else console.log(`[marketplace/offers] loan_application pushed to lender DB ref=${appRef} lender=${lenderId}`);
    }).catch((err: unknown) => {
      console.error('[marketplace/offers] getClientSupabase error:', (err as Error).message);
    });
  }

  return NextResponse.json({
    ok: true,
    message: 'Offer accepted. The lender will be in touch within their stated turnaround time.',
    offer: {
      offeredAmount:      offerRow.offered_amount,
      offeredRatePct:     offerRow.offered_rate_pct,
      monthlyInstallment: offerRow.monthly_installment,
    },
  }, { status: 200, headers: CORS });
}
