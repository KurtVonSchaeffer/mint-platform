'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

interface Summary {
  clients: { total: number; byStatus: Record<string, number> };
  quotes: { total: number; byStatus: Record<string, number>; pipelineCents: number };
  invoices: { total: number; byStatus: Record<string, number>; revenueCents: number; outstandingCents: number };
  projects: { total: number; byStatus: Record<string, number> };
}

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function centsToRand(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function StatusBreakdown({ byStatus }: { byStatus: Record<string, number> }) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs" style={{ color: 'var(--color-text3)' }}>No data yet.</p>;
  return (
    <div className="space-y-1.5">
      {Object.entries(byStatus).map(([status, count]) => (
        <div key={status} className="flex items-center justify-between text-xs">
          <span className="capitalize" style={{ color: 'var(--color-text2)' }}>{status.replace('_', ' ')}</span>
          <span className="font-mono" style={{ color: 'var(--color-text)' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function BizTechReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/biztech/reports/summary');
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Revenue, pipeline, and delivery at a glance</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading || !summary ? (
        <div className="p-12 flex items-center justify-center" style={PANEL}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-5" style={PANEL}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text3)' }}>Revenue (paid invoices)</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: '#5C3BCF' }}>{centsToRand(summary.invoices.revenueCents)}</p>
            </div>
            <div className="p-5" style={PANEL}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text3)' }}>Outstanding (sent + overdue)</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-amber)' }}>{centsToRand(summary.invoices.outstandingCents)}</p>
            </div>
            <div className="p-5" style={PANEL}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text3)' }}>Quote pipeline (sent, unresolved)</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-sky)' }}>{centsToRand(summary.quotes.pipelineCents)}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="p-5" style={PANEL}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Clients ({summary.clients.total})</p>
              <StatusBreakdown byStatus={summary.clients.byStatus} />
            </div>
            <div className="p-5" style={PANEL}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Quotes ({summary.quotes.total})</p>
              <StatusBreakdown byStatus={summary.quotes.byStatus} />
            </div>
            <div className="p-5" style={PANEL}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Invoices ({summary.invoices.total})</p>
              <StatusBreakdown byStatus={summary.invoices.byStatus} />
            </div>
            <div className="p-5" style={PANEL}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Projects ({summary.projects.total})</p>
              <StatusBreakdown byStatus={summary.projects.byStatus} />
            </div>
          </div>

          <div className="p-5" style={PANEL}>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              PDF/Excel/CSV export isn&apos;t built yet — this page is a live read-only dashboard for now.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
