'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ArrowLeft, Loader2, Send, CheckCircle2, Ban, Mail } from 'lucide-react';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

interface InvoiceItem { id: string; description: string; quantity: number; unit_price_cents: number; total_cents: number; }
interface InvoiceDetail {
  id: string; reference: string; status: InvoiceStatus; notes: string | null;
  subtotal_cents: number; vat_cents: number; total_cents: number; due_at: string | null; quote_id: string | null;
  biztech_clients: { id: string; name: string } | null;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  draft:   { label: 'Draft',   color: 'var(--color-text3)' },
  sent:    { label: 'Sent',    color: 'var(--color-sky)' },
  paid:    { label: 'Paid',    color: '#5C3BCF' },
  overdue: { label: 'Overdue', color: 'var(--color-red)' },
  void:    { label: 'Void',    color: 'var(--color-text3)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function centsToRand(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export default function BizTechInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/biztech/invoices/${id}`);
    if (res.ok) {
      const data = await res.json();
      setInvoice(data.invoice);
      setItems(data.items ?? []);
    } else {
      setToast({ kind: 'error', message: 'Failed to load invoice' });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(status: InvoiceStatus) {
    setBusy(true);
    const res = await fetch(`/api/biztech/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) load(); else setToast({ kind: 'error', message: 'Failed to update status' });
  }

  async function sendReminder() {
    setBusy(true);
    const res = await fetch(`/api/biztech/invoices/${id}/remind`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      const { sentTo } = await res.json();
      setToast({ kind: 'success', message: `Reminder sent to ${sentTo}` });
    } else {
      const { error } = await res.json();
      setToast({ kind: 'error', message: error ?? 'Failed to send reminder' });
    }
  }

  if (loading && !invoice) {
    return <div className="p-12 flex items-center justify-center" style={PANEL}><Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} /></div>;
  }
  if (!invoice) {
    return <div className="p-12 text-center" style={PANEL}><p className="text-sm" style={{ color: 'var(--color-text3)' }}>Invoice not found.</p></div>;
  }

  const cfg = STATUS_CONFIG[invoice.status];

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <button onClick={() => router.push('/biztech/invoices')} className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: 'var(--color-text3)' }}>
        <ArrowLeft size={13} /> Back to invoices
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight font-mono" style={{ color: 'var(--color-text)' }}>{invoice.reference}</h1>
            <StatusDot label={cfg.label} color={cfg.color} />
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text2)' }}>
            {invoice.biztech_clients?.name ?? '—'}
            {invoice.quote_id && <span style={{ color: 'var(--color-text3)' }}> · converted from quote</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <button disabled={busy} onClick={() => setStatus('sent')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              <Send size={13} /> Mark as sent
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <>
              <button disabled={busy} onClick={() => setStatus('void')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}>
                <Ban size={13} /> Void
              </button>
              <button disabled={busy} onClick={sendReminder} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
                <Mail size={13} /> Send reminder
              </button>
              <button disabled={busy} onClick={() => setStatus('paid')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
                <CheckCircle2 size={13} /> Mark paid
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ ...PANEL, overflow: 'hidden' }}>
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
          <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text3)' }}>Subtotal</span><span style={{ color: 'var(--color-text2)' }}>{centsToRand(invoice.subtotal_cents)}</span></div>
          <div className="flex justify-between text-sm"><span style={{ color: 'var(--color-text3)' }}>VAT (15%)</span><span style={{ color: 'var(--color-text2)' }}>{centsToRand(invoice.vat_cents)}</span></div>
          <div className="flex justify-between text-base font-bold pt-1" style={{ borderTop: '1px solid var(--color-border2)' }}>
            <span style={{ color: 'var(--color-text)' }}>Total</span><span style={{ color: 'var(--color-text)' }}>{centsToRand(invoice.total_cents)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="p-6" style={PANEL}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Notes</h3>
          <p className="text-sm" style={{ color: 'var(--color-text2)' }}>{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
