import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/agreement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration — missing Supabase env vars' }, { status: 500 });
  }

  let body: { agreement_signature?: string; agreement_signed_at?: string; agreement_version?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.agreement_signature) {
    return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
  }

  // Compute hash of the canonical agreement text the server holds.
  // This gives an immutable audit record of what was agreed to at signing time,
  // independent of whatever version string the client sent.
  const agreementHash = createHash('sha256').update(AGREEMENT_TEXT, 'utf8').digest('hex');

  const supabase = getSupabase();

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id, onboarding_data')
    .eq('onboarding_token', token)
    .maybeSingle();

  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });
  if (!lead)   return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });

  const existing = (lead.onboarding_data ?? {}) as Record<string, unknown>;
  const signedAt = body.agreement_signed_at ?? new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('leads')
    .update({
      onboarding_status: 'completed',
      onboarding_data: {
        ...existing,
        agreement_accepted:   true,
        agreement_signature:  body.agreement_signature,
        agreement_signed_at:  signedAt,
        agreement_version:    AGREEMENT_VERSION,
        agreement_text_hash:  agreementHash,
      },
    })
    .eq('id', lead.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, signed_at: signedAt, agreement_version: AGREEMENT_VERSION });
}
