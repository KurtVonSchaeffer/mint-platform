'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Send, Mail, Download, FilePlus, CreditCard } from 'lucide-react';
import { fmt, fmtDate, statusStyle, typeStyle, type Invoice } from '@/lib/invoice-helpers';

type InvoiceAction = 'send' | 'mark_paid' | 'void';

interface Props {
  inv:                 Invoice;
  actioning:           string | null;
  onClose:             () => void;
  onAction:            (inv: Invoice, action: InvoiceAction) => void;
  onReminder:          (inv: Invoice) => void;
  onDownloadPDF:       (inv: Invoice) => void;
  onGenerateInvoice?:  (clientId: string) => void;
}

export function InvoiceDetailPanel({ inv, actioning, onClose, onAction, onReminder, onDownloadPDF, onGenerateInvoice }: Props) {
  const [pfLoading, setPfLoading] = useState(false);
  const [pfError,   setPfError]   = useState<string | null>(null);
  const [pfEnabled, setPfEnabled] = useState(false);

  // PayFast merchant credentials aren't configured yet — hide the button
  // until they are, rather than let people hit a broken checkout.
  useEffect(() => {
    fetch('/api/payfast/status')
      .then(r => r.ok ? r.json() : { enabled: false })
      .then(({ enabled }) => setPfEnabled(!!enabled))
      .catch(() => setPfEnabled(false));
  }, []);

  async function payViaPayFast() {
    setPfLoading(true);
    setPfError(null);
    try {
      const res  = await fetch('/api/payfast/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'once_off', invoice_id: inv.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

      // Auto-submit hidden form to PayFast
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.url;
      Object.entries(data.fields as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.type = 'hidden'; input.name = k; input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setPfError(String(err));
      setPfLoading(false);
    }
  }

  return (
    <>
      <div className="slideover-backdrop" onClick={onClose} />
      <div
        className="slideover-panel w-full max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-7" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <div>
            <p className="eyebrow mb-1">Invoice</p>
            <h2 className="font-mono text-base font-bold tracking-tight leading-tight" style={{ color: 'var(--color-text)' }}>{inv.reference}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>{inv.clients?.name ?? '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            aria-label="Close"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-7 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Type',   value: <span className="font-semibold capitalize" style={{ color: typeStyle[inv.type].color }}>{typeStyle[inv.type].label}</span> },
              { label: 'Status', value: (() => { const s = statusStyle[inv.status]; return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{inv.status}</span>; })() },
              { label: 'Issued', value: <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(inv.issued_at)}</span> },
              { label: 'Due',    value: <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(inv.due_at)}</span> },
            ].map((m) => (
              <div key={m.label}>
                <p className="eyebrow mb-1">{m.label}</p>
                {m.value}
              </div>
            ))}
            {inv.period_start && (
              <div className="col-span-2">
                <p className="eyebrow mb-1">Period</p>
                <p className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}</p>
              </div>
            )}
          </div>

          {inv.invoice_line_items.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Line items</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border2)' }}>
                      {['Description', 'Qty', 'Unit', 'Total'].map((h, i) => (
                        <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text3)', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inv.invoice_line_items.map((li, i) => (
                      <tr key={li.id} style={{ borderBottom: '1px solid var(--color-row-border)', animation: `fade-up 0.35s ease both ${i * 30}ms` }}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text2)' }}>{li.description}</td>
                        <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: 'var(--color-text3)' }}>{li.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-right font-mono tabular-nums" style={{ color: 'var(--color-text3)' }}>{li.unit_price_cents > 0 ? fmt(li.unit_price_cents) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-right font-semibold font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{fmt(li.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            className="tcv-card rounded-2xl p-5"
            style={{ border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 0 30px rgba(124,58,237,0.08)' }}
          >
            <div className="tcv-sub flex justify-between text-xs mb-1">
              <span>Subtotal</span><span className="font-mono">{fmt(inv.subtotal_cents)}</span>
            </div>
            <div className="tcv-sub flex justify-between text-xs mb-3 pb-3" style={{ borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
              <span>VAT (15%)</span><span className="font-mono">{fmt(inv.vat_cents)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="tcv-label text-[10px] font-bold uppercase tracking-wider">Total due</span>
              <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(inv.total_cents)}</span>
            </div>
          </div>

          {inv.paid_at ? (
            <div className="rounded-xl p-4 flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <CheckCircle size={14} style={{ color: 'var(--color-green)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--color-green)' }}>Paid in full on {fmtDate(inv.paid_at)}</p>
            </div>
          ) : null}
          {inv.notes ? (
            <p className="text-xs italic" style={{ color: 'var(--color-text3)' }}>{inv.notes}</p>
          ) : null}
        </div>

        <div
          className="p-7 sticky bottom-0 backdrop-blur space-y-2"
          style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}
        >
          {(inv.status === 'sent' || inv.status === 'overdue') ? (
            <>
              {pfEnabled && (
                <button
                  onClick={payViaPayFast}
                  disabled={pfLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0a6ee0, #34a7ff)', boxShadow: '0 4px 16px rgba(10,110,224,0.3)' }}
                >
                  {pfLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {pfLoading ? 'Redirecting to PayFast…' : 'Pay via PayFast'}
                </button>
              )}
              {pfError && <p className="text-[11px] text-center" style={{ color: 'var(--color-red)' }}>{pfError}</p>}
              <button
                onClick={() => onAction(inv, 'mark_paid')}
                disabled={actioning === inv.id + 'mark_paid'}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 4px 16px rgba(52,211,153,0.3)' }}
              >
                {actioning === inv.id + 'mark_paid' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Mark as paid
              </button>
            </>
          ) : null}
          {inv.status === 'draft' ? (
            <button
              onClick={() => onAction(inv, 'send')}
              disabled={actioning === inv.id + 'send'}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', boxShadow: '0 4px 16px rgba(96,165,250,0.3)' }}
            >
              {actioning === inv.id + 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send invoice
            </button>
          ) : null}
          {inv.status === 'overdue' ? (
            <button
              onClick={() => onAction(inv, 'send')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(248,113,113,0.3)', color: 'var(--color-red)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Send size={14} /> Send reminder
            </button>
          ) : null}
          {(inv.status === 'sent' || inv.status === 'overdue') ? (
            <button
              onClick={() => onReminder(inv)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              style={{ border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-amber)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Mail size={14} /> Email payment reminder
            </button>
          ) : null}
          {(inv.status === 'draft' || inv.status === 'sent') ? (
            <button
              onClick={() => onAction(inv, 'void')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              Void
            </button>
          ) : null}
          {onGenerateInvoice && inv.clients?.id ? (
            <button
              onClick={() => onGenerateInvoice(inv.clients!.id)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(124,58,237,0.3)', color: 'var(--color-violet)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <FilePlus size={14} /> Generate invoice for {inv.clients.name}
            </button>
          ) : null}
          <button
            onClick={() => onDownloadPDF(inv)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>
    </>
  );
}
