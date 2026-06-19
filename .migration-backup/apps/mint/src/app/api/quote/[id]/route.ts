import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/quote/[id]
 *
 * Polling endpoint. Returns:
 *   { status: 'pending' }                         — still running
 *   { status: 'complete', offers: [...], declines: [...] }
 *   { status: 'error', message: '...' }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: request, error } = await db
    .from('quote_requests')
    .select('id, status, error_message, lenders_evaluated, offers_count, requested_amount, requested_term, consumer_name, business_name, created_at')
    .eq('id', id)
    .single();

  if (error || !request) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (request.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }

  if (request.status === 'error') {
    return NextResponse.json({ status: 'error', message: request.error_message });
  }

  // Fetch offers (excludes raw credit_profile — never sent to client)
  const { data: offerRows } = await db
    .from('quote_offers')
    .select(`
      id, status, decision_reason,
      offered_amount, offered_rate_pct, offered_term_months,
      monthly_installment, total_repayment, initiation_fee,
      clients!inner ( name ),
      lender_policies ( display_name, logo_url, tagline, avg_turnaround_days )
    `)
    .eq('request_id', id)
    .order('monthly_installment', { ascending: true });

  const offers  = (offerRows ?? []).filter((r) => r.status === 'offered');
  const declines = (offerRows ?? []).filter((r) => r.status === 'declined');

  return NextResponse.json({
    status:  'complete',
    meta: {
      requestedAmount: request.requested_amount,
      requestedTerm:   request.requested_term,
      consumerName:    request.consumer_name,
      businessName:    request.business_name,
      lendersChecked:  request.lenders_evaluated,
      createdAt:       request.created_at,
    },
    offers:   offers.map(mapOffer),
    declines: declines.map(mapDecline),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(r: any) {
  const policy = Array.isArray(r.lender_policies) ? r.lender_policies[0] : r.lender_policies;
  return {
    id:                  r.id,
    displayName:         policy?.display_name ?? r.clients?.name,
    logoUrl:             policy?.logo_url     ?? null,
    tagline:             policy?.tagline      ?? null,
    avgTurnaroundDays:   policy?.avg_turnaround_days ?? 2,
    offeredAmount:       r.offered_amount,
    offeredRatePct:      r.offered_rate_pct,
    offeredTermMonths:   r.offered_term_months,
    monthlyInstallment:  r.monthly_installment,
    totalRepayment:      r.total_repayment,
    initiationFee:       r.initiation_fee,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDecline(r: any) {
  const policy = Array.isArray(r.lender_policies) ? r.lender_policies[0] : r.lender_policies;
  return {
    displayName: policy?.display_name ?? r.clients?.name,
    reason:      r.decision_reason,
  };
}
