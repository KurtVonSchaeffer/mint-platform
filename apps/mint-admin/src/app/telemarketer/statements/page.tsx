'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, DollarSign, TrendingUp, Calendar, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';

interface ApiCommission {
  id: string;
  client_name: string;
  commission_amount: number;
  status: string;
  payroll_date: string | null;
  paid_at: string | null;
  created_at: string;
  leads: { name: string; company: string } | null;
}

interface StatementEntry {
  client: string;
  company: string;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
}

interface MonthlyStatement {
  monthKey: string;
  label: string;
  sortKey: string;
  status: 'Paid' | 'Processing' | 'Pending';
  total: number;
  entries: StatementEntry[];
}

function fmt(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

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
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ label, sortKey, entries }) => {
      const allPaid       = entries.every(e => e.status === 'Paid');
      const anyPayroll    = entries.some(e => e.status === 'Payroll Ready' || e.status === 'Paid');
      const stmtStatus: MonthlyStatement['status'] = allPaid ? 'Paid' : anyPayroll ? 'Processing' : 'Pending';
      return {
        monthKey: sortKey,
        label,
        sortKey,
        status:  stmtStatus,
        total:   entries.reduce((s, e) => s + e.commissionAmount, 0),
        entries,
      };
    });
}

function StatementCard({ stmt }: { stmt: MonthlyStatement }) {
  const [expanded, setExpanded] = useState(false);
  const [pdfFlash, setPdfFlash] = useState(false);

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
            {stmt.entries.length} client{stmt.entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(stmt.total)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>total commission</p>
        </div>
        <div className="ml-2 shrink-0" style={{ color: 'var(--color-text3)' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border2)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Commission Status</th>
                <th>Paid At</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              {stmt.entries.map((entry, i) => (
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
                        background: entry.status === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                        color:      entry.status === 'Paid' ? '#10B981' : 'var(--color-text3)',
                        border:     `1px solid ${entry.status === 'Paid' ? 'rgba(16,185,129,0.2)' : 'var(--color-border2)'}`,
                      }}>
                      {entry.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                      {entry.paidAt
                        ? new Date(entry.paidAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm font-bold font-mono" style={{ color: '#34D399' }}>{fmt(entry.commissionAmount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-surface2)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              Total: <strong className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(stmt.total)}</strong>
            </p>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
              onClick={() => { setPdfFlash(true); setTimeout(() => setPdfFlash(false), 3500); }}>
              <Download size={12} /> {pdfFlash ? 'PDF export coming soon' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [loading,    setLoading]    = useState(true);

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

  const lifetimeTotal = statements.reduce((s, st) => s + st.total, 0);
  const paidTotal     = statements.filter(s => s.status === 'Paid').reduce((s, st) => s + st.total, 0);
  const currentMonth  = statements[0]?.total ?? 0;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Earnings history</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>Statements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Monthly commission statements — click to expand</p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Lifetime Earnings',   value: loading ? '—' : fmt(lifetimeTotal), color: '#A78BFA', rgb: '167,139,250', icon: TrendingUp  },
          { label: 'Total Paid Out',       value: loading ? '—' : fmt(paidTotal),     color: '#34D399', rgb: '52,211,153',  icon: DollarSign },
          { label: 'Current Month',        value: loading ? '—' : fmt(currentMonth),  color: '#60A5FA', rgb: '96,165,250',  icon: Calendar   },
          { label: 'Months on Record',     value: loading ? '—' : String(statements.length), color: '#FBBF24', rgb: '251,191,36', icon: FileText },
        ].map(card => (
          <div key={card.label} className="bento-card p-4" style={{ borderLeft: `3px solid ${card.color}` }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `rgba(${card.rgb},0.12)`, color: card.color }}>
              <card.icon size={14} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{card.label}</p>
            <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-text)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && statements.length === 0 && (
        <div className="bento-card p-12 text-center">
          <FileText size={24} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No commission records yet. Statements are generated once commissions are created.</p>
        </div>
      )}

      {!loading && statements.length > 0 && (
        <div className="space-y-3">
          {statements.map(stmt => (
            <StatementCard key={stmt.monthKey} stmt={stmt} />
          ))}
        </div>
      )}
    </div>
  );
}
