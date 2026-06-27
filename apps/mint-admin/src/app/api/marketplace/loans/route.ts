import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('quote_offers')
    .select(`
      id, request_id, client_id, accepted_at,
      offered_amount, offered_rate_pct, offered_term_months,
      monthly_installment, total_repayment, initiation_fee,
      quote_requests (
        reference, consumer_email, consumer_name,
        requested_amount, requested_term, credit_profile, created_at
      ),
      clients ( name, slug )
    `)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ loans: data ?? [] });
}
