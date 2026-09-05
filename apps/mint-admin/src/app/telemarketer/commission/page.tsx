'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/telemarketer-agent';
import { DollarSign, Clock, CheckCircle2, Banknote, AlertCircle, Info, Loader2, RefreshCw } from 'lucide-react';

type CommissionStatus = 'Pending Collection' | 'Pending Payroll' | 'Payroll Ready' | 'Paid';

interface CommissionRow {
  id: string;
  client: string;
  company: string;
  clientStatus: string;
  payrollDate: string | null;
  commissionAmount: number;
  paymentMonth: string;
  status: CommissionStatus;
}

interface ApiCommission {
  id: string;
  client_name: string;
  commission_amount: number;
  status: string;
  payroll_date: string | null;
  paid_at: string | null;
  created_at: string;
  leads: { name: string; company: string; client_stage: string | null } | null;
}

const STATUS_CFG: Record<CommissionStatus, { bg: string; border: string; color: string }> = {
  'Pending Collection': { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)',  color: '#FBBF24' },
  'Pending Payroll':    { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  color: '#60A5FA' },
  'Payroll Ready':      { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  color: '#34D399' },
  'Paid':               { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: '#10B981' },
};

function mapCommission(c: ApiCommission): CommissionRow {
  const payrollDate = c.payroll_date ? new Date(c.payroll_date + 'T00:00:00') : null;
  return {
    id: c.id,
    client: c.client_name,
    company: c.leads?.company ?? '',
    clientStatus: c.leads?.client_stage ?? '',
    payrollDate: c.payroll_date,
    commissionAmount: c.commission_amount,
    paymentMonth: payrollDate
      ? payrollDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
      : '',
    status: (c.status as CommissionStatus) ?? 'Pending Collection',
  };
}

function fmt(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

export default function CommissionPage() {
  const router = useRouter();
  const [rows,         setRows]         = useState<CommissionRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | null>(null);

  useEffect(() => {
    getUserRole().then(role => {
      if (role !== 'super_admin') router.replace('/telemarketer');
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/telemarketer/my-commissions');
    if (res.ok) {
      const { commissions } = await res.json();
      setRows((commissions ?? []).map(mapCommission));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered          = statusFilter ? rows.filter(r => r.status === statusFilter) : rows;
  const pendingCollection = rows.filter(r => r.status === 'Pending Collection').reduce((s, r) => s + r.commissionAmount, 0);
  const commissionEarned  = rows.filter(r => ['Pending Payroll', 'Payroll Ready', 'Paid'].includes(r.status)).reduce((s, r) => s + r.commissionAmount, 0);
  const expectedPayroll   = rows.filter(r => r.status === 'Payroll Ready').reduce((s, r) => s + r.commissionAmount, 0);
  const totalPaid         = rows.filter(r => r.status === 'Paid').reduce((s, r) => s + r.commissionAmount, 0);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Earnings overview</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>Commission Centre</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            {loading ? 'Loading…' : `${rows.length} commission record${rows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Business rule callout */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.18)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA' }}>
          <Info size={14} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>When does commission become payable?</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text3)' }}>
            Commission is only paid once <strong className="font-semibold" style={{ color: '#34D399' }}>Compliance is Approved</strong> AND <strong className="font-semibold" style={{ color: '#34D399' }}>the First Deduction is Successful</strong>. Not when the client signs. Once both conditions are met, your commission moves to Payroll Ready and is included in your end-of-month payroll.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Commission Pending',   value: fmt(pendingCollection), sub: 'Awaiting deduction',  color: '#FBBF24', rgb: '251,191,36',  icon: Clock,        filter: 'Pending Collection' as CommissionStatus },
          { label: 'Commission Earned',    value: fmt(commissionEarned),  sub: 'Collected & payable', color: '#34D399', rgb: '52,211,153',  icon: CheckCircle2, filter: null as unknown as CommissionStatus },
          { label: 'Expected Payroll',     value: fmt(expectedPayroll),   sub: 'Payroll ready now',   color: '#A78BFA', rgb: '167,139,250', icon: Banknote,     filter: null as unknown as CommissionStatus },
          { label: 'Total Paid (All Time)', value: fmt(totalPaid),        sub: 'Historical earnings', color: '#10B981', rgb: '16,185,129',  icon: DollarSign,   filter: 'Paid' as CommissionStatus },
        ].map(card => (
          <button key={card.label}
            onClick={() => card.filter && setStatusFilter(prev => prev === card.filter ? null : card.filter)}
            className="bento-card p-5 text-left transition-all hover:-translate-y-0.5"
            style={{
              background: statusFilter === card.filter ? `rgba(${card.rgb},0.06)` : undefined,
              cursor: card.filter ? 'pointer' : 'default',
            }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${card.rgb},0.12)`, color: card.color }}>
                <card.icon size={15} />
              </div>
              {statusFilter === card.filter && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `rgba(${card.rgb},0.15)`, color: card.color }}>ACTIVE</span>
              )}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{card.label}</p>
            <p className="text-xl font-bold tracking-tight" style={{ color: loading ? 'var(--color-text3)' : 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
              {loading ? '' : card.value}
            </p>
            <p className="text-xs mt-1" style={{ color: card.color }}>{card.sub}</p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bento-card p-12 text-center">
          <AlertCircle size={24} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No commission records yet. Commission is created once a client reaches Compliance Approved.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setStatusFilter(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={statusFilter === null
                ? { background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.3)' }
                : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
              All ({rows.length})
            </button>
            {(Object.keys(STATUS_CFG) as CommissionStatus[]).map(s => {
              const count = rows.filter(r => r.status === s).length;
              if (count === 0) return null;
              const cfg = STATUS_CFG[s];
              return (
                <button key={s}
                  onClick={() => setStatusFilter(prev => prev === s ? null : s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={statusFilter === s
                    ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                    : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
                  {s} ({count})
                </button>
              );
            })}
          </div>

          {/* Commission table */}
          <div className="bento-card overflow-hidden p-0">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text3)' }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}{statusFilter ? ` · ${statusFilter}` : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Client Status</th>
                    <th>Payment Month</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const cfg = STATUS_CFG[row.status] ?? STATUS_CFG['Pending Collection'];
                    return (
                      <tr key={row.id} style={{ animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both` }}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                              {row.client.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{row.client}</p>
                              {row.company && <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{row.company}</p>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: row.clientStatus === 'Client Live' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                              color: row.clientStatus === 'Client Live' ? '#10B981' : 'var(--color-text3)',
                              border: `1px solid ${row.clientStatus === 'Client Live' ? 'rgba(16,185,129,0.2)' : 'var(--color-border2)'}`,
                            }}>
                            {row.clientStatus || ''}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>{row.paymentMonth}</span>
                        </td>
                        <td>
                          <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(row.commissionAmount)}</span>
                        </td>
                        <td>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
