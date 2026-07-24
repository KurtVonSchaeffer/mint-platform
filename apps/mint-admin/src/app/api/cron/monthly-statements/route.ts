import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, commissionStatementEmail } from '@/lib/email';

export const runtime   = 'nodejs';
export const dynamic   = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET  /api/cron/monthly-statements
 *   → Called by Vercel Cron on the 1st of each month at 07:00 UTC (09:00 SAST).
 *     Sends the previous month's commission statement to every telemarketer.
 *
 * POST /api/cron/monthly-statements
 *   → Manual trigger from the admin UI. Body: { month?: "YYYY-MM" }
 *     Defaults to previous month when omitted.
 *
 * Auth: Bearer CRON_SECRET (cron) OR valid admin/manager session (manual).
 */

function prevMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function isCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  return ['super_admin', 'admin', 'manager'].includes(role);
}

interface CommissionRow {
  agent_id:          string;
  client_name:       string;
  commission_amount: number;
  loan_amount:       number | null;
  status:            string;
  payroll_date:      string | null;
}

async function sendStatements(month: string) {
  const [year, mon] = month.split('-').map(Number);
  const from = new Date(year, mon - 1, 1).toISOString();
  const to   = new Date(year, mon,     1).toISOString(); // exclusive start of next month

  const { data: commissions, error } = await supabaseAdmin
    .from('commissions')
    .select('agent_id, client_name, commission_amount, loan_amount, status, payroll_date')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true });

  if (error) return { ok: false, error: error.message };

  const rows = (commissions ?? []) as CommissionRow[];

  // Group by agent_id
  const byAgent = rows.reduce<Record<string, CommissionRow[]>>((acc, c) => {
    if (!acc[c.agent_id]) acc[c.agent_id] = [];
    acc[c.agent_id].push(c);
    return acc;
  }, {});

  const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const results: { agentId: string; email?: string; ok: boolean; error?: string }[] = [];

  for (const [agentId, agentRows] of Object.entries(byAgent)) {
    // Look up agent email from Supabase Auth
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(agentId);

    if (userErr || !user?.email) {
      results.push({ agentId, ok: false, error: userErr?.message ?? 'User not found in auth' });
      continue;
    }

    const agentName = (user.user_metadata?.full_name as string | undefined)
      ?? user.email.split('@')[0];

    const html = commissionStatementEmail({
      agentName,
      month: monthLabel,
      commissions: agentRows.map(r => ({
        clientName:       r.client_name,
        loanAmount:       r.loan_amount,
        commissionAmount: r.commission_amount,
        status:           r.status,
        payrollDate:      r.payroll_date,
      })),
    });

    const result = await sendEmail({
      to:      user.email,
      subject: `Your Commission Statement — ${monthLabel}`,
      html,
    });

    results.push({ agentId, email: user.email, ...result });
  }

  return {
    ok:      true,
    month,
    monthLabel,
    agentsProcessed: Object.keys(byAgent).length,
    results,
  };
}

export async function GET(req: NextRequest) {
  if (!isCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendStatements(prevMonth());
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  if (!isCronSecret(req) && !await isAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let month = prevMonth();
  try {
    const body = await req.json();
    if (body?.month && /^\d{4}-\d{2}$/.test(body.month)) month = body.month;
  } catch { /* no body is fine */ }

  const result = await sendStatements(month);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
