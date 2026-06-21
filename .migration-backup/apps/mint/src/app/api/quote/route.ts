import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/supabase';
import { runAggregator, generateReference } from '@/lib/aggregator';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/quote
 *
 * Creates a quote request and fires the aggregator in the background.
 * Returns immediately with { requestId, reference } so the client can
 * start polling GET /api/quote/[id].
 *
 * Body:
 *   consumerName, consumerIdNumber, consumerEmail, consumerMobile?,
 *   businessName?, yearsInOperation?,
 *   requestedAmount, requestedTerm, purpose?
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const {
    consumerName, consumerIdNumber, consumerEmail, consumerMobile,
    businessName, yearsInOperation,
    requestedAmount, requestedTerm, purpose,
  } = body as Record<string, string | number | undefined>;

  if (!consumerName || !consumerIdNumber || !consumerEmail) {
    return NextResponse.json({ error: 'consumerName, consumerIdNumber and consumerEmail are required' }, { status: 422 });
  }
  if (!requestedAmount || !requestedTerm) {
    return NextResponse.json({ error: 'requestedAmount and requestedTerm are required' }, { status: 422 });
  }

  const reference = generateReference();

  const { data, error } = await db
    .from('quote_requests')
    .insert({
      reference,
      consumer_name:      String(consumerName),
      consumer_id_number: String(consumerIdNumber),
      consumer_email:     String(consumerEmail).toLowerCase(),
      consumer_mobile:    consumerMobile ? String(consumerMobile) : null,
      business_name:      businessName   ? String(businessName)   : null,
      years_in_operation: yearsInOperation ? Number(yearsInOperation) : null,
      requested_amount:   Number(requestedAmount),
      requested_term:     Number(requestedTerm),
      purpose:            purpose ? String(purpose) : null,
      status:             'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[api/quote]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Run aggregator after response is sent — client polls for completion
  after(() => runAggregator({
    requestId:        data.id,
    consumerName:     String(consumerName),
    consumerIdNumber: String(consumerIdNumber),
    consumerMobile:   consumerMobile ? String(consumerMobile) : undefined,
    requestedAmount:  Number(requestedAmount),
    requestedTerm:    Number(requestedTerm),
    yearsInOperation: yearsInOperation ? Number(yearsInOperation) : 0,
  }));

  return NextResponse.json({ requestId: data.id, reference }, { status: 201 });
}
