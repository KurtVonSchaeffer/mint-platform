import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agent_id');
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 422 });

  // SAST = UTC+2 — align "today" with the agent's calendar day
  const SA_OFFSET_MS = 2 * 60 * 60 * 1000;
  const nowSA = new Date(Date.now() + SA_OFFSET_MS);
  const todayStartUTC = new Date(Date.UTC(nowSA.getUTCFullYear(), nowSA.getUTCMonth(), nowSA.getUTCDate()) - SA_OFFSET_MS);
  const today = new Date(todayStartUTC.getTime() + SA_OFFSET_MS).toISOString().slice(0, 10); // YYYY-MM-DD in SAST

  const [leadsRes, callsRes, followUpsRes, clientsRes, commissionsRes] = await Promise.all([
    supabaseAdmin.from('leads').select('id, tm_status, created_at').eq('assigned_to', agentId),
    supabaseAdmin.from('call_logs').select('id, called_at').eq('agent_id', agentId).gte('called_at', todayStartUTC.toISOString()),
    supabaseAdmin.from('follow_ups').select('id, scheduled_at, completed').eq('agent_id', agentId).eq('completed', false),
    supabaseAdmin.from('leads').select('id, client_stage, created_at').eq('assigned_to', agentId).in('tm_status', ['Converted', 'Won']),
    supabaseAdmin.from('commissions').select('commission_amount, status').eq('agent_id', agentId),
  ]);

  const leads       = leadsRes.data ?? [];
  const calls       = callsRes.data ?? [];
  const followUps   = followUpsRes.data ?? [];
  const clients     = clientsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const overdueFollowUps = followUps.filter(f => f.scheduled_at < today).length;
  const dueToday         = followUps.filter(f => f.scheduled_at === today).length;

  const pendingCommission = commissions
    .filter(c => c.status === 'Pending Collection')
    .reduce((s, c) => s + Number(c.commission_amount), 0);
  const earnedCommission = commissions
    .filter(c => ['Payroll Ready', 'Paid'].includes(c.status))
    .reduce((s, c) => s + Number(c.commission_amount), 0);
  const expectedPayroll = commissions
    .filter(c => c.status === 'Payroll Ready')
    .reduce((s, c) => s + Number(c.commission_amount), 0);

  return NextResponse.json({
    leads: {
      total: leads.length,
      newThisMonth: leads.filter(l => l.created_at >= monthStartIso).length,
      awaitingContact: leads.filter(l => !l.tm_status || l.tm_status === 'Pending' || l.tm_status === 'New Lead').length,
    },
    activity: {
      callsToday: calls.length,
      followUpsDue: dueToday,
      overdue: overdueFollowUps,
    },
    clients: {
      converted: clients.length,
      convertedThisMonth: clients.filter(c => c.created_at >= monthStartIso).length,
      live: clients.filter(c => c.client_stage === 'Client Live').length,
      pendingCompliance: clients.filter(c => !c.client_stage || c.client_stage === 'Converted').length,
      complianceApproved: clients.filter(c => c.client_stage === 'Compliance Approved').length,
    },
    earnings: {
      commissionPending: pendingCommission,
      commissionEarned: earnedCommission,
      expectedPayroll,
    },
  });
}
