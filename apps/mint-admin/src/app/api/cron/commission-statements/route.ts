import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { buildCommissionStatementPDF } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Previous month window — cron fires on 1st so "last month" is what we report
  const now       = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); // exclusive
  const monthName  = prevMonth.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });

  const [usersRes, commissionsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin
      .from('commissions')
      .select('agent_id, client_name, commission_amount, status, notes, created_at')
      .gte('created_at', monthStart)
      .lt('created_at',  monthEnd),
  ]);

  const telemarketers = (usersRes.data?.users ?? []).filter(
    u => (u.user_metadata?.role as string | undefined) === 'telemarketer' && u.email,
  );
  const allCommissions = commissionsRes.data ?? [];

  const fmt  = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const date = (s: string) => new Date(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  const statusColor = (s: string) => {
    if (s === 'Paid')            return '#059669';
    if (s === 'Payroll Ready')   return '#2563EB';
    if (s === 'Pending Payroll') return '#7C3AED';
    return '#D97706';
  };

  const results = await Promise.all(telemarketers.map(async u => {
    // Only commissions where the client has actually paid their first month
    const comms = allCommissions.filter(
      c => c.agent_id === u.id && c.status !== 'Pending Collection',
    );
    if (comms.length === 0) return { email: u.email, sent: false, reason: 'no earned commissions this month' };

    const total = comms.reduce((s, c) => s + Number(c.commission_amount ?? 0), 0);
    const name  = (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Agent';

    const rows = comms.map(c => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:500">
          ${c.client_name ?? '—'}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280">
          ${date(c.created_at)}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:${statusColor(c.status)}18;color:${statusColor(c.status)}">
            ${c.status}
          </span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;font-size:13px;font-weight:700;color:#111827">
          ${fmt(Number(c.commission_amount ?? 0))}
        </td>
      </tr>`).join('');

    const html = `
<div style="font-family:system-ui,sans-serif;max-width:620px;margin:0 auto;color:#111827">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0a1628 0%,#1e3a5f 100%);padding:32px 32px 28px;border-radius:12px 12px 0 0">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.03em">
          Algo<span style="color:#34d399">Lend</span>
        </p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.07em">
          MINT Platforms (Pty) Ltd
        </p>
      </div>
      <div style="text-align:right">
        <p style="margin:0 0 3px;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em">Commission Statement</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#fff">${monthName}</p>
      </div>
    </div>
  </div>

  <!-- Body -->
  <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">

    <p style="margin:0 0 6px;color:#374151;font-size:14px">Hi <strong>${name}</strong>,</p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:13px">
      Here are your commissions earned in <strong style="color:#374151">${monthName}</strong>.
    </p>

    <!-- Line items -->
    <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
      <thead>
        <tr style="background:#0a1628">
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em">Client</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em">Date</th>
          <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em">Status</th>
          <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em">Commission</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- Total -->
    <div style="margin-top:-1px;background:#0f172a;border-radius:0 0 8px 8px;padding:14px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.08em">
        ${monthName} Total · ${comms.length} client${comms.length !== 1 ? 's' : ''}
      </span>
      <span style="font-size:20px;font-weight:800;color:#34d399;font-family:monospace;letter-spacing:-0.02em">
        ${fmt(total)}
      </span>
    </div>

    <p style="margin:22px 0 0;font-size:12px;color:#9ca3af;line-height:1.6">
      Commission is calculated at <strong style="color:#6b7280">25%</strong> of the client's once-off sign-up / implementation fee for each accepted quote.
      Log in to your <strong style="color:#6b7280">Statements</strong> page for the full earnings history.
    </p>
  </div>
</div>`;

    try {
      const pdfBuffer = await buildCommissionStatementPDF({
        agentName: name,
        monthName,
        commissions: comms.map(c => ({
          clientName:       c.client_name,
          commissionAmount: c.commission_amount,
          status:           c.status,
          createdAt:        c.created_at,
        })),
      });

      await sendEmail({
        to:      u.email!,
        subject: `Your ${monthName} commission statement`,
        html,
        attachments: [{
          filename: `AlgoLend-Commission-${monthName.replace(/\s/g, '-')}.pdf`,
          content:  pdfBuffer,
        }],
      });
      return { email: u.email, sent: true, total };
    } catch {
      return { email: u.email, sent: false, reason: 'email failed' };
    }
  }));

  const sent   = results.filter(r => r.sent).length;
  const failed = results.filter(r => !r.sent);
  return NextResponse.json({ ok: true, monthName, sent, total: telemarketers.length, failed });
}
