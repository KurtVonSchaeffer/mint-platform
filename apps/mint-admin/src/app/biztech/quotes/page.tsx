'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { RefreshCw, Plus, X, Loader2, Inbox, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

interface Quote {
  id: string; reference: string; status: QuoteStatus; total_cents: number;
  created_at: string; biztech_clients: { name: string } | null;
}

interface BizClient { id: string; name: string; }

const STATUS_CONFIG: Record<QuoteStatus, { label: string; bg: string; border: string; color: string }> = {
  draft:    { label: 'Draft',    bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
  sent:     { label: 'Sent',     bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)' },
  accepted: { label: 'Accepted', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)',  color: '#A78BFA' },
  declined: { label: 'Declined', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)' },
  expired:  { label: 'Expired',  bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: 'var(--color-amber)' },
};

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
      <div className="bento-card w-full max-w-xl p-7 max-h-[90vh] overflow-y-auto">
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
              className="text-xs mt-2 cursor-pointer" style={{ color: '#A78BFA' }}>
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
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #5C3BCF 0%, #7C5CE0 100%)' }}>
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
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <NewQuoteModal clients={clients} onClose={() => setAddOpen(false)} onCreated={load} />}

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">MINT BizTech</p>
          <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Quotes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Pricing proposals sent to BizTech clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => clients.length ? setAddOpen(true) : setToast({ kind: 'error', message: 'Add a client first' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #5C3BCF 0%, #7C5CE0 100%)' }}
          >
            <Plus size={14} /> New quote
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bento-card p-12 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : quotes.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(92,59,207,0.1)', color: '#5C3BCF' }}>
            <Inbox size={20} />
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No quotes yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
            Create a quote for a BizTech client to get started.
          </p>
        </div>
      ) : (
        <div className="bento-card overflow-hidden p-0">
          <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
              {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} · newest first
            </span>
          </div>
          <div>
            {quotes.map(q => {
              const cfg = STATUS_CONFIG[q.status];
              return (
                <article
                  key={q.id}
                  onClick={() => router.push(`/biztech/quotes/${q.id}`)}
                  className="p-5 flex items-center justify-between cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(92,59,207,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-xs" style={{ color: 'var(--color-text3)' }}>{q.reference}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="font-semibold text-sm mt-1" style={{ color: 'var(--color-text)' }}>{q.biztech_clients?.name ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{centsToRand(q.total_cents)}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
