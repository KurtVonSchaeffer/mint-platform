'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, FilePlus, ChevronDown } from 'lucide-react';

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
}

interface GenerateResult {
  invoicesCreated: number;
  invoicesSkipped: number;
  totalCents:      number;
  errors:          { clientName: string; error: string }[];
}

interface ClientOption { id: string; name: string; slug: string; }

export function GenerateInvoicesModal({ onClose, onGenerated, defaultClientId }: {
  onClose:          () => void;
  onGenerated:      (result: Omit<GenerateResult, 'invoicesSkipped'>) => void;
  defaultClientId?: string;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth]         = useState(currentMonth);
  const [clientId, setClientId]   = useState(defaultClientId ?? '');
  const [clients, setClients]     = useState<ClientOption[]>([]);
  const [running, setRunning]     = useState(false);
  const [result, setResult]       = useState<GenerateResult | null>(null);

  const MONTH_OPTIONS = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const iso = d.toISOString().slice(0, 7);
    return { value: iso, label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) };
  });

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.clients)) {
          setClients(d.clients.map((c: ClientOption) => ({ id: c.id, name: c.name, slug: c.slug })));
        }
      })
      .catch(() => { /* no Supabase in dev — leave empty */ });
  }, []);

  async function run() {
    setRunning(true);
    try {
      const body: Record<string, string> = { month };
      if (clientId) body.clientId = clientId;
      const res  = await fetch('/api/billing/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setResult(data);
      onGenerated(data);
    } catch (err) {
      setResult({ invoicesCreated: 0, invoicesSkipped: 0, totalCents: 0, errors: [{ clientName: 'System', error: String(err) }] });
    } finally {
      setRunning(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId);
  const scopeLabel     = clientId && selectedClient ? selectedClient.name : 'all active & trial clients';

  return (
    <div
      className="fixed inset-0 confirm-backdrop z-50 flex items-center justify-center p-4"
      style={{ animation: 'fade-in 0.2s ease-out both' }}
      onClick={result ? onClose : undefined}
    >
      <div
        className="bento-card w-full max-w-md overflow-hidden"
        style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>
              <FilePlus size={14} />
            </div>
            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Generate invoices</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-fill-subtle)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-7">
          {!result ? (
            <>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text3)' }}>
                Generates draft invoices for <strong style={{ color: 'var(--color-text2)' }}>{scopeLabel}</strong> for the selected month.
                Existing invoices are skipped.
              </p>

              {/* Client selector */}
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>Client</label>
              <div className="relative mb-4">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="field-input w-full appearance-none cursor-pointer pr-8"
                >
                  <option value="">All active & trial clients</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
              </div>

              {/* Month selector */}
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>Billing month</label>
              <div className="relative mb-5">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="field-input w-full appearance-none cursor-pointer pr-8"
                >
                  {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
              </div>

              <div className="rounded-xl p-3 mb-5 space-y-1 text-xs" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--color-text2)' }}>
                <p>✓ One-time activation fee for clients activated this month</p>
                <p>✓ Licence fees with pro-rata for mid-month activations</p>
                <p>✓ Per-API usage costs (TruID, Experian, SACRRA, e-contracts, calls)</p>
                <p>✓ VAT at 15% applied automatically</p>
                <p>✓ Invoices created as <strong>Draft</strong> — review before sending</p>
              </div>
              <button
                onClick={run}
                disabled={running}
                className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
                {running ? 'Generating…' : `Generate draft${clientId ? '' : 's'}`}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-5"
                style={result.errors.length === 0 ? {
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                } : {
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                <p className="text-sm font-bold mb-1" style={{ color: result.errors.length === 0 ? 'var(--color-green)' : 'var(--color-amber)' }}>
                  {result.invoicesCreated} invoice{result.invoicesCreated !== 1 ? 's' : ''} created
                </p>
                <p className="text-xs" style={{ color: result.errors.length === 0 ? 'var(--color-green)' : 'var(--color-amber)' }}>
                  {fmt(result.totalCents)} total · {result.invoicesSkipped} skipped (already existed)
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl p-4 space-y-1 text-xs" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}>
                  <p className="font-bold mb-1">Errors ({result.errors.length})</p>
                  {result.errors.map((e, i) => (
                    <p key={i}><strong>{e.clientName}:</strong> {e.error}</p>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Close and review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
