import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Twilio posts here when a call ends. We log it to call_logs.
export async function POST(req: NextRequest) {
  const body   = await req.text();
  const params = new URLSearchParams(body);

  const callSid    = params.get('CallSid')    ?? '';
  const callStatus = params.get('CallStatus') ?? '';
  const duration   = params.get('CallDuration') ?? '0';
  const to         = params.get('To')         ?? '';

  // Map Twilio status to our outcome vocabulary
  const outcome =
    callStatus === 'completed' ? 'Spoke'     :
    callStatus === 'busy'      ? 'No Answer' :
    callStatus === 'no-answer' ? 'No Answer' :
    callStatus === 'failed'    ? 'No Answer' :
    callStatus === 'canceled'  ? 'No Answer' : 'No Answer';

  // agent_id is passed as a custom param from the browser SDK
  const agentId = params.get('agent_id') ?? params.get('From') ?? '';
  const leadId  = params.get('lead_id') ?? '';

  if (!leadId || !agentId) {
    // Not enough info to log — Twilio still needs a 200
    return new NextResponse('ok');
  }

  const durationSecs = parseInt(duration, 10);
  const mins = Math.floor(durationSecs / 60);
  const secs = durationSecs % 60;
  const durationFmt = `${mins}:${secs.toString().padStart(2, '0')}`;

  await supabaseAdmin.from('call_logs').insert({
    lead_id:       leadId,
    agent_id:      agentId,
    outcome,
    duration:      durationFmt,
    twilio_call_sid: callSid,
    notes:         `Twilio call to ${to}`,
  });

  return new NextResponse('ok');
}
