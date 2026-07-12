import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: quote, error } = await supabaseAdmin
    .from('biztech_quotes')
    .select('*, biztech_clients(id, name)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('biztech_quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ quote, items });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { status, valid_until, notes } = body;

  const patch: Record<string, unknown> = {};
  if (status) {
    patch.status = status;
    if (status === 'sent') patch.sent_at = new Date().toISOString();
    if (status === 'accepted') patch.accepted_at = new Date().toISOString();
    if (status === 'declined') patch.declined_at = new Date().toISOString();
  }
  if (valid_until !== undefined) patch.valid_until = valid_until;
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabaseAdmin
    .from('biztech_quotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_quotes')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
