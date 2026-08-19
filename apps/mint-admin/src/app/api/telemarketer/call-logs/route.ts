import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const leadId  = searchParams.get('lead_id');
  const agentId = searchParams.get('agent_id');
  const today   = searchParams.get('today') === 'true';
  const from    = searchParams.get('from'); // YYYY-MM-DD, inclusive
  const to      = searchParams.get('to');   // YYYY-MM-DD, inclusive

  let query = supabaseAdmin
    .from('call_logs')
    .select('*, leads(id, name, company, phone)')
    .order('called_at', { ascending: false });

  if (leadId)  query = query.eq('lead_id', leadId);
  if (agentId) query = query.eq('agent_id', agentId);
  if (today) {
    const todayStr = new Date().toISOString().split('T')[0];
    query = query.gte('called_at', `${todayStr}T00:00:00`);
  }
  if (from) query = query.gte('called_at', `${from}T00:00:00`);
  if (to)   query = query.lte('called_at', `${to}T23:59:59.999`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ call_logs: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lead_id, agent_id, outcome, duration, notes, twilio_call_sid } = body;

  if (!lead_id || !agent_id || !outcome) {
    return NextResponse.json({ error: 'lead_id, agent_id, outcome required' }, { status: 422 });
  }

  // If this outcome is for a Twilio SDK call, the /status webhook has likely
  // already auto-logged a row for it (crude guess: completed→Spoke,
  // anything else→No Answer). Update that row with the TM's real outcome
  // instead of inserting a second entry for the same call. Falls back to
  // insert if the webhook hasn't landed yet (or never fires, e.g. call
  // dropped before Twilio posts status).
  let data = null;
  let error = null;

  if (twilio_call_sid) {
    const upd = await supabaseAdmin
      .from('call_logs')
      .update({ outcome, notes: notes || null })
      .eq('twilio_call_sid', twilio_call_sid)
      .select()
      .maybeSingle();
    data = upd.data;
    error = upd.error;
  }

  if (!error && !data) {
    const ins = await supabaseAdmin
      .from('call_logs')
      .insert({ lead_id, agent_id, outcome, duration: duration || null, notes: notes || null, twilio_call_sid: twilio_call_sid || null })
      .select()
      .single();
    data = ins.data;
    error = ins.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-advance tm_status based on outcome so KPI buckets stay accurate
  const tmStatusUpdate: string | null =
    outcome === 'Called Back Later' ? 'Call Back'         :
    outcome === 'Not Interested'    ? 'Not Interested'    :
    outcome === 'No Answer'         ? 'Attempted Contact' : null;

  if (tmStatusUpdate) {
    await supabaseAdmin
      .from('leads')
      .update({ tm_status: tmStatusUpdate })
      .eq('id', lead_id);
  }

  return NextResponse.json({ call_log: data }, { status: 201 });
}
