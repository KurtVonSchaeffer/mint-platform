import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, followUpReminderEmail } from '@/lib/email';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.mintplatforms.co.za';

function isCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

interface FollowUpRow {
  id:           string;
  lead_id:      string;
  agent_id:     string;
  follow_up_type: string;
  scheduled_at: string;
  note:         string | null;
  leads: {
    name:    string;
    company: string | null;
    phone:   string | null;
  } | null;
}

async function sendReminders() {
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Fetch all incomplete follow-ups due on or before today
  const { data: rows, error } = await supabaseAdmin
    .from('follow_ups')
    .select('id, lead_id, agent_id, follow_up_type, scheduled_at, note, leads(name, company, phone)')
    .eq('completed', false)
    .lte('scheduled_at', `${todayStr}T23:59:59.999Z`)
    .order('scheduled_at', { ascending: true });

  if (error) return { ok: false, error: error.message };

  const followUps = (rows ?? []) as unknown as FollowUpRow[];

  if (followUps.length === 0) {
    return { ok: true, message: 'No pending follow-ups due today', agentsNotified: 0 };
  }

  // Group by agent_id
  const byAgent = followUps.reduce<Record<string, FollowUpRow[]>>((acc, f) => {
    if (!acc[f.agent_id]) acc[f.agent_id] = [];
    acc[f.agent_id].push(f);
    return acc;
  }, {});

  const results: { agentId: string; email?: string; count: number; ok: boolean; error?: string }[] = [];

  for (const [agentId, agentRows] of Object.entries(byAgent)) {
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(agentId);

    if (userErr || !user?.email) {
      results.push({ agentId, count: agentRows.length, ok: false, error: userErr?.message ?? 'User not found' });
      continue;
    }

    const agentName = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0];

    const html = followUpReminderEmail({
      agentName,
      todayLabel,
      portalUrl: PORTAL_URL,
      followUps: agentRows.map(f => ({
        leadId:    f.lead_id,
        leadName:  f.leads?.name    ?? 'Unknown lead',
        company:   f.leads?.company ?? '',
        phone:     f.leads?.phone   ?? '',
        type:      f.follow_up_type,
        note:      f.note,
        dueDate:   new Date(f.scheduled_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
        isOverdue: f.scheduled_at.slice(0, 10) < todayStr,
      })),
    });

    const result = await sendEmail({
      to:      user.email,
      subject: `${agentRows.length} follow-up${agentRows.length !== 1 ? 's' : ''} due today — AlgoLend`,
      html,
    });

    results.push({ agentId, email: user.email, count: agentRows.length, ...result });
  }

  return {
    ok:              true,
    date:            todayStr,
    totalFollowUps:  followUps.length,
    agentsNotified:  Object.keys(byAgent).length,
    results,
  };
}

// Vercel Cron calls GET
export async function GET(req: NextRequest) {
  if (!isCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendReminders();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// Admin manual trigger calls POST (no CRON_SECRET needed if authed as admin)
export async function POST(req: NextRequest) {
  if (!isCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendReminders();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
