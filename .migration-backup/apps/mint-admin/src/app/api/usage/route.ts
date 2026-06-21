import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/usage?month=2026-05 */
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  const [rollupRes, clientsRes] = await Promise.all([
    supabaseAdmin
      .from('usage_monthly_rollup')
      .select('client_id, service, total_quantity, total_cost_cents, month')
      .eq('month', `${month}-01`)
      .order('total_quantity', { ascending: false }),

    supabaseAdmin
      .from('clients')
      .select('id, name, slug, api_quota, status')
      .is('deleted_at', null)
      .in('status', ['active', 'trial']),
  ]);

  if (rollupRes.error) {
    console.error('[usage] rollup query failed', rollupRes.error);
    return NextResponse.json({ error: rollupRes.error.message }, { status: 500 });
  }

  // Available months — last 6
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const id = d.toISOString().slice(0, 7);
    return { id, label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) };
  });

  return NextResponse.json({
    rollup:  rollupRes.data ?? [],
    clients: clientsRes.data ?? [],
    months,
  });
}
