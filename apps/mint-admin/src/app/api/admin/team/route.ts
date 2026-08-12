import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  return ['super_admin', 'admin', 'finance', 'manager'].includes(role);
}

export async function GET() {
  if (!await isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SAST = UTC+2 — align "today", "week", "month" with the agent's calendar day
  const SA_OFFSET_MS = 2 * 60 * 60 * 1000;
  const nowSA = new Date(Date.now() + SA_OFFSET_MS);
  const todayStartUTC = new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), nowSA.getUTCDate()) - SA_OFFSET_MS);
  const today = new Date(todayStartUTC.getTime() + SA_OFFSET_MS).toISOString().slice(0, 10); // YYYY-MM-DD SAST
  const dow = nowSA.getUTCDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), nowSA.getUTCDate() + diffToMon) - SA_OFFSET_MS);
  const monthStart = new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), 1) - SA_OFFSET_MS);

  async function fetchAllLeads() {
    const PAGE = 1000;
    let page = 0;
    const all: { assigned_to: string; tm_status: string | null; created_at: string }[] = [];
    while (true) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('assigned_to, tm_status, created_at')
        .not('assigned_to', 'is', null)
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      page++;
    }
    return all;
  }

  async function fetchAllCallLogs() {
    const PAGE = 1000;
    let page = 0;
    const all: { agent_id: string; called_at: string }[] = [];
    while (true) {
      const { data } = await supabaseAdmin
        .from('call_logs')
        .select('agent_id, called_at')
        .neq('outcome', 'Other')
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      page++;
    }
    return all;
  }

  const [usersRes, allLeads, commissionsRes, callsRes, allCallLogs, followUpsRes, recentCallsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),

    fetchAllLeads(),

    supabaseAdmin
      .from('commissions')
      .select('agent_id, commission_amount, status'),

    supabaseAdmin
      .from('call_logs')
      .select('agent_id, called_at, outcome, duration')
      .neq('outcome', 'Other')
      .gte('called_at', monthStart.toISOString()),

    fetchAllCallLogs(),

    supabaseAdmin
      .from('follow_ups')
      .select('agent_id, scheduled_at, completed')
      .eq('completed', false),

    supabaseAdmin
      .from('call_logs')
      .select('id, agent_id, outcome, duration, notes, called_at, lead_id, leads(name, company)')
      .order('called_at', { ascending: false })
      .limit(40),
  ]);

  const telemarketers = (usersRes.data?.users ?? [])
    .filter(u => (u.user_metadata?.role as string | undefined) === 'telemarketer');

  const leads       = allLeads;
  const commissions = commissionsRes.data ?? [];
  const calls       = callsRes.data ?? [];
  const followUps   = followUpsRes.data ?? [];

  const allTimeCallsByAgent = allCallLogs.reduce<Record<string, { count: number; lastCalledAt: string | null }>>((acc, c) => {
    if (!acc[c.agent_id]) acc[c.agent_id] = { count: 0, lastCalledAt: null };
    acc[c.agent_id].count++;
    if (!acc[c.agent_id].lastCalledAt || c.called_at > acc[c.agent_id].lastCalledAt!) {
      acc[c.agent_id].lastCalledAt = c.called_at;
    }
    return acc;
  }, {});

  type LeadBucket = { total: number; converted: number; newLead: number; wonThisMonth: number };
  const leadsByAgent = leads.reduce<Record<string, LeadBucket>>((acc, l) => {
    const id = l.assigned_to as string;
    if (!acc[id]) acc[id] = { total: 0, converted: 0, newLead: 0, wonThisMonth: 0 };
    acc[id].total++;
    if (l.tm_status === 'Converted' || l.tm_status === 'Won') {
      acc[id].converted++;
      if (l.created_at >= monthStart.toISOString()) acc[id].wonThisMonth++;
    }
    if (!l.tm_status || l.tm_status === 'New Lead') acc[id].newLead++;
    return acc;
  }, {});

  type CommBucket = { pending: number; ready: number; paid: number };
  const commByAgent = commissions.reduce<Record<string, CommBucket>>((acc, c) => {
    const id = c.agent_id as string;
    if (!acc[id]) acc[id] = { pending: 0, ready: 0, paid: 0 };
    if (['Pending Collection', 'Pending Payroll'].includes(c.status)) acc[id].pending += Number(c.commission_amount ?? 0);
    else if (c.status === 'Payroll Ready') acc[id].ready += Number(c.commission_amount ?? 0);
    else if (c.status === 'Paid')          acc[id].paid  += Number(c.commission_amount ?? 0);
    return acc;
  }, {});

  type CallBucket = { today: number; week: number; month: number; lastCalledAt: string | null };
  const callsByAgent = calls.reduce<Record<string, CallBucket>>((acc, c) => {
    const id = c.agent_id as string;
    if (!acc[id]) acc[id] = { today: 0, week: 0, month: 0, lastCalledAt: null };
    acc[id].month++;
    if (c.called_at >= weekStart.toISOString()) acc[id].week++;
    if (c.called_at >= todayStartUTC.toISOString()) acc[id].today++;
    if (!acc[id].lastCalledAt || c.called_at > acc[id].lastCalledAt!) acc[id].lastCalledAt = c.called_at;
    return acc;
  }, {});

  type FuBucket = { overdue: number; dueToday: number };
  const fuByAgent = followUps.reduce<Record<string, FuBucket>>((acc, f) => {
    const id = f.agent_id as string;
    if (!acc[id]) acc[id] = { overdue: 0, dueToday: 0 };
    // Convert stored UTC timestamptz to SAST date before comparing
    const fuDate = f.scheduled_at
      ? new Date(new Date(f.scheduled_at as string).getTime() + SA_OFFSET_MS).toISOString().slice(0, 10)
      : '';
    if (fuDate < today) acc[id].overdue++;
    else if (fuDate === today) acc[id].dueToday++;
    return acc;
  }, {});

  const COLORS = ['#A78BFA', '#34D399', '#60A5FA', '#FB923C', '#F472B6', '#FBBF24'];

  const agents = telemarketers.map((u, i) => {
    const name = (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Unknown';
    const lb   = leadsByAgent[u.id]  ?? { total: 0, converted: 0, newLead: 0, wonThisMonth: 0 };
    const cb   = commByAgent[u.id]   ?? { pending: 0, ready: 0, paid: 0 };
    const clb  = callsByAgent[u.id]  ?? { today: 0, week: 0, month: 0, lastCalledAt: null };
    const fub  = fuByAgent[u.id]     ?? { overdue: 0, dueToday: 0 };
    return {
      id:       u.id,
      name,
      email:    u.email ?? '',
      initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color:    COLORS[i % COLORS.length],
      leadsTotal:        lb.total,
      leadsConverted:    lb.converted,
      leadsNewLead:      lb.newLead,
      wonThisMonth:      lb.wonThisMonth,
      callsToday:        clb.today,
      callsThisWeek:     clb.week,
      callsThisMonth:    clb.month,
      callsAllTime:      allTimeCallsByAgent[u.id]?.count ?? 0,
      lastCalledAt:      allTimeCallsByAgent[u.id]?.lastCalledAt ?? null,
      overdueFollowUps:  fub.overdue,
      dueTodayFollowUps: fub.dueToday,
      commissionPending: cb.pending,
      commissionReady:   cb.ready,
      commissionPaid:    cb.paid,
    };
  });

  return NextResponse.json({ agents, recentActivity: recentCallsRes.data ?? [] });
}
