import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin':  process.env.MINT_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * GET /api/marketplace/lenders
 *
 * Public endpoint — no auth required.
 * Returns display info for all active lenders so the borrower portal
 * can show a "partnered lenders" section before running a full evaluation.
 *
 * Intentionally excludes rate logic (that stays server-side in /evaluate).
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('lender_policies')
    .select('display_name, logo_url, tagline, avg_turnaround_days, min_amount, max_amount, min_credit_score')
    .eq('active', true)
    .order('display_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });
  }

  return NextResponse.json({
    lenders: (data ?? []).map(l => ({
      name:              l.display_name,
      logoUrl:           l.logo_url ?? null,
      tagline:           l.tagline ?? null,
      avgTurnaroundDays: l.avg_turnaround_days ?? 2,
      minAmount:         l.min_amount,
      maxAmount:         l.max_amount,
      minCreditScore:    l.min_credit_score,
    })),
    count: (data ?? []).length,
  }, { status: 200, headers: CORS });
}
