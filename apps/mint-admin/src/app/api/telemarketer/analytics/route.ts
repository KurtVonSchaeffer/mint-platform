import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Lead = { tm_status: string | null; estimated_deal_value: number | null; deal_probability: number | null; expected_close_date: string | null };

// SAST = UTC+2. Compute period boundaries in SA local time so "today" matches the agent's calendar day.
const SA_OFFSET_MS = 2 * 60 * 60 * 1000;

function startOf(unit: 'day' | 'week' | 'month') {
  const nowSA = new Date(Date.now() + SA_OFFSET_MS); // UTC clock shifted so getUTC* returns SAST values
  if (unit === 'day') {
    return new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), nowSA.getUTCDate()) - SA_OFFSET_MS).toISOString();
  }
  if (unit === 'month') {
    return new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), 1) - SA_OFFSET_MS).toISOString();
  }
  // week: Monday
  const dow = nowSA.getUTCDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  return new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), nowSA.getUTCDate() + diffToMon) - SA_OFFSET_MS).toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agent_id');
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 422 });

  const [todayISO, weekISO, monthISO] = [startOf('day'), startOf('week'), startOf('month')];

  async function fetchAllAgentLeads() {
    const size = 1000;
    let page = 0;
    const all: Lead[] = [];
    while (true) {
      const from = page * size;
      const { data } = await supabaseAdmin
        .from('leads')
        .select('tm_status,estimated_deal_value,expected_close_date,deal_probability')
        .eq('assigned_to', agentId)
        .range(from, from + size - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < size) break;
      page++;
    }
    return all;
  }

  const [callsRes, notesRes, fuRes, demosRes, proposalsRes, leads] = await Promise.all([
    // Filter to current month only — avoids PostgREST 1000-row cap on agents with large call history
    supabaseAdmin.from('call_logs').select('outcome,called_at').eq('agent_id', agentId).gte('called_at', monthISO),
    supabaseAdmin.from('lead_notes').select('created_at').eq('agent_id', agentId),
    supabaseAdmin.from('follow_ups').select('completed,scheduled_at,created_at').eq('agent_id', agentId),
    supabaseAdmin.from('demos').select('status,demo_date').eq('agent_id', agentId),
    supabaseAdmin.from('proposals').select('status,amount_cents,created_at').eq('agent_id', agentId),
    fetchAllAgentLeads(),
  ]);

  const calls     = callsRes.data     ?? [];
  const notes     = notesRes.data     ?? [];
  const followUps = fuRes.data        ?? [];
  const demos     = demosRes.data     ?? [];
  const proposals = proposalsRes.data ?? [];

  // ── Activity counts ──────────────────────────────────────────────────
  const callsToday = calls.filter(c => c.called_at >= todayISO).length;
  const callsWeek  = calls.filter(c => c.called_at >= weekISO).length;
  const callsMonth = calls.filter(c => c.called_at >= monthISO).length;
  const spokeTo    = calls.filter(c => c.outcome === 'Spoke').length;
  const contactRate = calls.length ? Math.round((spokeTo / calls.length) * 100) : 0;

  const notesMonth = notes.filter(n => n.created_at >= monthISO).length;
  const fuCompleted = followUps.filter(f => f.completed).length;
  const fuPending   = followUps.filter(f => !f.completed).length;
  const fuDueToday  = followUps.filter(f => !f.completed && f.scheduled_at && f.scheduled_at.slice(0, 10) <= new Date().toISOString().slice(0, 10)).length;

  // ── Proposals ────────────────────────────────────────────────────────
  const proposalsSent     = proposals.filter(p => p.status !== 'Draft').length;
  const proposalsAccepted = proposals.filter(p => p.status === 'Accepted').length;
  const proposalRate      = proposalsSent ? Math.round((proposalsAccepted / proposalsSent) * 100) : 0;
  const proposalValueCents = proposals
    .filter(p => p.status === 'Accepted')
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  // ── Demos ────────────────────────────────────────────────────────────
  const demosCompleted = demos.filter(d => d.status === 'Completed').length;
  const demosBooked    = demos.filter(d => d.status === 'Scheduled').length;

  // ── Pipeline ─────────────────────────────────────────────────────────
  const STAGES = [
    'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
    'Demo Scheduled', 'Demo Completed', 'Proposal Requested', 'Proposal Sent',
    'Negotiation', 'Won', 'Lost', 'Not Interested', 'Other',
    'Pending', 'Call Again', 'Call Back', 'Unreachable', 'Demo Booked', 'Quoted', 'Converted',
  ];
  const NORMALIZE: Record<string, string> = { 'Not Qualified': 'Other' };

  const pipelineByStage = STAGES.reduce<Record<string, { count: number; value: number }>>((acc, s) => {
    const stageLeads = leads.filter(l => (NORMALIZE[l.tm_status ?? ''] ?? l.tm_status) === s);
    if (stageLeads.length > 0) {
      acc[s] = {
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (l.estimated_deal_value ?? 0), 0),
      };
    }
    return acc;
  }, {});

  const wonLeads  = leads.filter(l => l.tm_status === 'Won' || l.tm_status === 'Converted');
  const wonValue  = wonLeads.reduce((s, l) => s + (l.estimated_deal_value ?? 0), 0);
  const pipeValue = leads
    .filter(l => !['Won', 'Converted', 'Lost', 'Other', 'Not Qualified', 'Not Interested'].includes(l.tm_status ?? ''))
    .reduce((s, l) => s + ((l.estimated_deal_value ?? 0) * ((l.deal_probability ?? 50) / 100)), 0);

  // ── Weekly call chart (last 7 days, SAST day boundaries) ────────────
  const weekChart = Array.from({ length: 7 }, (_, i) => {
    const daySA = new Date(Date.now() + SA_OFFSET_MS);
    daySA.setUTCDate(daySA.getUTCDate() - (6 - i));
    const dayStartUTC = new Date(Date.UTC(daySA.getUTCFullYear(), daySA.getUTCMonth(), daySA.getUTCDate()) - SA_OFFSET_MS);
    const dayEndUTC   = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);
    const start = dayStartUTC.toISOString();
    const end   = dayEndUTC.toISOString();
    const label = new Intl.DateTimeFormat('en-ZA', { weekday: 'short', timeZone: 'Africa/Johannesburg' }).format(dayStartUTC);
    const date  = new Date(dayStartUTC.getTime() + SA_OFFSET_MS).toISOString().slice(0, 10);
    return {
      day:   label,
      date,
      calls: calls.filter(c => c.called_at >= start && c.called_at < end).length,
      spoke: calls.filter(c => c.called_at >= start && c.called_at < end && c.outcome === 'Spoke').length,
    };
  });

  return NextResponse.json({
    activity: { callsToday, callsWeek, callsMonth, spokeTo, contactRate, notesMonth },
    followUps: { completed: fuCompleted, pending: fuPending, dueToday: fuDueToday },
    demos:     { completed: demosCompleted, booked: demosBooked },
    proposals: { sent: proposalsSent, accepted: proposalsAccepted, rate: proposalRate, valueCents: proposalValueCents },
    pipeline:  { byStage: pipelineByStage, wonValue, weightedValue: Math.round(pipeValue), totalLeads: leads.length },
    chart:     weekChart,
  });
}
