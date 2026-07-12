import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
}

function computeTotals(items: LineItem[]) {
  const subtotal_cents = items.reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0);
  const vat_cents = Math.round(subtotal_cents * 0.15);
  const total_cents = subtotal_cents + vat_cents;
  return { subtotal_cents, vat_cents, total_cents };
}

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from('biztech_quotes')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);
  return `BQ-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('biztech_quotes')
    .select('*, biztech_clients(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, valid_until, notes, items } = body as {
    client_id: string; valid_until?: string; notes?: string; items: LineItem[];
  };

  if (!client_id || !items?.length) {
    return NextResponse.json({ error: 'client_id and at least one item required' }, { status: 422 });
  }

  const totals = computeTotals(items);
  const reference = await nextReference();

  const { data: quote, error } = await supabaseAdmin
    .from('biztech_quotes')
    .insert({ reference, client_id, valid_until, notes, ...totals })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: itemsError } = await supabaseAdmin
    .from('biztech_quote_items')
    .insert(items.map((i, idx) => ({
      quote_id: quote.id,
      description: i.description,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
      total_cents: i.quantity * i.unit_price_cents,
      sort_order: idx,
    })));

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  return NextResponse.json({ quote }, { status: 201 });
}
