import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/clients/[id]/users — list all profiles for a client */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, contact_number, created_at, updated_at')
    .eq('client_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

/** POST /api/clients/[id]/users — invite a new user to a client */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { email: string; full_name?: string; role?: string; password?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, full_name, role = 'loan_officer', password } = body;
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 422 });

  const ASSIGNABLE_ROLES = ['loan_officer', 'admin', 'viewer'];
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` },
      { status: 422 },
    );
  }

  // Verify client exists
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Create Supabase auth user — the signup trigger auto-creates the profile row
  const authPayload: Record<string, unknown> = {
    email,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? email.split('@')[0], role, client_id: id },
  };
  if (password) authPayload.password = password;

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser(
    authPayload as Parameters<typeof supabaseAdmin.auth.admin.createUser>[0],
  );

  if (authErr) {
    const isDup = authErr.message?.toLowerCase().includes('already');
    return NextResponse.json({ error: authErr.message }, { status: isDup ? 409 : 500 });
  }

  // If no password set, send invite link so user can set their own
  if (!password) {
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name ?? email.split('@')[0], role, client_id: id },
    }).catch(() => {});
  }

  return NextResponse.json({ user: authUser.user }, { status: 201 });
}
