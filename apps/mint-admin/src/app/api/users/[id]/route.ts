import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, userInviteEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/users/[id] — update role */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id }   = await params;
  const { role } = await req.json() as { role: string };
  const VALID    = ['super_admin', 'admin', 'finance', 'support'];
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

/** POST /api/users/[id] — send password reset OR resend invite email */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Fetch the user's full profile
  const { data: { user }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(id);
  if (fetchErr || !user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const adminUrl    = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';
  const isConfirmed = !!user.email_confirmed_at;

  // Generate a recovery link (works for both password reset and first-time setup)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type:    'recovery',
    email:   user.email,
    options: { redirectTo: `${adminUrl}/` },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resetLink = data.properties.action_link;
  const fullName  = user.user_metadata?.full_name ?? user.email.split('@')[0];
  const role      = user.user_metadata?.role ?? 'admin';

  let emailResult: { ok: boolean; error?: string };

  if (!isConfirmed) {
    emailResult = await sendEmail({
      to:      user.email,
      subject: `You've been invited to AlgoLend`,
      html:    userInviteEmail({
        fullName,
        email:      user.email,
        clientName: 'Mint Platforms',
        role,
        inviteUrl:  resetLink,
      }),
    });
  } else {
    emailResult = await sendEmail({
      to:      user.email,
      subject: 'Reset your AlgoLend password',
      html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:32px;text-align:center">
    <p style="color:#fff;font-size:22px;font-weight:700;margin:0">Reset your password</p>
    <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:6px 0 0">AlgoLend · Mint Platforms</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;margin:0 0 16px">Hi ${fullName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      A password reset was requested for your AlgoLend admin account (<strong>${user.email}</strong>).
      Click the button below to set a new password.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resetLink}" style="background:#7C3AED;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Reset password →
      </a>
    </div>
    <p style="color:#888;font-size:13px;text-align:center">This link expires in 24 hours. If you didn't request this, you can safely ignore it.</p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`,
    });
  }

  if (!emailResult.ok) {
    console.error('[invite/email]', emailResult.error);
  }

  return NextResponse.json({
    ok:         true,
    emailSent:  emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
    email:      user.email,
    resetLink,
    expiresAt:  data.properties.email_otp,
  });
}
