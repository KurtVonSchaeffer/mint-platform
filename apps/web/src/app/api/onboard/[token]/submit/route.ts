import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/agreement';
import { sendEmail } from '@/lib/email';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const supabase = getSupabase();

  // Verify token is valid
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, company, onboarding_status')
    .eq('onboarding_token', token)
    .single();

  if (!lead) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  if (lead.onboarding_status === 'complete') {
    return NextResponse.json({ error: 'Application already submitted' }, { status: 409 });
  }

  const agreementHash = createHash('sha256').update(AGREEMENT_TEXT, 'utf8').digest('hex');

  const { error } = await supabase
    .from('leads')
    .update({
      name:              String(body.name    ?? '').trim() || undefined,
      company:           String(body.company ?? '').trim() || undefined,
      onboarding_status: 'complete',
      onboarding_data: {
        legal_name:           body.legal_name,
        phone:                body.phone,
        ncr_number:           body.ncr_number,
        directors:            body.directors,
        agreement_accepted:   body.agreement_accepted ?? false,
        agreement_signature:  body.agreement_signature ?? null,
        agreement_signed_at:  body.agreement_signed_at ?? null,
        agreement_version:    AGREEMENT_VERSION,
        agreement_text_hash:  agreementHash,
      },
    })
    .eq('id', lead.id);

  if (error) {
    console.error('[onboard/submit]', error.message);
    return NextResponse.json({ error: 'Failed to save application' }, { status: 500 });
  }

  // Send confirmation email to applicant (use stored lead email, not body)
  const applicantEmail = lead.email ?? '';
  const applicantName  = String(body.name ?? lead.name ?? '').trim();
  const companyName    = String(body.company ?? lead.company ?? '').trim();
  if (applicantEmail) {
    await sendEmail(
      applicantEmail,
      'We\'ve received your AlgoLend application',
      `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#07070f;color:#e4e4e7;margin:0;padding:40px 24px">
<div style="max-width:560px;margin:0 auto">
  <img src="https://algolend.co.za/algolend-logo.svg" alt="AlgoLend" style="height:28px;margin-bottom:32px">
  <h1 style="font-size:22px;font-weight:700;color:#fafafa;margin:0 0 12px">Application received</h1>
  <p style="color:#a1a1aa;line-height:1.7;margin:0 0 20px">Hi ${applicantName || companyName},</p>
  <p style="color:#a1a1aa;line-height:1.7;margin:0 0 20px">
    Thank you for applying to join AlgoLend. We've received your application for
    <strong style="color:#e4e4e7">${companyName}</strong> and our team will review
    your documents within <strong style="color:#e4e4e7">1–2 business days</strong>.
  </p>
  <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin:0 0 24px">
    <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">What happens next</p>
    <ol style="color:#a1a1aa;line-height:1.8;margin:0;padding-left:20px;font-size:14px">
      <li>We verify your compliance documents</li>
      <li>Your account manager contacts you to confirm details</li>
      <li>Your AlgoLend lender dashboard goes live</li>
    </ol>
  </div>
  <p style="color:#a1a1aa;line-height:1.7;margin:0 0 32px;font-size:14px">
    Questions? Reply to this email or reach us at
    <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.
  </p>
  <p style="color:#3f3f46;font-size:12px;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin:0">
    AlgoLend · Powered by Mint Platforms
  </p>
</div>
</body></html>`,
    ).catch(err => console.error('[onboard/submit] email error:', err));
  }

  return NextResponse.json({ ok: true });
}
