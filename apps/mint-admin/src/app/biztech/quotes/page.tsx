'use client';

import { useState, useEffect, useCallback } from 'react';
import { Toast, type ToastKind } from '@/components/Toast';
import { BiztechQuoteDetailPanel, type BiztechQuoteDetail, type BiztechQuoteItem } from '@/components/biztech/BiztechQuoteDetailPanel';
import { printableBiztechDoc } from '@/lib/biztech-doc-template';
import { fmt, fmtDate } from '@/lib/invoice-helpers';
import { Plus, X, Loader2, Trash2, Download, Send, CheckCircle, Sparkles } from 'lucide-react';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

interface Quote {
  id: string; reference: string; status: QuoteStatus; total_cents: number;
  valid_until: string | null; created_at: string; biztech_clients: { name: string } | null;
}

interface BizClient { id: string; name: string; }

const STATUS_STYLE: Record<QuoteStatus, { bg: string; border: string; color: string }> = {
  draft:    { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
  sent:     { bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)',  color: 'var(--color-sky)' },
  accepted: { bg: 'rgba(92,59,207,0.1)',   border: 'rgba(92,59,207,0.3)',    color: '#5C3BCF' },
  declined: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)' },
  expired:  { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: 'var(--color-amber)' },
};

const FIELD: React.CSSProperties = {};

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
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(92,59,207,0.22)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(92,59,207,0.16), 0 0 60px rgba(92,59,207,0.12)',
          animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg, #5C3BCF, #DDC357)' }} />
        <div className="p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New quote</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Client</label>
            <select required className="field-input" style={FIELD} value={clientId} onChange={e => setClientId(e.target.value)}>
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
            <div className="grid gap-x-2 mb-1.5" style={{ gridTemplateColumns: '1fr 64px 96px 96px 24px' }}>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Description</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Qty</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Unit price</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--color-text3)' }}>Total</span>
              <span />
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 64px 96px 96px 24px' }}>
                  <input type="text" placeholder="e.g. Website revamp" required className="field-input" value={it.description}
                    onChange={e => updateItem(idx, { description: e.target.value })} />
                  <input type="number" min={1} className="field-input" value={it.quantity}
                    onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
                  <input type="number" min={0} step={0.01} placeholder="0.00" className="field-input"
                    value={it.unit_price_cents / 100}
                    onChange={e => updateItem(idx, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} />
                  <span className="text-xs font-mono text-right tabular-nums" style={{ color: 'var(--color-text2)' }}>
                    {fmt(it.quantity * it.unit_price_cents)}
                  </span>
                  {items.length > 1 ? (
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="cursor-pointer p-1 justify-self-end" style={{ color: 'var(--color-text3)' }}>
                      <Trash2 size={14} />
                    </button>
                  ) : <span />}
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
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(subtotal)}</span>
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
    </div>
  );
}

export default function BizTechQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<BizClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | QuoteStatus>('all');
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [selected, setSelected] = useState<{ quote: BiztechQuoteDetail; items: BiztechQuoteItem[] } | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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

  const openQuote = useCallback(async (id: string) => {
    const res = await fetch(`/api/biztech/quotes/${id}`);
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to load quote' }); return; }
    const data = await res.json();
    setSelected({ quote: data.quote, items: data.items ?? [] });
  }, []);

  async function patchStatus(id: string, action: 'sent' | 'accepted' | 'declined') {
    setActioning(id + action);
    const res = await fetch(`/api/biztech/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action }),
    });
    setActioning(null);
    if (!res.ok) { setToast({ kind: 'error', message: 'Action failed' }); return; }
    const data = await res.json();
    setSelected(prev => prev && prev.quote.id === id ? { ...prev, quote: data.quote } : prev);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: data.quote.status } : q));
    setToast({ kind: 'success', message: `Quote ${action === 'sent' ? 'sent' : action === 'accepted' ? 'marked as accepted' : 'marked as declined'}` });
  }

  function doAction(quote: BiztechQuoteDetail, action: 'sent' | 'accepted' | 'declined') {
    return patchStatus(quote.id, action);
  }

  async function convertToInvoice(quote: BiztechQuoteDetail) {
    setActioning(quote.id + 'convert');
    const res = await fetch(`/api/biztech/quotes/${quote.id}/convert`, { method: 'POST' });
    const data = await res.json();
    setActioning(null);
    if (!res.ok) { setToast({ kind: 'error', message: data.error ?? 'Failed to convert quote' }); return; }
    setToast({ kind: 'success', message: `Invoice ${data.invoice.reference} created` });
    setSelected(null);
    load();
  }

  function downloadPDF(quote: BiztechQuoteDetail, items: BiztechQuoteItem[]) {
    const w = window.open('', '_blank', 'width=820,height=1200');
    if (!w) { setToast({ kind: 'error', message: 'Pop-up blocked — allow pop-ups for this site.' }); return; }
    w.document.write(printableBiztechDoc({
      kind: 'Quote',
      reference: quote.reference,
      clientName: quote.biztech_clients?.name ?? '—',
      status: quote.status,
      dateLabel: 'Valid until',
      dateValue: quote.valid_until,
      subtotal_cents: quote.subtotal_cents,
      vat_cents: quote.vat_cents,
      total_cents: quote.total_cents,
      notes: quote.notes,
      items,
    }));
    w.document.close();
    setTimeout(() => w.print(), 250);
  }

  async function quickDownload(id: string) {
    const res = await fetch(`/api/biztech/quotes/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    downloadPDF(data.quote, data.items ?? []);
  }

  const filtered      = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const totalQuoted   = quotes.filter(q => q.status !== 'declined' && q.status !== 'expired').reduce((s, q) => s + q.total_cents, 0);
  const accepted      = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + q.total_cents, 0);
  const pending        = quotes.filter(q => q.status === 'sent').reduce((s, q) => s + q.total_cents, 0);
  const acceptedPct   = totalQuoted > 0 ? Math.min(100, (accepted / totalQuoted) * 100) : 0;
  const pendingPct    = totalQuoted > 0 ? Math.min(100, (pending / totalQuoted) * 100) : 0;

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <NewQuoteModal clients={clients} onClose={() => setAddOpen(false)} onCreated={load} />}

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">Pipeline</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Quotes</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Pricing proposals sent to BizTech clients</p>
        </div>
        <button
          onClick={() => clients.length ? setAddOpen(true) : setToast({ kind: 'error', message: 'Add a client first' })}
          className="btn-purple btn-shine inline-flex items-center gap-1.5"
        >
          <Plus size={15} /> New quote
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bento-card p-5 overflow-hidden">
          <p className="eyebrow mb-1">Total quoted</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(totalQuoted)}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-text3)' }}>
            {quotes.filter(q => q.status !== 'declined' && q.status !== 'expired').length} active quotes
          </p>
        </div>
        <div className="bento-card p-5 overflow-hidden">
          <p className="eyebrow mb-1">Accepted</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(accepted)}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: '#5C3BCF' }}>
            {quotes.filter(q => q.status === 'accepted').length} accepted
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--color-border2)' }}>
            <div style={{ height: '100%', width: `${acceptedPct}%`, background: 'linear-gradient(90deg,#5C3BCF,#8b6ce8)', transition: 'width 1s ease-out' }} />
          </div>
        </div>
        <div className="bento-card p-5 overflow-hidden">
          <p className="eyebrow mb-1">Awaiting response</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(pending)}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-sky)' }}>
            {quotes.filter(q => q.status === 'sent').length} sent
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--color-border2)' }}>
            <div style={{ height: '100%', width: `${pendingPct}%`, background: 'linear-gradient(90deg,var(--color-sky),rgba(56,189,248,0.4))', transition: 'width 1s ease-out' }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'draft', 'sent', 'accepted', 'declined', 'expired'] as const).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
              style={{
                background: isActive ? 'linear-gradient(135deg, #5C3BCF, #8b6ce8)' : 'rgba(255,255,255,0.04)',
                color: isActive ? '#fff' : 'var(--color-text3)',
                border: isActive ? 'none' : '1px solid var(--color-border2)',
                boxShadow: isActive ? '0 2px 12px rgba(92,59,207,0.35)' : 'none',
              }}
            >
              {f === 'all' ? 'All' : f}
              {f !== 'all' ? (
                <span className="ml-1.5 tabular-nums" style={{ opacity: isActive ? 0.75 : 0.5 }}>
                  {quotes.filter(q => q.status === f).length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="bento-card overflow-hidden p-0">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" style={{ color: '#8b6ce8' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading quotes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
            {quotes.length === 0 ? 'No quotes yet. Create a quote for a BizTech client to get started.' : 'No quotes match.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>{['Reference', 'Client', 'Amount', 'Valid until', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const s = STATUS_STYLE[q.status];
                const isHov = hoveredRow === q.id;
                const isOther = hoveredRow !== null && !isHov;
                return (
                  <tr
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => openQuote(q.id)}
                    onMouseEnter={() => setHoveredRow(q.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: `${Math.min(i, 12) * 35}ms`,
                      background: isHov ? 'rgba(92,59,207,0.05)' : 'transparent',
                      opacity: isOther ? 0.55 : 1,
                      transition: 'background 0.15s ease, opacity 0.15s ease',
                    }}
                  >
                    <td className="font-mono text-xs" style={{ color: '#5C3BCF' }}>{q.reference}</td>
                    <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{q.biztech_clients?.name ?? '—'}</td>
                    <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(q.total_cents)}</td>
                    <td className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>{fmtDate(q.valid_until)}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                        {q.status === 'sent' && (
                          <span className="relative inline-flex w-1.5 h-1.5 shrink-0">
                            <span className="absolute inset-0 rounded-full" style={{ background: 'var(--color-sky)', animation: 'radar-ring 2s ease-out infinite' }} />
                            <span className="relative rounded-full w-1.5 h-1.5" style={{ background: 'var(--color-sky)' }} />
                          </span>
                        )}
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <div
                        className="flex items-center gap-1 justify-end"
                        onClick={(e) => e.stopPropagation()}
                        style={{ opacity: isHov ? 1 : 0.22, transform: isHov ? 'translateX(0)' : 'translateX(5px)', transition: 'opacity 0.18s ease, transform 0.18s ease' }}
                      >
                        <button title="Download PDF" onClick={() => quickDownload(q.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                          <Download size={14} />
                        </button>
                        {q.status === 'draft' && (
                          <button
                            title="Send quote"
                            onClick={() => patchStatus(q.id, 'sent')}
                            disabled={actioning === q.id + 'sent'}
                            className="p-1.5 rounded-lg disabled:opacity-50"
                            style={{ color: 'var(--color-sky)' }}
                          >
                            {actioning === q.id + 'sent' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          </button>
                        )}
                        {q.status === 'sent' && (
                          <button
                            title="Mark as accepted"
                            onClick={() => patchStatus(q.id, 'accepted')}
                            disabled={actioning === q.id + 'accepted'}
                            className="p-1.5 rounded-lg disabled:opacity-50"
                            style={{ color: 'var(--color-green)' }}
                          >
                            {actioning === q.id + 'accepted' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          </button>
                        )}
                        {q.status === 'accepted' && (
                          <button title="Convert to invoice" onClick={() => openQuote(q.id)} className="p-1.5 rounded-lg" style={{ color: '#5C3BCF' }}>
                            <Sparkles size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <BiztechQuoteDetailPanel
          quote={selected.quote}
          items={selected.items}
          actioning={actioning}
          onClose={() => setSelected(null)}
          onAction={doAction}
          onConvert={convertToInvoice}
          onDownloadPDF={downloadPDF}
        />
      )}
    </div>
  );
}
