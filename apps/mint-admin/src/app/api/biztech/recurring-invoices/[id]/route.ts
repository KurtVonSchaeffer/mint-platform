import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { description, items, day_of_month, active } = body;

  const patch: Record<string, unknown> = {};
  if (description !== undefined) patch.description = description;
  if (items !== undefined) patch.items = items;
  if (day_of_month !== undefined) patch.day_of_month = day_of_month;
  if (active !== undefined) patch.active = active;

  const { data, error } = await supabaseAdmin
    .from('biztech_recurring_invoices')
    .update(patch)
    .eq('id', id)
    .select('*, biztech_clients(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurring: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_recurring_invoices')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
