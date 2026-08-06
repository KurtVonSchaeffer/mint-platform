import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOf(unit: 'day' | 'week' | 'month') {
  const d = new Date();
  if (unit === 'day')   { d.setHours(0, 0, 0, 0); return d.toISOString(); }
  if (unit === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString(); }
  // week: Monday
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agent_id');
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 422 });

  const [todayISO, weekISO, monthISO] = [startOf('day'), startOf('week'), startOf('month')];

  const [callsRes, notesRes, fuRes, demosRes, proposalsRes, leadsRes] = await Promise.all([
    supabaseAdmin.from('call_logs').select('outcome,called_at').eq('agent_id', agentId),
    supabaseAdmin.from('lead_notes').select('created_at').eq('agent_id', agentId),
    supabaseAdmin.from('follow_ups').select('completed,scheduled_at,created_at').eq('agent_id', agentId),
    supabaseAdmin.from('demos').select('status,demo_date').eq('agent_id', agentId),
    supabaseAdmin.from('proposals').select('status,amount_cents,created_at').eq('agent_id', agentId),
    supabaseAdmin.from('leads').select('tm_status,estimated_deal_value,expected_close_date,deal_probability').eq('assigned_to', agentId),
  ]);

  const calls     = callsRes.data     ?? [];
  const notes     = notesRes.data     ?? [];
  const followUps = fuRes.data        ?? [];
  const demos     = demosRes.data     ?? [];
  const proposals = proposalsRes.data ?? [];
  const leads     = leadsRes.data     ?? [];

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
    'Negotiation', 'Won', 'Lost', 'Other', 'Not Qualified',
    'Pending', 'Call Again', 'Call Back', 'Unreachable', 'Demo Booked', 'Quoted', 'Converted', 'Not Interested',
  ];

  const pipelineByStage = STAGES.reduce<Record<string, { count: number; value: number }>>((acc, s) => {
    const stageLeads = leads.filter(l => l.tm_status === s);
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

  // ── Weekly call chart (last 7 days) ──────────────────────────────────
  const weekChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    return {
      day:   d.toLocaleDateString('en-ZA', { weekday: 'short' }),
      date:  dayStr,
      calls: calls.filter(c => c.called_at?.slice(0, 10) === dayStr).length,
      spoke: calls.filter(c => c.called_at?.slice(0, 10) === dayStr && c.outcome === 'Spoke').length,
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
