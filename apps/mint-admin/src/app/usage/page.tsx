'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

interface RollupRow {
  client_id: string; service: string;
  total_quantity: number; total_cost_cents: number; month: string;
}

interface ClientRow {
  id: string; name: string; slug: string;
  api_quota: number | null; status: string;
}

interface MonthOption { id: string; label: string; }

const SERVICE_LABELS: Record<string, string> = {
  trueid_lookup:      'TruID lookups',
  experian_score:     'Experian scores',
  docuseal_envelope:  'DocuSeal envelopes',
  sacrra_submission:  'SACRRA submissions',
  sure_systems_pull:  'Sure Systems pulls',
  sms_outbound:       'SMS sent',
  email_outbound:     'Emails sent',
  api_call:           'API calls',
  loan_registered:    'Loans registered',
  loan_disbursed:     'Loans disbursed',
};

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}

export default function UsagePage() {
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0, 7));
  const [rollup,   setRollup]   = useState<RollupRow[]>([]);
  const [clients,  setClients]  = useState<ClientRow[]>([]);
  const [months,   setMonths]   = useState<MonthOption[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?month=${m}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setRollup(data.rollup ?? []);
      setClients(data.clients ?? []);
      setMonths(data.months ?? []);
    } catch {
      setToast({ kind: 'error', message: 'Could not load usage data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [load, month]);

  // ── Aggregations ─────────────────────────────────────────────────────
  const totalEvents = rollup.reduce((s, r) => s + r.total_quantity, 0);
  const totalCost   = rollup.reduce((s, r) => s + r.total_cost_cents, 0);

  // Aggregate by service across all clients
  const byService = rollup.reduce<Record<string, { qty: number; cost: number }>>((acc, r) => {
    if (!acc[r.service]) acc[r.service] = { qty: 0, cost: 0 };
    acc[r.service].qty  += r.total_quantity;
    acc[r.service].cost += r.total_cost_cents;
    return acc;
  }, {});
  const serviceRows = Object.entries(byService)
    .sort((a, b) => b[1].qty - a[1].qty);

  // Aggregate by client
  const byClient = rollup.reduce<Record<string, { qty: number; cost: number }>>((acc, r) => {
    if (!acc[r.client_id]) acc[r.client_id] = { qty: 0, cost: 0 };
    acc[r.client_id].qty  += r.total_quantity;
    acc[r.client_id].cost += r.total_cost_cents;
    return acc;
  }, {});

  const clientRows = clients.map(c => ({
    ...c,
    calls: byClient[c.id]?.qty ?? 0,
    cost:  byClient[c.id]?.cost ?? 0,
    quota: c.api_quota ?? 10000,
  })).sort((a, b) => b.calls - a.calls);

  function exportCSV() {
    const lines = [
      ['Service', 'Quantity', 'Cost (ZAR)'].join(','),
      ...serviceRows.map(([svc, v]) => [SERVICE_LABELS[svc] ?? svc, v.qty, (v.cost / 100).toFixed(2)].join(',')),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `usage-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
    setToast({ kind: 'success', message: `Exported usage for ${months.find(m => m.id === month)?.label ?? month}.` });
  }

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Telemetry</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>API Usage</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Pass-through service consumption across all live deployments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={e => { setMonth(e.target.value); }}
              className="field-input cursor-pointer"
              style={{ width: 'auto' }}
            >
              {months.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button
              onClick={() => load(month)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-purple2)' }} />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bento-card p-5">
                <p className="eyebrow mb-1">Total events</p>
                <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{totalEvents.toLocaleString()}</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>across all services</p>
              </div>
              <div className="bento-card p-5">
                <p className="eyebrow mb-1">Pass-through cost</p>
                <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(totalCost)}</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-amber)' }}>billed at cost to clients</p>
              </div>
              <div className="bento-card p-5">
                <p className="eyebrow mb-1">Active clients</p>
                <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>
                  {Object.keys(byClient).length}
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>with recorded usage</p>
              </div>
            </div>

            {/* Service breakdown */}
            {serviceRows.length === 0 ? (
              <div className="bento-card p-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
                No usage data for {months.find(m => m.id === month)?.label ?? month}.
              </div>
            ) : (
              <div className="bento-card overflow-hidden p-0">
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  <p className="eyebrow">Service breakdown</p>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Service', 'Events', 'Total cost', '% of spend'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRows.map(([svc, v], i) => {
                      const pct = totalCost > 0 ? Math.round((v.cost / totalCost) * 100) : 0;
                      return (
                        <tr key={svc} style={{ animation: 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${i * 40}ms` }}>
                          <td style={{ color: 'var(--color-text2)' }}>{SERVICE_LABELS[svc] ?? svc}</td>
                          <td className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>{v.qty.toLocaleString()}</td>
                          <td className="font-mono" style={{ color: 'var(--color-amber)' }}>{fmt(v.cost)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 60 }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-violet)' }} />
                              </div>
                              <span className="text-xs font-mono shrink-0" style={{ color: 'var(--color-text3)' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per-client quota */}
            {clientRows.length > 0 && (
              <div className="bento-card p-6">
                <p className="eyebrow mb-4">Client quota usage</p>
                <div className="space-y-4">
                  {clientRows.map(c => {
                    const pct = c.quota === 0 ? 0 : Math.min(100, Math.round((c.calls / c.quota) * 100));
                    const barColor = pct >= 80 ? 'var(--color-red)' : pct >= 60 ? 'var(--color-amber)' : 'var(--color-green)';
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                          <span className="font-mono text-xs" style={{ color: 'var(--color-text3)' }}>
                            {c.calls.toLocaleString()} / {c.quota.toLocaleString()} · {fmt(c.cost)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 8px ${barColor}` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
