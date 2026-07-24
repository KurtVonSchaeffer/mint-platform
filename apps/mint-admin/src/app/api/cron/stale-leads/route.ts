import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, staleLeadDigestEmail } from '@/lib/email';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

const PORTAL_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.mintplatforms.co.za';
const STALE_DAYS      = 14;
const TERMINAL        = ['Won', 'Lost', 'Not Qualified', 'Not Interested', 'Converted'];

function isCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function sendStaleAlerts() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, name, company, tm_status, assigned_to, updated_at')
    .not('assigned_to', 'is', null)
    .lt('updated_at', cutoff.toISOString());

  if (error) return { ok: false, error: error.message };

  // Filter to active (non-terminal) leads only
  const stale = (leads ?? []).filter(l => !TERMINAL.includes(l.tm_status ?? ''));

  if (stale.length === 0) {
    return { ok: true, message: 'No stale leads found', agentsNotified: 0 };
  }

  // Group by agent
  const byAgent = stale.reduce<Record<string, typeof stale>>((acc, l) => {
    const id = l.assigned_to as string;
    if (!acc[id]) acc[id] = [];
    acc[id].push(l);
    return acc;
  }, {});

  const now     = Date.now();
  const results: { agentId: string; email?: string; count: number; ok: boolean; error?: string }[] = [];

  for (const [agentId, agentLeads] of Object.entries(byAgent)) {
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(agentId);
    if (userErr || !user?.email) {
      results.push({ agentId, count: agentLeads.length, ok: false, error: userErr?.message ?? 'User not found' });
      continue;
    }

    const agentName = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0];

    const html = staleLeadDigestEmail({
      agentName,
      portalUrl: PORTAL_URL,
      leads: agentLeads.map(l => ({
        id:        l.id,
        name:      l.name,
        company:   l.company ?? '',
        tmStatus:  l.tm_status ?? 'Unknown',
        daysSince: Math.floor((now - new Date(l.updated_at).getTime()) / 86_400_000),
      })),
    });

    const result = await sendEmail({
      to:      user.email,
      subject: `${agentLeads.length} stale lead${agentLeads.length !== 1 ? 's' : ''} need attention — AlgoLend`,
      html,
    });

    results.push({ agentId, email: user.email, count: agentLeads.length, ...result });
  }

  return {
    ok:              true,
    staleLeads:      stale.length,
    agentsNotified:  Object.keys(byAgent).length,
    results,
  };
}

export async function GET(req: NextRequest) {
  if (!isCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendStaleAlerts();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  if (!isCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendStaleAlerts();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
