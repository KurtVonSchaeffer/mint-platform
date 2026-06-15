import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** PATCH — set password or update role */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, userId } = await params;
  let body: { password?: string; role?: string; full_name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Verify user belongs to this client
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, client_id')
    .eq('id', userId)
    .eq('client_id', id)
    .is('deleted_at', null)
    .single();

  if (!profile) return NextResponse.json({ error: 'User not found for this client' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.password)   updates.password = body.password;
  if (body.role || body.full_name) {
    updates.user_metadata = {
      ...(body.full_name && { full_name: body.full_name }),
      ...(body.role      && { role: body.role }),
    };
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 422 });

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  // Keep profile table in sync
  const profilePatch: Record<string, unknown> = {};
  if (body.full_name) profilePatch.full_name = body.full_name;
  if (body.role)      profilePatch.role = body.role;
  if (Object.keys(profilePatch).length > 0) {
    await supabaseAdmin.from('profiles').update(profilePatch).eq('id', userId);
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — soft-delete the profile and disable the auth user */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, userId } = await params;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, client_id')
    .eq('id', userId)
    .eq('client_id', id)
    .is('deleted_at', null)
    .single();

  if (!profile) return NextResponse.json({ error: 'User not found for this client' }, { status: 404 });

  await Promise.all([
    supabaseAdmin.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', userId),
    supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' }),
  ]);

  return NextResponse.json({ ok: true });
}
