'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, Download } from 'lucide-react';

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
  const entries = Object.entries(byStatus);
  const total = entries.reduce((a, [, b]) => a + b, 0);
  if (total === 0) return <p className="text-xs" style={{ color: 'var(--color-text3)' }}>No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {entries.map(([status, count]) => (
        <div key={status}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="capitalize" style={{ color: 'var(--color-text2)' }}>{status.replace('_', ' ')}</span>
            <span className="font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{count}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border2)' }}>
            <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: '#5C3BCF' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function toCsv(rows: (string | number)[][]) {
  return rows.map(row => row.map(cell => {
    const s = String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BizTechReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/biztech/reports/summary');
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function exportInvoices() {
    setExporting('invoices');
    const res = await fetch('/api/biztech/invoices');
    const data = await res.json();
    const rows: (string | number)[][] = [
      ['Reference', 'Client', 'Status', 'Subtotal', 'VAT', 'Total', 'Issued', 'Due', 'Paid'],
      ...(data.invoices ?? []).map((i: Record<string, unknown>) => [
        i.reference as string,
        (i.biztech_clients as { name?: string } | null)?.name ?? '',
        i.status as string,
        ((i.subtotal_cents as number) / 100).toFixed(2),
        ((i.vat_cents as number) / 100).toFixed(2),
        ((i.total_cents as number) / 100).toFixed(2),
        (i.issued_at as string) ?? '',
        (i.due_at as string) ?? '',
        (i.paid_at as string) ?? '',
      ]),
    ];
    downloadCsv(`biztech-invoices-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    setExporting(null);
  }

  async function exportQuotes() {
    setExporting('quotes');
    const res = await fetch('/api/biztech/quotes');
    const data = await res.json();
    const rows: (string | number)[][] = [
      ['Reference', 'Client', 'Status', 'Subtotal', 'VAT', 'Total', 'Valid until', 'Created'],
      ...(data.quotes ?? []).map((q: Record<string, unknown>) => [
        q.reference as string,
        (q.biztech_clients as { name?: string } | null)?.name ?? '',
        q.status as string,
        ((q.subtotal_cents as number) / 100).toFixed(2),
        ((q.vat_cents as number) / 100).toFixed(2),
        ((q.total_cents as number) / 100).toFixed(2),
        (q.valid_until as string) ?? '',
        (q.created_at as string) ?? '',
      ]),
    ];
    downloadCsv(`biztech-quotes-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    setExporting(null);
  }

  async function exportClients() {
    setExporting('clients');
    const res = await fetch('/api/biztech/clients');
    const data = await res.json();
    const rows: (string | number)[][] = [
      ['Name', 'Industry', 'Website', 'Status', 'Added'],
      ...(data.clients ?? []).map((c: Record<string, unknown>) => [
        c.name as string,
        (c.industry as string) ?? '',
        (c.website as string) ?? '',
        c.status as string,
        (c.created_at as string) ?? '',
      ]),
    ];
    downloadCsv(`biztech-clients-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    setExporting(null);
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Revenue, pipeline, and delivery at a glance</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
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
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Export CSV</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'invoices', label: 'Invoices', fn: exportInvoices },
                { key: 'quotes', label: 'Quotes', fn: exportQuotes },
                { key: 'clients', label: 'Clients', fn: exportClients },
              ].map(({ key, label, fn }) => (
                <button
                  key={key}
                  onClick={fn}
                  disabled={exporting === key}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                >
                  {exporting === key ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
