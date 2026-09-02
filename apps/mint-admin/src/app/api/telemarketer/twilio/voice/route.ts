import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Twilio calls this webhook when the browser SDK places a call.
// We dial the lead's number with recording enabled.
export async function POST(req: NextRequest) {
  const body     = await req.text();
  const params   = new URLSearchParams(body);
  const to       = params.get('To');
  const callerId = process.env.TWILIO_PHONE_NUMBER!;

  // CallSid on this request is the PARENT (browser) leg — the same SID the
  // recording callback later reports, and the same one the Voice JS SDK
  // exposes client-side via call.parameters.CallSid. The status callback
  // below fires on the CHILD (dialed) leg, which has a different CallSid
  // of its own and never forwards these custom params — so we carry
  // agent_id/lead_id/the parent CallSid through the callback URL's query
  // string instead of relying on Twilio to pass them through.
  const parentCallSid = params.get('CallSid') ?? '';
  const agentId = params.get('agent_id') ?? '';
  const leadId  = params.get('lead_id') ?? '';

  const twiml = new VoiceResponse();

  if (!to) {
    twiml.say('No destination number provided.');
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const callbackParams = new URLSearchParams({ agent_id: agentId, lead_id: leadId, parent_call_sid: parentCallSid });
  const statusCallback = `${process.env.NEXT_PUBLIC_APP_URL}/api/telemarketer/twilio/status?${callbackParams}`;
  const recordingCallback = `${process.env.NEXT_PUBLIC_APP_URL}/api/telemarketer/twilio/recording?${callbackParams}`;

  // No `action`/`method` here: the <Number> below already posts every status
  // event (including the terminal one) to `statusCallback`. Also pointing the
  // <Dial>'s own action callback at the same URL used to double-fire it per
  // call — and that action callback uses different param names (DialCallStatus,
  // not CallStatus), so /status/route.ts couldn't even read it correctly.
  const dial = twiml.dial({
    callerId,
    record: 'record-from-answer',
    recordingStatusCallback: recordingCallback,
    recordingStatusCallbackMethod: 'POST',
  });

  dial.number({
    statusCallback,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  }, to);

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
