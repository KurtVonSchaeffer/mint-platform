'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, DollarSign, TrendingUp, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate as motionAnimate,
} from 'motion/react';

interface ApiCommission {
  id: string;
  client_name: string;
  commission_amount: number;
  status: string;
  payroll_date: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
  leads: { name: string; company: string } | null;
}

interface StatementEntry {
  client: string;
  company: string;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
}

interface MonthlyStatement {
  monthKey: string;
  label: string;
  sortKey: string;
  status: 'Paid' | 'Processing' | 'Pending';
  /** Only commissions where the client has paid (status !== 'Pending Collection') */
  earnedTotal: number;
  /** Commission awaiting client's first payment */
  awaitingTotal: number;
  entries: StatementEntry[];
}

function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function deriveStatements(commissions: ApiCommission[]): MonthlyStatement[] {
  const map = new Map<string, { label: string; sortKey: string; entries: StatementEntry[] }>();

  for (const c of commissions) {
    const dateStr = c.payroll_date ?? c.created_at.split('T')[0];
    const d       = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    const label   = d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!map.has(sortKey)) map.set(sortKey, { label, sortKey, entries: [] });
    map.get(sortKey)!.entries.push({
      client:           c.client_name,
      company:          c.leads?.company ?? '',
      commissionAmount: c.commission_amount,
      status:           c.status,
      paidAt:           c.paid_at,
      createdAt:        c.created_at,
      notes:            c.notes,
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ label, sortKey, entries }) => {
      const earned   = entries.filter(e => e.status !== 'Pending Collection');
      const awaiting = entries.filter(e => e.status === 'Pending Collection');
      const allPaid    = earned.length > 0 && earned.every(e => e.status === 'Paid');
      const anyPayroll = earned.some(e => e.status === 'Payroll Ready' || e.status === 'Paid');
      const stmtStatus: MonthlyStatement['status'] = allPaid ? 'Paid' : anyPayroll ? 'Processing' : 'Pending';
      return {
        monthKey:      sortKey,
        label,
        sortKey,
        status:        stmtStatus,
        earnedTotal:   earned.reduce((s, e) => s + e.commissionAmount, 0),
        awaitingTotal: awaiting.reduce((s, e) => s + e.commissionAmount, 0),
        entries,
      };
    });
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function buildStatementHTML(stmt: MonthlyStatement, agentName: string): string {
  const paid      = stmt.entries.filter(e => e.status === 'Paid').reduce((s, e) => s + e.commissionAmount, 0);
  const earned   = stmt.entries.filter(e => e.status !== 'Pending Collection');
  const awaiting = stmt.entries.filter(e => e.status === 'Pending Collection');
  const generated = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusColor = (s: string) => {
    if (s === 'Paid')            return '#059669';
    if (s === 'Payroll Ready')   return '#2563EB';
    if (s === 'Pending Payroll') return '#7C3AED';
    return '#92400E';
  };

  const makeRows = (list: typeof earned, altStart = 0) => list.map((e, i) => `
    <tr style="background:${(i + altStart) % 2 === 0 ? '#ffffff' : '#f8fafc'}">
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0">
        <div style="font-weight:600;color:#0f172a;font-size:13px">${e.client}</div>
        ${e.company ? `<div style="color:#64748b;font-size:11px;margin-top:2px">${e.company}</div>` : ''}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:12px">
        ${new Date(e.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-size:13px;color:#0f172a;font-weight:600">
        ${fmt(e.commissionAmount)}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center">
        <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:${statusColor(e.status)}18;color:${statusColor(e.status)};border:1px solid ${statusColor(e.status)}33;text-transform:uppercase;letter-spacing:0.05em">
          ${e.status}
        </span>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px">
        ${e.paidAt ? new Date(e.paidAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
      </td>
    </tr>`).join('');

  const rows = makeRows(earned);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Commission Statement: ${stmt.label}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #ffffff;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 0;
  }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%);
    padding: 36px 40px 32px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 200px; height: 200px;
    background: rgba(124,58,237,0.15);
    border-radius: 50%;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: -60px; left: 120px;
    width: 160px; height: 160px;
    background: rgba(52,211,153,0.08);
    border-radius: 50%;
  }
  .header-inner {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .logo-block {}
  .logo-wordmark {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.03em;
  }
  .logo-wordmark span { color: #34d399; }
  .logo-sub {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    margin-top: 3px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .doc-meta {
    text-align: right;
  }
  .doc-title {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .doc-period {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.02em;
  }

  /* ── Agent strip ── */
  .agent-strip {
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .agent-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .agent-avatar {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: linear-gradient(135deg, #7c3aed, #a78bfa);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }
  .agent-name {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }
  .agent-label {
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 1px;
  }
  .generated-on {
    font-size: 11px;
    color: #94a3b8;
    text-align: right;
  }
  .generated-on strong { color: #64748b; font-weight: 600; }

  /* ── Summary cards ── */
  .summary {
    padding: 28px 40px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .stat-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 17px;
    font-weight: 700;
    font-family: monospace;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .stat-value.green  { color: #059669; }
  .stat-value.amber  { color: #d97706; }
  .stat-value.purple { color: #7c3aed; }
  .stat-accent {
    width: 3px;
    height: 28px;
    border-radius: 2px;
    float: left;
    margin-right: 10px;
    margin-top: 2px;
  }

  /* ── Table section ── */
  .section-header {
    padding: 0 40px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748b;
  }
  .section-rule {
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }

  .table-wrap {
    margin: 0 40px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead tr {
    background: #0a1628;
  }
  th {
    padding: 11px 14px;
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,0.6);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: left;
  }
  th.right  { text-align: right; }
  th.center { text-align: center; }

  /* ── Total row ── */
  .total-row {
    margin: 0 40px;
    background: #0f172a;
    border-radius: 0 0 10px 10px;
    padding: 14px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #1e293b;
    border-top: none;
  }
  .total-label {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .total-amount {
    font-size: 22px;
    font-weight: 800;
    color: #34d399;
    font-family: monospace;
    letter-spacing: -0.02em;
  }
  .entry-count {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
  }

  /* ── Notes ── */
  .notes-section {
    margin: 24px 40px 0;
    padding: 16px 18px;
    background: #fefce8;
    border: 1px solid #fef08a;
    border-radius: 8px;
    font-size: 11px;
    color: #713f12;
    line-height: 1.6;
  }

  /* ── Footer ── */
  .footer {
    margin: 28px 40px 0;
    padding: 18px 0;
    border-top: 1px solid #e2e8f0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }
  .footer-legal {
    font-size: 10px;
    color: #94a3b8;
    line-height: 1.7;
    max-width: 400px;
  }
  .footer-legal strong { color: #64748b; font-weight: 600; }
  .footer-ref {
    text-align: right;
    font-size: 10px;
    color: #cbd5e1;
    font-family: monospace;
  }
  .footer-stamp {
    margin-top: 4px;
    font-size: 9px;
    color: #e2e8f0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* ── Print ── */
  @media print {
    html, body { height: auto; }
    .page { max-width: 100%; }
    .no-print { display: none !important; }

    @page {
      size: A4;
      margin: 0;
    }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-inner">
      <div class="logo-block">
        <div class="logo-wordmark">Algo<span>Lend</span></div>
        <div class="logo-sub">MINT Platforms (Pty) Ltd</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Commission Statement</div>
        <div class="doc-period">${stmt.label}</div>
      </div>
    </div>
  </div>

  <!-- Agent strip -->
  <div class="agent-strip">
    <div class="agent-info">
      <div class="agent-avatar">
        ${agentName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TM'}
      </div>
      <div>
        <div class="agent-label">Prepared for</div>
        <div class="agent-name">${agentName}</div>
      </div>
    </div>
    <div class="generated-on">
      Generated on<br />
      <strong>${generated}</strong>
    </div>
  </div>

  <!-- Summary cards -->
  <div class="summary">
    <div class="stat-card">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="stat-accent" style="background:#7c3aed"></div>
        <div>
          <div class="stat-label">Earned This Month</div>
          <div class="stat-value purple">${fmt(stmt.earnedTotal)}</div>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="stat-accent" style="background:#059669"></div>
        <div>
          <div class="stat-label">Paid Out</div>
          <div class="stat-value green">${fmt(earned.filter(e => e.status === 'Paid').reduce((s, e) => s + e.commissionAmount, 0))}</div>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="stat-accent" style="background:#d97706"></div>
        <div>
          <div class="stat-label">In Payroll</div>
          <div class="stat-value amber">${fmt(earned.filter(e => e.status !== 'Paid').reduce((s, e) => s + e.commissionAmount, 0))}</div>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="stat-accent" style="background:#0ea5e9"></div>
        <div>
          <div class="stat-label">Clients Paid</div>
          <div class="stat-value" style="color:#0ea5e9">${earned.length}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Earned line items -->
  <div class="section-header">
    <span class="section-title">Earned Commission</span>
    <div class="section-rule"></div>
  </div>

  ${earned.length > 0 ? `
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Date</th>
          <th class="right">Commission (25%)</th>
          <th class="center">Status</th>
          <th>Paid On</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>

  <!-- Total row -->
  <div class="total-row">
    <div>
      <div class="total-label">Earned Total</div>
      <div class="entry-count">${earned.length} client${earned.length !== 1 ? 's' : ''} paid</div>
    </div>
    <div class="total-amount">${fmt(stmt.earnedTotal)}</div>
  </div>` : `
  <div style="margin:0 40px;padding:20px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
    No earned commissions this month yet.
  </div>`}

  ${awaiting.length > 0 ? `
  <!-- Awaiting client payment -->
  <div class="section-header" style="margin-top:28px">
    <span class="section-title" style="color:#d97706">Awaiting Client Payment</span>
    <div class="section-rule"></div>
  </div>
  <div style="margin:0 40px 6px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px 8px 0 0;font-size:11px;color:#92400e">
    These commissions are not yet earned. They will be confirmed once the client pays their first month.
  </div>
  <div class="table-wrap" style="border-radius:0 0 8px 8px">
    <table>
      <thead>
        <tr style="background:#78350f">
          <th>Client</th>
          <th>Date</th>
          <th class="right">Potential Commission</th>
          <th class="center">Status</th>
          <th>Paid On</th>
        </tr>
      </thead>
      <tbody>
        ${makeRows(awaiting)}
      </tbody>
    </table>
  </div>
  <div style="margin:0 40px;background:#92400e18;border:1px solid #d97706;border-top:none;border-radius:0 0 8px 8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.07em">Potential if all clients pay</span>
    <span style="font-size:17px;font-weight:800;color:#d97706;font-family:monospace">${fmt(stmt.awaitingTotal)}</span>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-legal">
      <strong>MINT Platforms (Pty) Ltd</strong> · AlgoLend Credit Bureau Platform<br />
      This document is computer-generated and does not require a signature. Commission is earned at 25% of the client sign-up / implementation fee for each accepted quote. Commissions are subject to approval and payment confirmation.<br />
      For queries contact <strong>accounts@mymint.co.za</strong>
    </div>
    <div class="footer-ref">
      <div style="color:#64748b;font-weight:600">REF: STMT-${stmt.sortKey}-${agentName.replace(/\s+/g, '').toUpperCase().slice(0, 5)}</div>
      <div class="footer-stamp">AlgoLend · Confidential</div>
    </div>
  </div>

  <!-- Print button (screen only) -->
  <div class="no-print" style="padding:20px 40px 32px;text-align:center">
    <button onclick="window.print()" style="background:#7c3aed;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
      Print / Save as PDF
    </button>
  </div>

</div>
</body>
</html>`;
}

// ─── Animation helpers (NumberTicker from 21st.dev / danielpetho) ─────────────

function CountUp({
  target,
  format = (n: number) => String(Math.round(n)),
  duration = 1.5,
}: {
  target: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const count = useMotionValue(0);
  const text  = useTransform(count, format);
  useEffect(() => {
    const ctrl = motionAnimate(count, target, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => ctrl.stop();
  }, [target, duration, count]);
  return <motion.span>{text}</motion.span>;
}

function ShimmerCard() {
  return (
    <div className="bento-card p-4" style={{ position: 'relative', overflow: 'hidden', minHeight: 96 }}>
      <div style={{ height: 12, width: '50%', borderRadius: 6, background: 'var(--color-fill-subtle)', marginBottom: 14, marginTop: 4 }} />
      <div style={{ height: 10, width: '35%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }} />
      <div style={{ height: 22, width: '55%', borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
      <motion.div
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.05) 50%,transparent 100%)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 }}
      />
    </div>
  );
}

function ShimmerStmt() {
  return (
    <div className="bento-card p-5" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '42%', borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
          <div style={{ height: 10, width: '26%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ height: 20, width: 80, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 8, marginLeft: 'auto' }} />
          <div style={{ height: 10, width: 50, borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginLeft: 'auto' }} />
        </div>
      </div>
      <motion.div
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.05) 50%,transparent 100%)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 }}
      />
    </div>
  );
}

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const cardVariants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE } },
};

const listVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.4, ease: EASE } },
};

// ─── Print / PDF ──────────────────────────────────────────────────────────────

function printStatement(stmt: MonthlyStatement, agentName: string) {
  const html = buildStatementHTML(stmt, agentName);
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) { alert('Allow popups to download PDF.'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─── StatementCard ────────────────────────────────────────────────────────────

function StatementCard({ stmt, agentName }: { stmt: MonthlyStatement; agentName: string }) {
  const [expanded, setExpanded] = useState(false);

  const statusCfg = {
    Paid:       { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', border: 'rgba(16,185,129,0.2)' },
    Processing: { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', border: 'rgba(96,165,250,0.2)' },
    Pending:    { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
  }[stmt.status];

  return (
    <div className="bento-card overflow-hidden">
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left transition-all"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
          <FileText size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{stmt.label}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
              {stmt.status}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
            {stmt.entries.filter(e => e.status !== 'Pending Collection').length} earned
            {stmt.entries.some(e => e.status === 'Pending Collection') && ` · ${stmt.entries.filter(e => e.status === 'Pending Collection').length} awaiting payment`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(stmt.earnedTotal)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
            earned
            {stmt.awaitingTotal > 0 && (
              <span style={{ color: '#D97706' }}> · {fmt(stmt.awaitingTotal)} pending</span>
            )}
          </p>
        </div>
        <div className="ml-2 shrink-0" style={{ color: 'var(--color-text3)' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          key="expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden', borderTop: '1px solid var(--color-border2)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Commission Status</th>
                <th>Date</th>
                <th>Paid On</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              {stmt.entries.filter(e => e.status !== 'Pending Collection').map((entry, i) => (
                <tr key={i}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                        {entry.client.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{entry.client}</p>
                        {entry.company && <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{entry.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: entry.status === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.08)',
                        color:      entry.status === 'Paid' ? '#10B981' : 'var(--color-violet)',
                        border:     `1px solid ${entry.status === 'Paid' ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)'}`,
                      }}>
                      {entry.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                      {new Date(entry.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                      {entry.paidAt ? new Date(entry.paidAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm font-bold font-mono" style={{ color: '#34D399' }}>{fmt(entry.commissionAmount)}</span>
                  </td>
                </tr>
              ))}
              {stmt.entries.some(e => e.status === 'Pending Collection') && (
                <>
                  <tr>
                    <td colSpan={5} style={{ padding: '8px 14px', background: 'rgba(217,119,6,0.06)', borderTop: '1px solid rgba(217,119,6,0.2)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#D97706' }}>
                        Awaiting client payment. Not yet earned.
                      </p>
                    </td>
                  </tr>
                  {stmt.entries.filter(e => e.status === 'Pending Collection').map((entry, i) => (
                    <tr key={`await-${i}`} style={{ opacity: 0.6 }}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg,#78716C,#A8A29E)' }}>
                            {entry.client.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{entry.client}</p>
                            {entry.company && <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{entry.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}>
                          Pending Collection
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                          {new Date(entry.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td></td>
                      <td>
                        <span className="text-sm font-bold font-mono" style={{ color: '#D97706' }}>{fmt(entry.commissionAmount)}</span>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-surface2)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              Earned: <strong className="font-bold font-mono" style={{ color: '#34D399' }}>{fmt(stmt.earnedTotal)}</strong>
              {stmt.awaitingTotal > 0 && (
                <span style={{ color: '#D97706' }}> · {fmt(stmt.awaitingTotal)} awaiting</span>
              )}
            </p>
            <button
              onClick={() => printStatement(stmt, agentName)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}>
              <Download size={12} /> Download PDF
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatementsPage() {
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [agentName,  setAgentName]  = useState('Telemarketer');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = (user.user_metadata?.full_name as string | undefined)
        ?? user.email?.split('@')[0]
        ?? 'Telemarketer';
      setAgentName(name);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/telemarketer/my-commissions');
    if (res.ok) {
      const { commissions } = await res.json();
      setStatements(deriveStatements(commissions ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const lifetimeTotal = statements.reduce((s, st) => s + st.earnedTotal, 0);
  const paidTotal     = statements.reduce((s, st) => s + st.entries.filter(e => e.status === 'Paid').reduce((x, e) => x + e.commissionAmount, 0), 0);
  const currentMonth  = statements[0]?.earnedTotal ?? 0;

  const fmtCurrency = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <motion.div
        className="flex items-start justify-between gap-4 flex-wrap"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
        <div>
          <p className="eyebrow mb-1">Earnings history</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>Statements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Monthly commission statements. Click to expand and download.</p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </motion.div>

      {/* Summary cards */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeletons" className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {[0,1,2,3].map(i => <ShimmerCard key={i} />)}
          </motion.div>
        ) : (
          <motion.div key="cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            initial="hidden" animate="show">
            {[
              { label: 'Lifetime Earnings', value: lifetimeTotal, color: '#A78BFA', rgb: '167,139,250', icon: TrendingUp,  glow: true  },
              { label: 'Total Paid Out',    value: paidTotal,     color: '#34D399', rgb: '52,211,153',  icon: DollarSign, glow: false },
              { label: 'Current Month',     value: currentMonth,  color: '#60A5FA', rgb: '96,165,250',  icon: Calendar,   glow: false },
              { label: 'Months on Record',  value: statements.length, color: '#FBBF24', rgb: '251,191,36', icon: FileText, glow: false },
            ].map((card, i) => (
              <motion.div key={card.label} variants={cardVariants}>
                <motion.div
                  className="bento-card p-4 h-full"
                  style={{ borderLeft: `3px solid ${card.color}` }}
                  animate={card.glow ? {
                    boxShadow: [
                      `0 0 0px ${card.color}00`,
                      `0 0 18px ${card.color}40`,
                      `0 0 0px ${card.color}00`,
                    ],
                  } : {}}
                  transition={card.glow ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 } : {}}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `rgba(${card.rgb},0.12)`, color: card.color }}>
                    <card.icon size={14} />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{card.label}</p>
                  <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-text)' }}>
                    {i < 3
                      ? <CountUp key={`${card.label}-${card.value}`} target={card.value} format={fmtCurrency} />
                      : <CountUp key={`${card.label}-${card.value}`} target={card.value} />
                    }
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statement list */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="stmt-skeletons" className="space-y-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {[0,1,2].map(i => <ShimmerStmt key={i} />)}
          </motion.div>
        ) : statements.length === 0 ? (
          <motion.div key="empty" className="bento-card p-12 text-center"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <FileText size={24} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No commission records yet. Statements are generated once commissions are created.</p>
          </motion.div>
        ) : (
          <motion.div key="stmts" className="space-y-3"
            variants={listVariants} initial="hidden" animate="show">
            {statements.map(stmt => (
              <motion.div key={stmt.monthKey} variants={itemVariants}>
                <StatementCard stmt={stmt} agentName={agentName} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
