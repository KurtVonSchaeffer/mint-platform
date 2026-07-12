import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function nextInvoiceReference(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from('biztech_invoices')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);
  return `BI-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('biztech_quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 404 });

  if (quote.status !== 'accepted') {
    return NextResponse.json({ error: 'Only accepted quotes can be converted to an invoice' }, { status: 422 });
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('biztech_quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  const reference = await nextInvoiceReference();

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('biztech_invoices')
    .insert({
      reference,
      client_id: quote.client_id,
      quote_id: quote.id,
      subtotal_cents: quote.subtotal_cents,
      vat_cents: quote.vat_cents,
      total_cents: quote.total_cents,
      notes: quote.notes,
    })
    .select()
    .single();

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });

  const { error: itemsInsertError } = await supabaseAdmin
    .from('biztech_invoice_items')
    .insert((items ?? []).map(i => ({
      invoice_id: invoice.id,
      description: i.description,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
      total_cents: i.total_cents,
      sort_order: i.sort_order,
    })));

  if (itemsInsertError) return NextResponse.json({ error: itemsInsertError.message }, { status: 500 });
  return NextResponse.json({ invoice }, { status: 201 });
}
