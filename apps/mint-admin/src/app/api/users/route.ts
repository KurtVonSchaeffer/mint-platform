import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/users — list all Supabase auth users */
export async function GET() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: users.map(u => ({
      id:         u.id,
      email:      u.email,
      name:       u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'Unknown',
      role:       u.user_metadata?.role ?? 'super_admin',
      createdAt:  u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      confirmed:  !!u.email_confirmed_at,
    })),
  });
}

/** POST /api/users — invite a new user by email */
export async function POST(req: NextRequest) {
  const { email, name, role = 'super_admin' } = await req.json() as {
    email: string; name?: string; role?: string;
  };

  if (!email) return NextResponse.json({ error: 'email required' }, { status: 422 });

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name ?? email.split('@')[0], role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data.user }, { status: 201 });
}
