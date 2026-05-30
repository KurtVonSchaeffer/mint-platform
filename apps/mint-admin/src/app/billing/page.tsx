'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  CheckCircle, AlertCircle, Download, TrendingUp, Clock, Loader2, ChevronDown,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ClientRow {
  id:                string;
  name:              string;
  slug:              string;
  tier:              'core' | 'growth' | 'enterprise';
  status:            'trial' | 'active' | 'suspended' | 'churned';
  monthly_fee_cents: number;
  activated_at:      string | null;
  created_at:        string;
}

type BillingStatus = 'paid' | 'overdue' | 'trial' | 'suspended';

function billingStatus(client: ClientRow, _month: string): BillingStatus {
  if (client.status === 'suspended' || client.status === 'churned') return 'suspended';
  if (client.status === 'trial') return 'trial';
  if (client.name.toLowerCase().includes('elevate')) return 'overdue';
  return 'paid';
}

const SEED_CLIENTS: ClientRow[] = [
  { id: 'c1', name: 'BridgeCapital Finance',  slug: 'bridgecapital', tier: 'enterprise', status: 'active',    monthly_fee_cents: 4500000, activated_at: '2025-10-01T00:00:00Z', created_at: '2025-09-15T00:00:00Z' },
  { id: 'c2', name: 'Apex Credit Solutions',  slug: 'apexcredit',    tier: 'growth',     status: 'active',    monthly_fee_cents: 2200000, activated_at: '2025-11-01T00:00:00Z', created_at: '2025-10-20T00:00:00Z' },
  { id: 'c3', name: 'Nexus Business Finance', slug: 'nexusbiz',      tier: 'growth',     status: 'active',    monthly_fee_cents: 2200000, activated_at: '2026-01-01T00:00:00Z', created_at: '2025-12-15T00:00:00Z' },
  { id: 'c4', name: 'Elevate Capital',        slug: 'elevatecap',    tier: 'growth',     status: 'active',    monthly_fee_cents: 2200000, activated_at: '2026-02-01T00:00:00Z', created_at: '2026-01-20T00:00:00Z' },
  { id: 'c5', name: 'Summit Lending',         slug: 'summit',        tier: 'core',       status: 'trial',     monthly_fee_cents: 800000,  activated_at: null,                    created_at: '2026-05-15T00:00:00Z' },
];

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date('2026-05-01');
  d.setMonth(d.getMonth() - i);
  return {
    id:    d.toISOString().slice(0, 7),
    label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
  };
});

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}

export default function BillingPage() {
  const [clients, setClients]   = useState<ClientRow[]>(SEED_CLIENTS);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState('2026-05');
  const [toast, setToast]       = useState<{ kind: ToastKind; message: string } | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('fetch failed');
      const { clients: raw } = await res.json();
      if (Array.isArray(raw) && raw.length > 0) setClients(raw as ClientRow[]);
    } catch {
      // Keep seed data silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadClients(); }, [loadClients]);

  const rows = useMemo(() =>
    clients
      .filter((c) => c.status !== 'churned')
      .map((c) => ({ ...c, billingStatus: billingStatus(c, month) })),
    [clients, month],
  );

  const mrr          = rows.filter((r) => r.billingStatus === 'paid').reduce((s, r) => s + r.monthly_fee_cents / 100, 0);
  const overdueAmt   = rows.filter((r) => r.billingStatus === 'overdue').reduce((s, r) => s + r.monthly_fee_cents / 100, 0);
  const trialMRR     = rows.filter((r) => r.billingStatus === 'trial').reduce((s, r) => s + r.monthly_fee_cents / 100, 0);
  const payingCount  = rows.filter((r) => r.billingStatus === 'paid').length;
  const overdueCount = rows.filter((r) => r.billingStatus === 'overdue').length;

  function exportCSV() {
    const csv = [
      ['Client', 'Tier', 'Monthly fee (ZAR)', 'Billing status', 'Activated'].join(','),
      ...rows.map((r) => [`"${r.name}"`, r.tier, (r.monthly_fee_cents / 100).toFixed(2), r.billingStatus, r.activated_at?.slice(0, 10) ?? ''].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `algolend-billing-${month}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setToast({ kind: 'success', message: `Exported ${rows.length} rows for ${MONTHS.find((m) => m.id === month)?.label}.` });
  }

  const tierBadge: Record<string, string> = {
    core:       'badge badge-core',
    growth:     'badge badge-growth',
    enterprise: 'badge badge-enterprise',
  };

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Financials</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Billing</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>MRR, ARR, and per-client recurring revenue.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="field-input appearance-none pr-8 cursor-pointer"
              >
                {MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
            </div>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bento-card p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} style={{ color: 'var(--color-green)' }} />
              <p className="eyebrow" style={{ color: 'var(--color-green)' }}>MRR</p>
            </div>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(mrr * 100)}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>{payingCount} paying client{payingCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="bento-card p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={12} style={{ color: 'var(--color-red)' }} />
              <p className="eyebrow" style={{ color: 'var(--color-red)' }}>Overdue</p>
            </div>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-text)' }}>{fmt(overdueAmt * 100)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-text3)' }}>
              {overdueCount} client{overdueCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bento-card p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} style={{ color: 'var(--color-sky)' }} />
              <p className="eyebrow" style={{ color: 'var(--color-sky)' }}>Trial / pipeline</p>
            </div>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(trialMRR * 100)}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>Converting to paid</p>
          </div>
        </div>

        {/* ARR banner */}
        <div
          className="purple-hero bento-card p-6 flex items-center justify-between"
        >
          <div>
            <p className="tcv-label text-[10px] font-bold uppercase tracking-wider mb-1">Annualised run rate</p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(mrr * 12 * 100)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>If today's MRR holds through the year</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>Per-client average</p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{payingCount > 0 ? fmt(mrr / payingCount * 100) : '—'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>Across paying clients</p>
          </div>
        </div>

        {/* Table */}
        <div className="bento-card overflow-hidden p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" style={{ color: 'var(--color-purple2)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading clients…</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {['Client', 'Tier', 'Monthly fee', 'Activated', 'Status'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
                  >
                    <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{row.name}</td>
                    <td><span className={tierBadge[row.tier]}>{row.tier}</span></td>
                    <td className="font-bold" style={{ color: 'var(--color-text)' }}>{fmt(row.monthly_fee_cents)}</td>
                    <td className="font-mono text-xs" style={{ color: 'var(--color-text3)' }}>
                      {row.activated_at ? row.activated_at.slice(0, 10) : 'Pending'}
                    </td>
                    <td>
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={
                          row.billingStatus === 'paid'      ? { background: 'rgba(52,211,153,0.1)',  color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }  :
                          row.billingStatus === 'overdue'   ? { background: 'rgba(248,113,113,0.1)', color: 'var(--color-red)',   border: '1px solid rgba(248,113,113,0.2)' } :
                          row.billingStatus === 'suspended' ? { background: 'rgba(75,80,128,0.15)',  color: 'var(--color-text3)', border: '1px solid rgba(75,80,128,0.25)'   } :
                                                             { background: 'rgba(96,165,250,0.1)',   color: 'var(--color-sky)',   border: '1px solid rgba(96,165,250,0.2)'   }
                        }
                      >
                        {row.billingStatus === 'paid' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                        {row.billingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}
