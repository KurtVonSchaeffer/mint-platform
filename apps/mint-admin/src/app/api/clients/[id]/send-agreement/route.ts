import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://algolend.co.za';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, contact_email, contact_name')
    .eq('id', id)
    .single();

  if (error || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Find or create a lead for this client so we have an onboarding token
  let { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, onboarding_token')
    .eq('email', client.contact_email)
    .maybeSingle();

  if (!lead) {
    const { data: newLead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .insert({
        name:               client.contact_name ?? client.name,
        email:              client.contact_email,
        company:            client.name,
        source:             'manual',
        status:             'new',
        onboarding_status:  'started',
        onboarding_data:    {},
      })
      .select('id, onboarding_token')
      .single();

    if (leadErr || !newLead) return NextResponse.json({ error: 'Failed to create agreement link' }, { status: 500 });
    lead = newLead;
  }

  const link = `${BASE_URL}/sign/${lead.onboarding_token}`;

  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL ?? 'accounts@algolend.co.za',
    to:      client.contact_email,
    subject: `Service Agreement — ${client.name}`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#09090B">
        <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Hi ${client.contact_name ?? client.name},</h1>
        <p style="color:#52525B;margin-bottom:8px">
          Please review and sign your AlgoLend Service Agreement by clicking the button below.
          It only takes a few minutes — you'll be able to read the full terms and sign digitally.
        </p>
        <p style="color:#52525B;margin-bottom:24px">
          Once signed, your agreement will be saved automatically and your account will be ready to activate.
        </p>
        <a href="${link}"
          style="display:inline-block;background:#7C3AED;color:#fff;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px">
          Review &amp; sign agreement →
        </a>
        <p style="color:#A1A1AA;font-size:12px;margin-top:32px">
          If you did not expect this email, please contact us at accounts@algolend.co.za
        </p>
        <hr style="border:none;border-top:1px solid #E4E4E7;margin:24px 0">
        <p style="color:#A1A1AA;font-size:12px">Mint Platforms (Pty) Ltd · accounts@algolend.co.za</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, link });
}
