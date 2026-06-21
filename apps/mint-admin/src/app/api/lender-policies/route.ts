import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/lender-policies — all policies joined with client name */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('lender_policies')
    .select(`
      id, client_id, display_name, logo_url, tagline, avg_turnaround_days,
      min_credit_score, max_dsr_pct, min_amount, max_amount,
      min_years_in_operation, require_id_verified, max_open_defaults,
      base_rate_pct, initiation_fee_pct, monthly_service_fee,
      rate_bands, active, created_at, updated_at,
      clients(id, name, slug, tier, status)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data ?? [] });
}

/** POST /api/lender-policies — create or upsert a lender policy */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, ...rest } = body;

  if (!client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('lender_policies')
    .upsert({ client_id, ...rest }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policy: data }, { status: 201 });
}
