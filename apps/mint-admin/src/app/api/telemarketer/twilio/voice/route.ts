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

  const twiml = new VoiceResponse();

  if (!to) {
    twiml.say('No destination number provided.');
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const statusCallback = `${process.env.NEXT_PUBLIC_APP_URL}/api/telemarketer/twilio/status`;
  const recordingCallback = `${process.env.NEXT_PUBLIC_APP_URL}/api/telemarketer/twilio/recording`;

  const dial = twiml.dial({
    callerId,
    record: 'record-from-answer',
    recordingStatusCallback: recordingCallback,
    recordingStatusCallbackMethod: 'POST',
    action: statusCallback,
    method: 'POST',
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
