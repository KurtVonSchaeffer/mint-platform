import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant  = AccessToken.VoiceGrant;

export async function POST(req: NextRequest) {
  const { agent_id, identity } = await req.json();
  if (!agent_id || !identity) {
    return NextResponse.json({ error: 'agent_id and identity required' }, { status: 422 });
  }

  const accountSid  = process.env.TWILIO_ACCOUNT_SID!;
  const apiKey      = process.env.TWILIO_API_KEY!;
  const apiSecret   = process.env.TWILIO_API_SECRET!;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity,
    ttl: 3600,
  });

  const grant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: false,
  });
  token.addGrant(grant);

  return NextResponse.json({ token: token.toJwt(), identity });
}
