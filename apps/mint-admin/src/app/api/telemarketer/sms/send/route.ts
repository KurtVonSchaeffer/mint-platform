import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import twilio from 'twilio';
import { normalizePhoneSA } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAgentId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const agentId = await getAgentId();
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, body } = await req.json() as { to?: string; body?: string };
  if (!to || !body) return NextResponse.json({ error: 'to and body required' }, { status: 422 });

  const phone = normalizePhoneSA(to);

  // Use API key credentials (same as voice token route — no separate auth token needed)
  const client = twilio(
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { accountSid: process.env.TWILIO_ACCOUNT_SID! },
  );

  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to:   phone,
      body,
    });
    return NextResponse.json({ sid: msg.sid, status: msg.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'SMS send failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
