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
  const { name, description, unit_price_cents, unit, active } = body;

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (unit_price_cents !== undefined) patch.unit_price_cents = unit_price_cents;
  if (unit !== undefined) patch.unit = unit;
  if (active !== undefined) patch.active = active;

  const { data, error } = await supabaseAdmin
    .from('biztech_services')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_services')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
