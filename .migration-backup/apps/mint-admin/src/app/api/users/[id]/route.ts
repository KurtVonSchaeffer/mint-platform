import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/users/[id] — update role */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id }  = await params;
  const { role } = await req.json() as { role: string };
  const VALID = ['super_admin', 'admin', 'finance', 'support'];
  if (!VALID.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 422 });
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { role },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/users/[id] — remove a user */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** POST /api/users/[id]/reset — send password reset email */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Get the user's email first
  const { data: { user }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(id);
  if (fetchErr || !user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Generate a password reset link
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type:  'recovery',
    email: user.email,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok:          true,
    email:       user.email,
    resetLink:   data.properties.action_link,
    expiresAt:   data.properties.email_otp,
  });
}
