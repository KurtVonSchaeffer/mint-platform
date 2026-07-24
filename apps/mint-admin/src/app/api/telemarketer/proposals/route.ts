import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const leadId  = searchParams.get('lead_id');
  const agentId = searchParams.get('agent_id');

  let query = supabaseAdmin
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadId)  query = query.eq('lead_id',  leadId);
  if (agentId) query = query.eq('agent_id', agentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    lead_id:      string;
    agent_id:     string;
    title:        string;
    amount_cents?: number | null;
    notes?:       string | null;
    expires_at?:  string | null;
    status?:      string;
  };

  if (!body.lead_id || !body.agent_id || !body.title?.trim()) {
    return NextResponse.json({ error: 'lead_id, agent_id, title are required' }, { status: 422 });
  }

  const status   = body.status ?? 'Draft';
  const isSent   = status === 'Sent';
  const sentAt   = isSent ? new Date().toISOString() : null;

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .insert({
      lead_id:      body.lead_id,
      agent_id:     body.agent_id,
      title:        body.title.trim(),
      amount_cents: body.amount_cents ?? null,
      notes:        body.notes        ?? null,
      expires_at:   body.expires_at   ?? null,
      status,
      sent_at: sentAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-advance lead status when sending a proposal
  if (isSent) {
    await supabaseAdmin
      .from('leads')
      .update({ tm_status: 'Proposal Sent' })
      .eq('id', body.lead_id)
      .in('tm_status', [
        'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
        'Demo Scheduled', 'Demo Completed', 'Proposal Requested',
        // Legacy equivalents
        'Pending', 'Call Again', 'Call Back', 'Unreachable', 'Demo Booked', 'Quoted',
      ]);
  }

  return NextResponse.json({ proposal: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as {
    id:       string;
    status?:  string;
    notes?:   string;
    sent_at?: string | null;
  };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 422 });

  const update: Record<string, unknown> = {};
  if (body.status  !== undefined) {
    update.status = body.status;
    if (body.status === 'Sent' && body.sent_at === undefined) {
      update.sent_at = new Date().toISOString();
    }
  }
  if (body.notes   !== undefined) update.notes = body.notes;
  if (body.sent_at !== undefined) update.sent_at = body.sent_at;

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .update(update)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposal: data });
}
