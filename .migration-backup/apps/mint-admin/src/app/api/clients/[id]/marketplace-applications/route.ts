import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/clients/[id]/marketplace-applications
 *  Returns all marketplace applications (accepted quote_offers) for a lender client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const { data, error } = await supabaseAdmin
    .from('quote_offers')
    .select(`
      id, status, offered_amount, offered_rate_pct, offered_term_months,
      monthly_installment, total_repayment, initiation_fee, accepted_at, created_at,
      quote_requests (
        id, reference, requested_amount, requested_term,
        consumer_email, consumer_name, credit_profile, status, created_at
      )
    `)
    .eq('client_id', clientId)
    .in('status', ['accepted', 'lender_approved', 'lender_declined', 'disbursed'])
    .order('accepted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ applications: data ?? [] });
}
