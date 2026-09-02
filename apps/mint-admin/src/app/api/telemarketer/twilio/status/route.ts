import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Twilio posts here when a call ends. We log it to call_logs.
//
// This fires on the CHILD (dialed) call leg, which has its own CallSid
// distinct from the PARENT (browser) leg — and Twilio never forwards the
// custom agent_id/lead_id params from the original /voice request onto
// this callback. voice/route.ts carries them (plus the parent CallSid,
// which is what the recording callback and the client-side SDK both use)
// through the callback URL's query string instead.
//
// voice/route.ts registers this URL as the <Number>'s statusCallback for
// FOUR events (initiated, ringing, answered, completed) — only the last one
// is a real outcome. Ignore the rest, and dedupe on twilio_call_sid in case
// Twilio retries a delivery, so one phone call never produces more than one
// call_logs row.
const TERMINAL_STATUSES = new Set(['completed', 'busy', 'no-answer', 'failed', 'canceled']);

export async function POST(req: NextRequest) {
  const body   = await req.text();
  const params = new URLSearchParams(body);

  const callStatus = params.get('CallStatus') ?? '';
  const duration   = params.get('CallDuration') ?? '0';
  const to         = params.get('To')         ?? '';

  if (!TERMINAL_STATUSES.has(callStatus)) {
    // initiated / ringing / answered / in-progress — not an outcome yet
    return new NextResponse('ok');
  }

  const outcome = callStatus === 'completed' ? 'Spoke' : 'No Answer';

  const query = req.nextUrl.searchParams;
  const agentId      = query.get('agent_id') ?? '';
  const leadId       = query.get('lead_id') ?? '';
  const parentCallSid = query.get('parent_call_sid') ?? '';

  if (!leadId || !agentId) {
    // Not enough info to log — Twilio still needs a 200
    return new NextResponse('ok');
  }

  const durationSecs = parseInt(duration, 10);
  const mins = Math.floor(durationSecs / 60);
  const secs = durationSecs % 60;
  const durationFmt = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (parentCallSid) {
    const { data: existing } = await supabaseAdmin
      .from('call_logs')
      .select('id')
      .eq('twilio_call_sid', parentCallSid)
      .maybeSingle();
    if (existing) {
      // Already logged (Twilio retry, or another event for this same call) — skip.
      return new NextResponse('ok');
    }
  }

  await supabaseAdmin.from('call_logs').insert({
    lead_id:       leadId,
    agent_id:      agentId,
    outcome,
    duration:      durationFmt,
    twilio_call_sid: parentCallSid || null,
    notes:         `Twilio call to ${to}`,
  });

  return new NextResponse('ok');
}
