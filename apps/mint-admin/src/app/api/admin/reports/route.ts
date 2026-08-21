import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Emails excluded from all reports (test accounts)
const TEST_EMAILS = (process.env.REPORT_EXCLUDE_EMAILS ?? 'wade')
  .toLowerCase().split(',').map(e => e.trim());

const FUNNEL_STAGES = [
  { key: 'new',        label: 'New / Attempting', statuses: ['New Lead', 'Attempted Contact', 'Pending', 'Unreachable'] },
  { key: 'contacted',  label: 'Contacted',         statuses: ['Contacted', 'Call Again', 'Call Back'] },
  { key: 'interested', label: 'Interested',        statuses: ['Interested'] },
  { key: 'demo',       label: 'Demo',              statuses: ['Demo Scheduled', 'Demo Completed', 'Demo Booked'] },
  { key: 'proposal',   label: 'Proposal',          statuses: ['Proposal Requested', 'Proposal Sent', 'Quoted', 'Negotiation'] },
  { key: 'won',        label: 'Won',               statuses: ['Won', 'Converted'] },
  { key: 'lost',       label: 'Lost / Dead',       statuses: ['Lost', 'Not Interested', 'Other'] },
];

const SOURCE_LABELS: Record<string, string> = {
  'marketing-site': 'algolend.co.za',
  referral:         'Referral',
  manual:           'Manual Entry',
};

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role as string | undefined;
  return role === 'admin' || role === 'super_admin' || role === 'manager';
}

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1));
  const end   = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}

async function fetchLeadsInPeriod(start: Date, end: Date) {
  const PAGE = 1000;
  const all: { tm_status: string | null; source: string | null; assigned_to: string | null }[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('tm_status, source, assigned_to')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

async function fetchCallsInPeriod(start: Date, end: Date) {
  const PAGE = 1000;
  const all: { agent_id: string; outcome: string; duration: string | null }[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from('call_logs')
      .select('agent_id, outcome, duration')
      .gte('called_at', start.toISOString())
      .lt('called_at', end.toISOString())
      .neq('outcome', 'Other')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

function buildFunnel(leads: { tm_status: string | null }[]) {
  const total = leads.length;
  return FUNNEL_STAGES.map(stage => {
    const count = leads.filter(l => stage.statuses.includes(l.tm_status ?? 'New Lead')).length;
    return { key: stage.key, label: stage.label, count, pct: total > 0 ? Math.round(count / total * 100) : 0 };
  });
}

function buildSources(leads: { source: string | null }[]) {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const s = l.source ?? 'manual';
    map[s] = (map[s] ?? 0) + 1;
  }
  return Object.entries(map).map(([source, count]) => ({
    source, label: SOURCE_LABELS[source] ?? source, count,
  })).sort((a, b) => b.count - a.count);
}

function buildCallOutcomes(calls: { outcome: string }[]) {
  const map: Record<string, number> = {};
  for (const c of calls) map[c.outcome] = (map[c.outcome] ?? 0) + 1;
  return Object.entries(map)
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse ?month=YYYY-MM, default to current month
  const param = req.nextUrl.searchParams.get('month');
  const now   = new Date();
  let year  = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed

  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number);
    year  = y;
    month = m - 1;
  }

  const thisMonth = monthBounds(year, month);
  const lastMonth = monthBounds(year, month - 1);

  const usersRes = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const CALLER_ROLES = ['telemarketer', 'manager'];
  const agents = (usersRes.data?.users ?? [])
    .filter(u => CALLER_ROLES.includes((u.user_metadata?.role as string | undefined) ?? ''))
    .filter(u => !TEST_EMAILS.some(ex => (u.email ?? '').toLowerCase().includes(ex)));

  const agentIds = new Set(agents.map(a => a.id));

  const [thisLeads, lastLeads, thisCalls, lastCalls] = await Promise.all([
    fetchLeadsInPeriod(thisMonth.start, thisMonth.end),
    fetchLeadsInPeriod(lastMonth.start, lastMonth.end),
    fetchCallsInPeriod(thisMonth.start, thisMonth.end),
    fetchCallsInPeriod(lastMonth.start, lastMonth.end),
  ]);

  // Filter to real agents only
  const thisCallsReal = thisCalls.filter(c => agentIds.has(c.agent_id));
  const lastCallsReal = lastCalls.filter(c => agentIds.has(c.agent_id));

  function kpis(leads: typeof thisLeads, calls: typeof thisCallsReal) {
    const won = leads.filter(l => ['Won', 'Converted'].includes(l.tm_status ?? '')).length;
    return {
      leadsTotal: leads.length,
      callsTotal: calls.length,
      won,
      convRate:   leads.length > 0 ? Math.round(won / leads.length * 1000) / 10 : 0,
      contacted:  leads.filter(l => !['New Lead', 'Attempted Contact', 'Pending', 'Unreachable', null].includes(l.tm_status)).length,
    };
  }

  // Per-agent breakdown
  const agentReport = agents.map(u => {
    const name = (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Unknown';
    const myCalls = thisCallsReal.filter(c => c.agent_id === u.id);
    const myLeads = thisLeads.filter(l => l.assigned_to === u.id);
    const won     = myLeads.filter(l => ['Won', 'Converted'].includes(l.tm_status ?? '')).length;
    return {
      id:         u.id,
      name,
      email:      u.email ?? '',
      callsThisMonth: myCalls.length,
      leadsAssigned:  myLeads.length,
      won,
      convRate:   myLeads.length > 0 ? Math.round(won / myLeads.length * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.callsThisMonth - a.callsThisMonth);

  const monthLabel = (y: number, m: number) => {
    return new Date(y, m).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
  };

  return NextResponse.json({
    thisMonth: {
      label:   monthLabel(year, month),
      kpis:    kpis(thisLeads, thisCallsReal),
      funnel:  buildFunnel(thisLeads),
      sources: buildSources(thisLeads),
      callOutcomes: buildCallOutcomes(thisCallsReal),
    },
    lastMonth: {
      label:   monthLabel(month - 1 < 0 ? year - 1 : year, month - 1 < 0 ? 11 : month - 1),
      kpis:    kpis(lastLeads, lastCallsReal),
      funnel:  buildFunnel(lastLeads),
      sources: buildSources(lastLeads),
      callOutcomes: buildCallOutcomes(lastCallsReal),
    },
    agents: agentReport,
  });
}
