import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId } = await params;
  const body = await req.json();
  const { name, email, phone, role, is_primary } = body;

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email || null;
  if (phone !== undefined) patch.phone = phone || null;
  if (role !== undefined) patch.role = role || null;
  if (is_primary !== undefined) patch.is_primary = is_primary;

  const { data, error } = await supabaseAdmin
    .from('biztech_contacts')
    .update(patch)
    .eq('id', contactId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_contacts')
    .delete()
    .eq('id', contactId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
