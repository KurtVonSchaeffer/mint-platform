import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agent_id');
  const leadId  = searchParams.get('lead_id');

  let query = supabaseAdmin
    .from('follow_ups')
    .select('*, leads(name, company, phone)')
    .order('scheduled_at', { ascending: true });

  if (agentId) query = query.eq('agent_id', agentId);
  if (leadId)  query = query.eq('lead_id', leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ follow_ups: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lead_id, agent_id, follow_up_type, scheduled_at, note } = body;

  if (!lead_id || !agent_id || !scheduled_at) {
    return NextResponse.json({ error: 'lead_id, agent_id, scheduled_at required' }, { status: 422 });
  }

  // Save as next_follow_up on the lead too
  await supabaseAdmin.from('leads').update({ next_follow_up: scheduled_at }).eq('id', lead_id);

  const { data, error } = await supabaseAdmin
    .from('follow_ups')
    .insert({ lead_id, agent_id, follow_up_type: follow_up_type ?? 'Call Back', scheduled_at, note: note || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ follow_up: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 422 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = body.scheduled_at
    ? { scheduled_at: body.scheduled_at }
    : { completed: true };

  const { data, error } = await supabaseAdmin
    .from('follow_ups')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ follow_up: data });
}
