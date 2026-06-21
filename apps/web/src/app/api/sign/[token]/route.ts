import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const supabase = getSupabase();

  const { data: lead } = await supabase
    .from('leads')
    .select('id, onboarding_data')
    .eq('onboarding_token', token)
    .single();

  if (!lead) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });

  const existing = (lead.onboarding_data ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from('leads')
    .update({
      onboarding_data: {
        ...existing,
        agreement_accepted:  true,
        agreement_signature: body.agreement_signature,
        agreement_signed_at: body.agreement_signed_at ?? new Date().toISOString(),
      },
    })
    .eq('id', lead.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
