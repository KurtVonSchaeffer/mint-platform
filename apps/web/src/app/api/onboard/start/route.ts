import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://algolend.co.za';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const name    = String(body.name    ?? '').trim();
  const email   = String(body.email   ?? '').trim();
  const company = String(body.company ?? '').trim();
  const phone   = String(body.phone   ?? '').trim() || null;
  const ncr     = String(body.ncr     ?? '').trim() || null;

  if (!name || !email || !company) {
    return NextResponse.json({ error: 'name, email, and company are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Create (or find existing) lead with a unique onboarding token
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      name,
      email,
      company,
      source:             'marketing-site',
      status:             'new',
      onboarding_status:  'started',
      onboarding_data:    { phone, ncr_number: ncr },
    })
    .select('id, onboarding_token')
    .single();

  if (error) {
    console.error('[onboard/start]', error.message);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }

  // direct=true: skip email, return token so the client can continue the wizard in-page
  const direct = body.direct === true;

  if (!direct) {
    const link = `${BASE_URL}/onboard/${lead.onboarding_token}`;
    await sendEmail(
      email,
      'Complete your AlgoLend application',
      `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#09090B">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Hi ${name},</h1>
        <p style="color:#52525B;margin-bottom:24px">
          Thanks for applying to AlgoLend. Click the button below to complete your application —
          you'll be able to fill in your company details and upload your compliance documents.
          It takes about 5 minutes.
        </p>
        <a href="${link}"
          style="display:inline-block;background:#7C3AED;color:#fff;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px">
          Complete my application →
        </a>
        <p style="color:#A1A1AA;font-size:12px;margin-top:32px">
          This link is unique to your application and expires in 7 days.<br>
          If you didn't apply, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #E4E4E7;margin:24px 0">
        <p style="color:#A1A1AA;font-size:12px">
          AlgoLend · A product of MINT Platforms (Pty) Ltd · accounts@algolend.co.za
        </p>
      </div>
      `,
    );
  }

  return NextResponse.json({
    ok: true,
    ...(direct ? { token: lead.onboarding_token, leadId: lead.id } : {}),
  });
}
