import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/invoices — list invoices with client name + line items */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      id, reference, type, status,
      subtotal_cents, vat_cents, total_cents,
      period_start, period_end,
      issued_at, due_at, paid_at, void_at,
      notes,
      clients(id, name, slug),
      invoice_line_items(id, description, quantity, unit_price_cents, total_cents, service)
    `)
    .order('issued_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    console.error('[invoices] list failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: data ?? [] });
}
