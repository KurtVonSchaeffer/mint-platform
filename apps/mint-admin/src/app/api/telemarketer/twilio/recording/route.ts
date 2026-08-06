import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Twilio posts here when a recording is ready. We store the URL.
export async function POST(req: NextRequest) {
  const body   = await req.text();
  const params = new URLSearchParams(body);

  const callSid      = params.get('CallSid') ?? '';
  const recordingUrl = params.get('RecordingUrl');

  if (!callSid || !recordingUrl) return new NextResponse('ok');

  await supabaseAdmin
    .from('call_logs')
    .update({ recording_url: `${recordingUrl}.mp3` })
    .eq('twilio_call_sid', callSid);

  return new NextResponse('ok');
}
