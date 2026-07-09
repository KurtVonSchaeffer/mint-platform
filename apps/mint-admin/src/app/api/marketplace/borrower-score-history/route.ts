import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/borrower-score-history?requestId=<quote_requests.id>
 *
 * Returns every credit_score_history row for the same borrower as the given
 * quote request, ordered oldest→newest, so the admin UI can plot a trend.
 *
 * Identity is resolved via consumer_id_number (preferred — a stable
 * person-level identifier) or mint_user_id (fallback, when the ID number
 * wasn't captured on that request). See migration 022.
 */
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('requestId');
  if (!requestId) {
    return NextResponse.json({ error: 'requestId query param required' }, { status: 400 });
  }

  const { data: quoteRequest, error: qrErr } = await supabaseAdmin
    .from('quote_requests')
    .select('consumer_id_number, mint_user_id')
    .eq('id', requestId)
    .maybeSingle();

  if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 500 });
  if (!quoteRequest) return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });

  const { consumer_id_number: idNumber, mint_user_id: mintUserId } = quoteRequest;

  if (!idNumber && !mintUserId) {
    // Nothing to key a lookup by — this borrower has no identifier on
    // record, so there can be no history to find (see migration 022's
    // insert-time guard, which never writes a row without one either).
    return NextResponse.json({ history: [] });
  }

  let query = supabaseAdmin
    .from('credit_score_history')
    .select('credit_score, monthly_income, existing_monthly_obligations, evaluated_at')
    .order('evaluated_at', { ascending: true });

  // Match on whichever identifier(s) this borrower actually has — OR
  // semantics so a request with only one of the two fields still finds
  // history recorded under the other.
  const filters: string[] = [];
  if (idNumber)   filters.push(`consumer_id_number.eq.${idNumber}`);
  if (mintUserId) filters.push(`mint_user_id.eq.${mintUserId}`);
  query = query.or(filters.join(','));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ history: data ?? [] });
}
