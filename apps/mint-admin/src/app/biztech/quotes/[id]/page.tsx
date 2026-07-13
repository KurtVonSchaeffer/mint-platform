'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ArrowLeft, Loader2, Send, CheckCircle2, XCircle, FileOutput } from 'lucide-react';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

interface QuoteItem { id: string; description: string; quantity: number; unit_price_cents: number; total_cents: number; }
interface QuoteDetail {
  id: string; reference: string; status: QuoteStatus; notes: string | null;
  subtotal_cents: number; vat_cents: number; total_cents: number; valid_until: string | null;
  biztech_clients: { id: string; name: string } | null;
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
  draft:    { label: 'Draft',    color: 'var(--color-text3)' },
  sent:     { label: 'Sent',     color: 'var(--color-sky)' },
  accepted: { label: 'Accepted', color: '#5C3BCF' },
  declined: { label: 'Declined', color: 'var(--color-red)' },
  expired:  { label: 'Expired',  color: 'var(--color-amber)' },
};

function centsToRand(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export default function BizTechQuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/biztech/quotes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setQuote(data.quote);
      setItems(data.items ?? []);
    } else {
      setToast({ kind: 'error', message: 'Failed to load quote' });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(status: QuoteStatus) {
    setBusy(true);
    const res = await fetch(`/api/biztech/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) load(); else setToast({ kind: 'error', message: 'Failed to update status' });
  }

  async function convert() {
    setBusy(true);
    const res = await fetch(`/api/biztech/quotes/${id}/convert`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      const { invoice } = await res.json();
      setToast({ kind: 'success', message: `Invoice ${invoice.reference} created` });
      router.push(`/biztech/invoices/${invoice.id}`);
    } else {
      const { error } = await res.json();
      setToast({ kind: 'error', message: error ?? 'Failed to convert quote' });
    }
  }

  if (loading && !quote) {
    return <div className="bento-card p-12 flex items-center justify-center"><Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} /></div>;
  }
  if (!quote) {
    return <div className="bento-card p-12 text-center"><p className="text-sm" style={{ color: 'var(--color-text3)' }}>Quote not found.</p></div>;
  }

  const cfg = STATUS_CONFIG[quote.status];

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <button onClick={() => router.push('/biztech/quotes')} className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: 'var(--color-text3)' }}>
        <ArrowLeft size={13} /> Back to quotes
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">MINT BizTech</p>
          <div className="flex items-center gap-3">
            <h1 className="headline text-3xl font-bold tracking-tight font-mono" style={{ color: 'var(--color-text)' }}>{quote.reference}</h1>
            <StatusDot label={cfg.label} color={cfg.color} />
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text2)' }}>{quote.biztech_clients?.name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === 'draft' && (
            <button disabled={busy} onClick={() => setStatus('sent')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              <Send size={13} /> Mark as sent
            </button>
          )}
          {quote.status === 'sent' && (
            <>
              <button disabled={busy} onClick={() => setStatus('accepted')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA' }}>
                <CheckCircle2 size={13} /> Mark accepted
              </button>
              <button disabled={busy} onClick={() => setStatus('declined')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--color-red)' }}>
                <XCircle size={13} /> Mark declined
              </button>
            </>
          )}
          {quote.status === 'accepted' && (
            <button disabled={busy} onClick={convert} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              <FileOutput size={13} /> Convert to invoice
            </button>
          )}
        </div>
      </div>

      <div className="bento-card overflow-hidden p-0">
        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Line items</span>
        </div>
        {items.map(it => (
          <div key={it.id} className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{it.description}</p>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{it.quantity} × {centsToRand(it.unit_price_cents)}</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{centsToRand(it.total_cents)}</p>
          </div>
        ))}
        <div className="px-6 py-4 space-y-1">
          <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text3)' }}>Subtotal</span><span style={{ color: 'var(--color-text2)' }}>{centsToRand(quote.subtotal_cents)}</span></div>
          <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text3)' }}>VAT (15%)</span><span style={{ color: 'var(--color-text2)' }}>{centsToRand(quote.vat_cents)}</span></div>
          <div className="flex justify-between text-base font-bold pt-1" style={{ borderTop: '1px solid var(--color-border2)' }}>
            <span style={{ color: 'var(--color-text)' }}>Total</span><span style={{ color: 'var(--color-text)' }}>{centsToRand(quote.total_cents)}</span>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="bento-card p-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Notes</h3>
          <p className="text-sm" style={{ color: 'var(--color-text2)' }}>{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
