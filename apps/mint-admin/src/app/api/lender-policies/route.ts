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
      require_id_verified, max_open_defaults,
      base_rate_pct, initiation_fee_pct, monthly_service_fee,
      rate_bands, active, created_at, updated_at,
      clients(id, name, slug, tier, status)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data ?? [] });
}

// NCA Regulations: initiation fee may not exceed 15 % of the principal amount
const NCA_MAX_INITIATION_FEE_PCT = 15;
// NCA Regulations: monthly service fee cap (R69 + VAT = R79.35 at 15% VAT)
const NCA_MAX_MONTHLY_SERVICE_FEE = 80;

/** POST /api/lender-policies — create or upsert a lender policy */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, ...rest } = body;

  if (!client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 422 });
  }

  // NCA compliance gates
  if (rest.initiation_fee_pct !== undefined && Number(rest.initiation_fee_pct) > NCA_MAX_INITIATION_FEE_PCT) {
    return NextResponse.json(
      { error: `initiation_fee_pct may not exceed ${NCA_MAX_INITIATION_FEE_PCT}% (NCA Regulations)` },
      { status: 422 },
    );
  }
  if (rest.monthly_service_fee !== undefined && Number(rest.monthly_service_fee) > NCA_MAX_MONTHLY_SERVICE_FEE) {
    return NextResponse.json(
      { error: `monthly_service_fee may not exceed R${NCA_MAX_MONTHLY_SERVICE_FEE} (NCA Regulations)` },
      { status: 422 },
    );
  }
  if (rest.base_rate_pct !== undefined && Number(rest.base_rate_pct) < 0) {
    return NextResponse.json({ error: 'base_rate_pct must be non-negative' }, { status: 422 });
  }
  if (rest.max_dsr_pct !== undefined && (Number(rest.max_dsr_pct) <= 0 || Number(rest.max_dsr_pct) > 100)) {
    return NextResponse.json({ error: 'max_dsr_pct must be between 1 and 100' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('lender_policies')
    .upsert({ client_id, ...rest }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policy: data }, { status: 201 });
}
