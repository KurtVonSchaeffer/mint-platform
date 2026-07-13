'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ClientAvatar } from '@/components/biztech/ClientAvatar';
import { RefreshCw, Plus, X, Loader2, Inbox, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

interface Quote {
  id: string; reference: string; status: QuoteStatus; total_cents: number;
  created_at: string; biztech_clients: { name: string } | null;
}

interface BizClient { id: string; name: string; }

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
  draft:    { label: 'Draft',    color: 'var(--color-text3)' },
  sent:     { label: 'Sent',     color: 'var(--color-sky)' },
  accepted: { label: 'Accepted', color: '#5C3BCF' },
  declined: { label: 'Declined', color: 'var(--color-red)' },
  expired:  { label: 'Expired',  color: 'var(--color-amber)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function centsToRand(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function NewQuoteModal({ clients, onClose, onCreated }: { clients: BizClient[]; onClose: () => void; onCreated: () => void }) {
  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price_cents: 0 }]);
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, patch: Partial<typeof items[0]>) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/biztech/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, valid_until: validUntil || null, notes, items }),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0);

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl p-7 max-h-[90vh] overflow-y-auto" style={PANEL}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New quote</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Client</label>
            <select required className="field-input" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Valid until (optional)</label>
            <input type="date" className="field-input" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>

          <div className="pt-2">
            <p className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Line items</p>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input type="text" placeholder="Description" required className="field-input flex-1" value={it.description}
                    onChange={e => updateItem(idx, { description: e.target.value })} />
                  <input type="number" min={1} className="field-input w-16" value={it.quantity}
                    onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
                  <input type="number" min={0} placeholder="Price (R)" className="field-input w-28"
                    value={it.unit_price_cents / 100}
                    onChange={e => updateItem(idx, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} />
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="cursor-pointer p-2" style={{ color: 'var(--color-text3)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unit_price_cents: 0 }])}
              className="text-xs mt-2 cursor-pointer" style={{ color: '#5C3BCF' }}>
              + Add line item
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 text-sm" style={{ borderTop: '1px solid var(--color-border2)' }}>
            <span style={{ color: 'var(--color-text3)' }}>Subtotal (excl. VAT)</span>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{centsToRand(subtotal)}</span>
          </div>

          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes (optional)</label>
            <textarea className="field-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Creating…' : 'Create quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BizTechQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<BizClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, cRes] = await Promise.all([
      fetch('/api/biztech/quotes'),
      fetch('/api/biztech/clients'),
    ]);
    if (qRes.ok) setQuotes((await qRes.json()).quotes ?? []);
    else setToast({ kind: 'error', message: 'Failed to load quotes' });
    if (cRes.ok) setClients((await cRes.json()).clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <NewQuoteModal clients={clients} onClose={() => setAddOpen(false)} onCreated={load} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Quotes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Pricing proposals sent to BizTech clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => clients.length ? setAddOpen(true) : setToast({ kind: 'error', message: 'Add a client first' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#5C3BCF' }}
          >
            <Plus size={14} /> New quote
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center" style={PANEL}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : quotes.length === 0 ? (
        <div className="p-12 text-center" style={PANEL}>
          <Inbox size={20} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No quotes yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
            Create a quote for a BizTech client to get started.
          </p>
        </div>
      ) : (
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Reference</th>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Client</th>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Status</th>
                <th className="text-right font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Total</th>
                <th className="text-right font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => {
                const cfg = STATUS_CONFIG[q.status];
                return (
                  <tr
                    key={q.id}
                    onClick={() => router.push(`/biztech/quotes/${q.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: i < quotes.length - 1 ? '1px solid var(--color-border2)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--color-text3)' }}>{q.reference}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}><div className="flex items-center gap-2.5"><ClientAvatar name={q.biztech_clients?.name ?? '—'} />{q.biztech_clients?.name ?? '—'}</div></td>
                    <td className="px-4 py-2.5"><StatusDot label={cfg.label} color={cfg.color} /></td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>{centsToRand(q.total_cents)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-text3)' }}>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
