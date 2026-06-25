import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, userInviteEmail } from '@/lib/email';

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

// Roles the DB trigger's user_role enum understands. finance/support are
// admin-console-only display roles stored in user_metadata, not in the enum.
const PROFILE_ROLE_MAP: Record<string, string> = {
  super_admin: 'super_admin',
  admin:       'admin',
  finance:     'admin',
  support:     'admin',
};

/** POST /api/users — create user and return a one-time setup link (no SMTP required) */
export async function POST(req: NextRequest) {
  const { email, name, role = 'super_admin' } = await req.json() as {
    email: string; name?: string; role?: string;
  };

  if (!email) return NextResponse.json({ error: 'email required' }, { status: 422 });

  const fullName = name?.trim() || email.split('@')[0];

  // Step 1 — create user with role='super_admin' in metadata so the DB trigger
  // can satisfy the profiles_client_required constraint (super_admin allows
  // null client_id). finance/support are display-only roles not in the enum,
  // so we always bootstrap with super_admin and correct it in step 2.
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'super_admin' },
  });

  if (createErr) {
    console.error('[invite/create]', createErr.status, createErr.message);
    return NextResponse.json({ error: createErr.message }, { status: 500 });
  }

  const userId = created.user.id;

  // Step 2 — write the actual role into user_metadata (no trigger fires here)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { full_name: fullName, role },
  });

  // Step 3 — update the profiles row the trigger just created
  const profileRole = PROFILE_ROLE_MAP[role] ?? 'admin';
  await supabaseAdmin.from('profiles').update({ role: profileRole }).eq('id', userId);

  // Step 4 — generate a password-setup link the admin can copy and share
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:       'recovery',
    email,
    options:    { redirectTo: `${adminUrl}/` },
  });

  if (linkErr) {
    console.error('[invite/link]', linkErr.status, linkErr.message);
    return NextResponse.json({ user: created.user, setupLink: null }, { status: 201 });
  }

  const setupLink = link.properties.action_link;

  // Step 5 — email the invite link directly to the new user
  await sendEmail({
    to:      email,
    subject: `You've been invited to AlgoLend`,
    html:    userInviteEmail({
      fullName:   fullName,
      email:      email,
      clientName: 'Mint Platforms',
      role,
      inviteUrl:  setupLink,
    }),
  });

  return NextResponse.json({
    user:      created.user,
    setupLink,
  }, { status: 201 });
}
