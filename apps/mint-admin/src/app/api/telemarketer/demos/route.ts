import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, demoConfirmationEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const leadId  = searchParams.get('lead_id');
  const agentId = searchParams.get('agent_id');

  let query = supabaseAdmin
    .from('demos')
    .select('*')
    .order('demo_date', { ascending: true });

  if (leadId)  query = query.eq('lead_id',  leadId);
  if (agentId) query = query.eq('agent_id', agentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ demos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    lead_id: string;
    agent_id: string;
    demo_date: string;
    demo_time?: string;
    presenter?: string;
    meeting_link?: string;
    platform?: string;
    notes?: string;
  };

  if (!body.lead_id || !body.agent_id || !body.demo_date) {
    return NextResponse.json({ error: 'lead_id, agent_id, demo_date are required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('demos')
    .insert({
      lead_id:      body.lead_id,
      agent_id:     body.agent_id,
      demo_date:    body.demo_date,
      demo_time:    body.demo_time    ?? null,
      presenter:    body.presenter    ?? null,
      meeting_link: body.meeting_link ?? null,
      platform:     body.platform     ?? 'Google Meet',
      notes:        body.notes        ?? null,
      status:       'Scheduled',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation email to the lead — fire-and-forget
  ;(async () => {
    const { data: lead } = await supabaseAdmin
      .from('leads').select('name, company, email').eq('id', body.lead_id).single();
    if (!lead?.email) return;
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(body.agent_id);
    if (!user?.email) return;
    const agentName = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0];
    await sendEmail({
      to:      lead.email,
      subject: `Your AlgoLend demo is confirmed — ${new Date(body.demo_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}`,
      html:    demoConfirmationEmail({
        leadName:    lead.name,
        company:     lead.company ?? '',
        agentName,
        agentEmail:  user.email,
        demoDate:    body.demo_date,
        demoTime:    body.demo_time    ?? null,
        platform:    body.platform     ?? 'Google Meet',
        meetingLink: body.meeting_link ?? null,
      }),
    });
  })().catch(() => {});

  return NextResponse.json({ demo: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; status?: string; outcome?: string; notes?: string };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 422 });

  const update: Record<string, unknown> = {};
  if (body.status  !== undefined) update.status  = body.status;
  if (body.outcome !== undefined) update.outcome = body.outcome;
  if (body.notes   !== undefined) update.notes   = body.notes;

  const { data, error } = await supabaseAdmin
    .from('demos')
    .update(update)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ demo: data });
}
