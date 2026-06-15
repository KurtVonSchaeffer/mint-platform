'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import Link from 'next/link';
import {
  CheckCircle, AlertCircle, Download, TrendingUp, Clock, Loader2, ChevronDown, CreditCard,
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

type BillingStatus = 'paid' | 'trial' | 'suspended';

function billingStatus(client: ClientRow): BillingStatus {
  if (client.status === 'suspended' || client.status === 'churned') return 'suspended';
  if (client.status === 'trial') return 'trial';
  return 'paid';
}

function buildMonths(): { id: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      id:    d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
    };
  });
}

const MONTHS = buildMonths();

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}

export default function BillingPage() {
  const [clients, setClients]   = useState<ClientRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState(() => new Date().toISOString().slice(0, 7));
  const [toast, setToast]       = useState<{ kind: ToastKind; message: string } | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('fetch failed');
      const { clients: raw } = await res.json();
      if (Array.isArray(raw)) setClients(raw as ClientRow[]);
    } catch {
      setToast({ kind: 'error', message: 'Could not load billing data — check Supabase env vars.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadClients(); }, [loadClients]);

  const rows = useMemo(() =>
    clients
      .filter((c) => c.status !== 'churned')
      .map((c) => ({ ...c, billingStatus: billingStatus(c) })),
    [clients],
  );

  const mrr         = rows.filter((r) => r.billingStatus === 'paid').reduce((s, r) => s + r.monthly_fee_cents / 100, 0);
  const trialMRR    = rows.filter((r) => r.billingStatus === 'trial').reduce((s, r) => s + r.monthly_fee_cents / 100, 0);
  const payingCount = rows.filter((r) => r.billingStatus === 'paid').length;

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
            {loading
              ? <div className="h-8 w-28 rounded-lg animate-pulse mt-1" style={{ background: 'var(--color-surface2)' }} />
              : <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(mrr * 100)}</p>}
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>{payingCount} paying client{payingCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="bento-card p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} style={{ color: 'var(--color-sky)' }} />
              <p className="eyebrow" style={{ color: 'var(--color-sky)' }}>Trial / pipeline</p>
            </div>
            {loading
              ? <div className="h-8 w-28 rounded-lg animate-pulse mt-1" style={{ background: 'var(--color-surface2)' }} />
              : <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(trialMRR * 100)}</p>}
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>Converting to paid</p>
          </div>
          <Link href="/invoices" className="bento-card p-5 block group">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={12} style={{ color: 'var(--color-amber)' }} />
              <p className="eyebrow" style={{ color: 'var(--color-amber)' }}>Invoices</p>
            </div>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>View all</p>
            <p className="text-xs mt-1.5 group-hover:underline" style={{ color: 'var(--color-violet)' }}>Open invoice manager →</p>
          </Link>
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
          ) : rows.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.08)' }}>
                <CreditCard size={20} style={{ color: 'var(--color-violet)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No clients yet</p>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>Add clients to start tracking billing.</p>
              <Link
                href="/clients?new=1"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)' }}
              >
                Add first client →
              </Link>
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
                    <td>
                      <Link href={`/clients/${row.id}`} className="font-semibold hover:text-[var(--color-violet)] transition-colors" style={{ color: 'var(--color-text)' }}>
                        {row.name}
                      </Link>
                    </td>
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
