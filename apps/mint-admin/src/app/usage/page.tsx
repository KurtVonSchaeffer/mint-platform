'use client';

import { useState, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';

interface Endpoint {
  endpoint: string;
  calls:    number;
  p99:      string;
  errors:   number;
  trend:    'up' | 'down' | 'flat';
}

interface ClientQuota {
  name:  string;
  calls: number;
  quota: number;
}

const ENDPOINTS: Endpoint[] = [
  { endpoint: 'POST /api/loans/apply',        calls: 4_821,  p99: '340ms', errors: 12, trend: 'up'   },
  { endpoint: 'GET  /api/loans/:id',          calls: 18_204, p99: '89ms',  errors: 2,  trend: 'up'   },
  { endpoint: 'POST /api/truid/connect',      calls: 1_103,  p99: '2.1s',  errors: 31, trend: 'up'   },
  { endpoint: 'POST /api/experian/score',     calls: 892,    p99: '1.4s',  errors: 8,  trend: 'down' },
  { endpoint: 'POST /api/documents/upload',   calls: 3_441,  p99: '620ms', errors: 5,  trend: 'up'   },
  { endpoint: 'POST /api/docuseal/send',      calls: 611,    p99: '410ms', errors: 1,  trend: 'up'   },
  { endpoint: 'POST /api/sacrra/export',      calls: 5,      p99: '8.2s',  errors: 0,  trend: 'flat' },
];

const CLIENTS: ClientQuota[] = [
  { name: 'BridgeCapital Finance',  calls: 14_820, quota: 20_000 },
  { name: 'Apex Credit Solutions',  calls: 7_403,  quota: 10_000 },
  { name: 'Nexus Business Finance', calls: 4_110,  quota: 10_000 },
  { name: 'Elevate Capital',        calls: 2_541,  quota: 10_000 },
  { name: 'Summit Lending',         calls: 203,    quota: 2_000  },
];

const MONTHS = [
  { id: '2026-05', label: 'May 2026'   },
  { id: '2026-04', label: 'April 2026' },
  { id: '2026-03', label: 'March 2026' },
];

export default function UsagePage() {
  const [month, setMonth]                       = useState('2026-05');
  const [endpointFilter, setEndpointFilter]     = useState<'all' | 'errors' | 'slow'>('all');
  const [toast, setToast]                       = useState<{ kind: ToastKind; message: string } | null>(null);

  const filteredEndpoints = useMemo(() => {
    if (endpointFilter === 'errors') return ENDPOINTS.filter((e) => e.errors > 0);
    if (endpointFilter === 'slow')   return ENDPOINTS.filter((e) => parseFloat(e.p99) > 1);
    return ENDPOINTS;
  }, [endpointFilter]);

  const totalCalls  = CLIENTS.reduce((s, c) => s + c.calls, 0);
  const totalErrors = ENDPOINTS.reduce((s, e) => s + e.errors, 0);
  const errorRate   = totalCalls === 0 ? 0 : Math.round((totalErrors / totalCalls) * 10000) / 100;

  function exportCSV() {
    const lines = [
      ['Section', 'Name', 'Calls', 'p99 Latency', 'Errors', 'Quota'].join(','),
      ...ENDPOINTS.map((e) => ['endpoint', `"${e.endpoint}"`, e.calls, e.p99, e.errors, ''].join(',')),
      ...CLIENTS.map((c)  => ['client',   `"${c.name}"`,      c.calls, '',    '',        c.quota].join(',')),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `algolend-api-usage-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ kind: 'success', message: `Exported usage report for ${MONTHS.find((m) => m.id === month)?.label}.` });
  }

  function refresh() {
    setToast({ kind: 'info', message: 'Refreshing from mint_telemetry Supabase… (pipeline scaffold in place, awaiting first deployment).' });
  }

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Telemetry</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>API Usage</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Aggregate counts across all client deployments — sourced from{' '}
              <code
                className="font-mono text-xs px-1 py-0.5 rounded"
                style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}
              >
                mint_telemetry
              </code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="field-input cursor-pointer"
              style={{ width: 'auto' }}
            >
              {MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Total calls</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{totalCalls.toLocaleString()}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>↗ 18% vs last month</p>
          </div>
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Error rate</p>
            <p
              className="text-3xl font-bold tracking-tight stat-value"
              style={{ color: errorRate > 1 ? 'var(--color-red)' : 'var(--color-amber)' }}
            >
              {errorRate}%
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>
              {totalErrors} errors across {totalCalls.toLocaleString()} calls
            </p>
          </div>
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Avg response time</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>312ms</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>↘ 8% vs last month</p>
          </div>
        </div>

        {/* Per-client quota */}
        <div className="bento-card p-6">
          <p className="eyebrow mb-4">Client quota usage</p>
          <div className="space-y-4">
            {CLIENTS.map((c) => {
              const pct = c.quota === 0 ? 0 : Math.round((c.calls / c.quota) * 100);
              const barColor = pct >= 80 ? 'var(--color-red)' : pct >= 60 ? 'var(--color-amber)' : 'var(--color-green)';
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                    <span className="font-mono text-xs" style={{ color: 'var(--color-text3)' }}>
                      {c.calls.toLocaleString()} / {c.quota.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: barColor,
                        boxShadow: `0 0 8px ${barColor}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Endpoint breakdown */}
        <div className="bento-card overflow-hidden p-0">
          <div
            className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
            style={{ borderBottom: '1px solid var(--color-border2)' }}
          >
            <p className="eyebrow">Endpoint breakdown</p>
            <div className="flex items-center gap-1.5">
              {(['all', 'errors', 'slow'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setEndpointFilter(f)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={endpointFilter === f ? {
                    background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                    color: '#fff',
                    boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--color-text3)',
                    border: '1px solid var(--color-border2)',
                  }}
                  onMouseEnter={(e) => { if (endpointFilter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                  onMouseLeave={(e) => { if (endpointFilter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  {f === 'all' ? 'All' : f === 'errors' ? 'With errors' : 'Slow (p99 > 1s)'}
                </button>
              ))}
            </div>
          </div>

          {filteredEndpoints.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
              No endpoints match the current filter.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {['Endpoint', 'Calls', 'p99 latency', 'Errors', 'Trend'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEndpoints.map((row, i) => (
                  <tr
                    key={row.endpoint}
                    style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
                  >
                    <td className="font-mono text-xs" style={{ color: 'var(--color-violet)' }}>{row.endpoint}</td>
                    <td className="font-bold" style={{ color: 'var(--color-text)' }}>{row.calls.toLocaleString()}</td>
                    <td className="font-mono text-xs" style={{ color: 'var(--color-text3)' }}>{row.p99}</td>
                    <td>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: row.errors > 10 ? 'var(--color-red)' :
                                 row.errors > 0  ? 'var(--color-amber)' :
                                                   'var(--color-green)',
                        }}
                      >
                        {row.errors}
                      </span>
                    </td>
                    <td>
                      {row.trend === 'up'   ? <TrendingUp   size={14} style={{ color: 'var(--color-green)' }} /> : null}
                      {row.trend === 'down' ? <TrendingDown size={14} style={{ color: 'var(--color-red)' }}   /> : null}
                      {row.trend === 'flat' ? <span style={{ color: 'var(--color-text3)' }}>—</span>             : null}
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
