import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return (user?.user_metadata?.role as string | undefined) ?? null;
}

export async function GET() {
  const role = await getRole();
  if (!role || !['super_admin', 'admin', 'finance', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Paginate leads — PostgREST caps at 1000 rows per request regardless of .limit()
  async function fetchAllLeads() {
    const size = 1000;
    let page = 0;
    const all: Record<string, unknown>[] = [];
    while (true) {
      const from = page * size;
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, assigned_to, tm_status, estimated_deal_value, deal_probability, expected_close_date, created_at')
        .range(from, from + size - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < size) break;
      page++;
    }
    return all;
  }

  const [usersRes, allLeads, callsRes, commissionsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    fetchAllLeads(),
    supabaseAdmin.from('call_logs').select('agent_id, called_at'),
    supabaseAdmin.from('commissions').select('agent_id, commission_amount, status'),
  ]);

  const telemarketers = (usersRes.data?.users ?? [])
    .filter(u => (u.user_metadata?.role as string | undefined) === 'telemarketer');

  const leads = allLeads;
  const calls = callsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  // Pipeline funnel — count + weighted value per stage
  const PIPELINE_STAGES = [
    'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
    'Demo Scheduled', 'Demo Completed', 'Proposal Requested', 'Proposal Sent',
    'Negotiation', 'Won', 'Lost', 'Other',
  ];
  const LEGACY_MAP: Record<string, string> = {
    Pending: 'New Lead', 'Call Again': 'Contacted', 'Call Back': 'Contacted',
    Unreachable: 'Attempted Contact', 'Demo Booked': 'Demo Scheduled',
    Quoted: 'Proposal Sent', Converted: 'Won', 'Not Interested': 'Lost',
    'Not Qualified': 'Other',
  };
  function normalizeStage(s: string | null) {
    if (!s) return 'New Lead';
    return LEGACY_MAP[s] ?? s;
  }

  const funnel = PIPELINE_STAGES.map(stage => {
    const stageLeads = leads.filter(l => normalizeStage(l.tm_status) === stage);
    const totalValue = stageLeads.reduce((sum, l) => sum + (Number(l.estimated_deal_value) || 0), 0);
    const weightedValue = stageLeads.reduce((sum, l) => {
      const prob = Number(l.deal_probability) || 0;
      return sum + (Number(l.estimated_deal_value) || 0) * (prob / 100);
    }, 0);
    return { stage, count: stageLeads.length, totalValue, weightedValue };
  });

  const totalPipeline = leads
    .filter(l => !['Won', 'Lost', 'Other', 'Not Qualified'].includes(normalizeStage(l.tm_status)))
    .reduce((s, l) => s + (Number(l.estimated_deal_value) || 0), 0);

  const weightedPipeline = leads
    .filter(l => !['Won', 'Lost', 'Other', 'Not Qualified'].includes(normalizeStage(l.tm_status)))
    .reduce((s, l) => s + (Number(l.estimated_deal_value) || 0) * ((Number(l.deal_probability) || 0) / 100), 0);

  // Per-agent aggregation
  const today = new Date().toISOString().split('T')[0];
  const COLORS = ['#A78BFA', '#34D399', '#60A5FA', '#FB923C', '#F472B6', '#FBBF24'];

  const agents = telemarketers.map((u, i) => {
    const name = (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Unknown';
    const agentLeads = leads.filter(l => l.assigned_to === u.id);
    const agentCalls = calls.filter(c => c.agent_id === u.id);
    const agentComms = commissions.filter(c => c.agent_id === u.id);

    const won = agentLeads.filter(l => normalizeStage(l.tm_status) === 'Won').length;
    const demosScheduled = agentLeads.filter(l =>
      ['Demo Scheduled', 'Demo Completed'].includes(normalizeStage(l.tm_status))
    ).length;
    const proposalsSent = agentLeads.filter(l =>
      ['Proposal Sent', 'Negotiation'].includes(normalizeStage(l.tm_status))
    ).length;
    const callsToday = agentCalls.filter(c => c.called_at?.startsWith(today)).length;
    const totalCalls = agentCalls.length;
    const convRate = agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0;
    const pipelineValue = agentLeads
      .filter(l => !['Won', 'Lost', 'Other', 'Not Qualified'].includes(normalizeStage(l.tm_status)))
      .reduce((s, l) => s + (Number(l.estimated_deal_value) || 0), 0);

    const commPending = agentComms
      .filter(c => ['Pending Collection', 'Pending Payroll'].includes(c.status ?? ''))
      .reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);
    const commPaid = agentComms
      .filter(c => c.status === 'Paid')
      .reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);

    return {
      id: u.id,
      name,
      email: u.email ?? '',
      initials: name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
      color: COLORS[i % COLORS.length],
      leadsTotal: agentLeads.length,
      won,
      demosScheduled,
      proposalsSent,
      callsToday,
      totalCalls,
      convRate,
      pipelineValue,
      commPending,
      commPaid,
    };
  }).sort((a, b) => b.won - a.won || b.leadsTotal - a.leadsTotal);

  return NextResponse.json({
    funnel,
    agents,
    summary: {
      totalLeads:      leads.length,
      totalWon:        leads.filter(l => normalizeStage(l.tm_status) === 'Won').length,
      totalLost:       leads.filter(l => normalizeStage(l.tm_status) === 'Lost').length,
      totalPipeline,
      weightedPipeline,
      activeTelemarketers: telemarketers.length,
    },
  });
}
