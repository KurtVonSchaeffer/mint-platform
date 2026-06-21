import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    .select('id, onboarding_status')
    .eq('onboarding_token', token)
    .single();

  if (!lead) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  if (lead.onboarding_status === 'complete') {
    return NextResponse.json({ error: 'Application already submitted' }, { status: 409 });
  }

  const { error } = await supabase
    .from('leads')
    .update({
      name:              String(body.name    ?? '').trim() || undefined,
      company:           String(body.company ?? '').trim() || undefined,
      onboarding_status: 'complete',
      onboarding_data: {
        legal_name:          body.legal_name,
        phone:               body.phone,
        ncr_number:          body.ncr_number,
        directors:           body.directors,
        agreement_accepted:  body.agreement_accepted ?? false,
        agreement_signature: body.agreement_signature ?? null,
        agreement_signed_at: body.agreement_signed_at ?? null,
      },
    })
    .eq('id', lead.id);

  if (error) {
    console.error('[onboard/submit]', error.message);
    return NextResponse.json({ error: 'Failed to save application' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
