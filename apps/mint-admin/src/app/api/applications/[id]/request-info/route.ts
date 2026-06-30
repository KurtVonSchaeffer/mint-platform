import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'accounts@algolend.co.za';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { message } = await req.json().catch(() => ({ message: '' }));

  const { data: lead, error: fetchErr } = await supabaseAdmin
    .from('leads')
    .select('name, email, company')
    .eq('id', id)
    .single();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const body = `
<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#09090B">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Hi ${lead.name},</h1>
  <p style="color:#52525B;margin-bottom:16px">
    Thank you for submitting your AlgoLend application for <strong>${lead.company}</strong>.
    Our team has reviewed your application and we need a bit more information before we can proceed.
  </p>
  ${message ? `<div style="background:#F4F4F5;border-left:3px solid #7C3AED;padding:14px 16px;border-radius:6px;margin-bottom:16px;color:#3F3F46;font-size:14px;line-height:1.6">${message.replace(/\n/g, '<br>')}</div>` : ''}
  <p style="color:#52525B;margin-bottom:24px">
    Please reply to this email with the requested information and we'll continue processing your application.
  </p>
  <hr style="border:none;border-top:1px solid #E4E4E7;margin:24px 0">
  <p style="color:#A1A1AA;font-size:12px">
    AlgoLend · A product of MINT Platforms (Pty) Ltd · accounts@algolend.co.za
  </p>
</div>`;

  if (resend) {
    await resend.emails.send({
      from:    FROM,
      to:      lead.email,
      subject: `Your AlgoLend application — additional information required`,
      html:    body,
    });
  } else {
    console.log('[request-info] email (no RESEND_API_KEY):', lead.email, message);
  }

  await supabaseAdmin
    .from('leads')
    .update({ onboarding_status: 'info_requested' })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
