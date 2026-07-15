'use client';

import { X, CheckCircle, Loader2, Send, Mail, Download } from 'lucide-react';
import { fmt, fmtDate } from '@/lib/invoice-helpers';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
type InvoiceAction = 'sent' | 'paid' | 'void';

export interface BiztechInvoiceDetail {
  id: string;
  reference: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  due_at: string | null;
  issued_at: string | null;
  paid_at: string | null;
  notes: string | null;
  biztech_clients: { id: string; name: string } | null;
}

export interface BiztechInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; border: string; color: string }> = {
  draft:   { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
  sent:    { bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)',  color: 'var(--color-sky)' },
  paid:    { bg: 'rgba(92,59,207,0.1)',   border: 'rgba(92,59,207,0.3)',    color: '#5C3BCF' },
  overdue: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)' },
  void:    { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
};

interface Props {
  invoice:       BiztechInvoiceDetail;
  items:         BiztechInvoiceItem[];
  actioning:     string | null;
  onClose:       () => void;
  onAction:      (invoice: BiztechInvoiceDetail, action: InvoiceAction) => void;
  onReminder:    (invoice: BiztechInvoiceDetail) => void;
  onDownloadPDF: (invoice: BiztechInvoiceDetail, items: BiztechInvoiceItem[]) => void;
}

export function BiztechInvoiceDetailPanel({ invoice, items, actioning, onClose, onAction, onReminder, onDownloadPDF }: Props) {
  const s = STATUS_STYLE[invoice.status];

  return (
    <>
      <div className="slideover-backdrop" onClick={onClose} />
      <div className="slideover-panel w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-7 pt-6 pb-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #31005E 0%, #5C3BCF 100%)' }}>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(221,195,87,0.25), transparent 70%)' }} />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: '#DDC357' }}>MINT BizTech · Invoice</p>
              <h2 className="font-mono text-lg font-bold tracking-tight leading-tight mt-1.5 text-white">{invoice.reference}</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{invoice.biztech_clients?.name ?? '—'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors text-white/70 hover:text-white hover:bg-white/10" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-7 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="eyebrow mb-1">Status</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{invoice.status}</span>
            </div>
            <div>
              <p className="eyebrow mb-1">Due</p>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(invoice.due_at)}</span>
            </div>
            <div>
              <p className="eyebrow mb-1">Issued</p>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(invoice.issued_at)}</span>
            </div>
          </div>

          {items.length > 0 && (
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
                    {items.map((li, i) => (
                      <tr key={li.id} style={{ borderBottom: '1px solid var(--color-row-border)', animation: `fade-up 0.35s ease both ${i * 30}ms` }}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text2)' }}>{li.description}</td>
                        <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: 'var(--color-text3)' }}>{li.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-right font-mono tabular-nums" style={{ color: 'var(--color-text3)' }}>{fmt(li.unit_price_cents)}</td>
                        <td className="px-4 py-3 text-xs text-right font-semibold font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{fmt(li.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="tcv-card rounded-2xl p-5" style={{ border: '1px solid rgba(92,59,207,0.25)', boxShadow: '0 0 30px rgba(92,59,207,0.08)' }}>
            <div className="tcv-sub flex justify-between text-xs mb-1">
              <span>Subtotal</span><span className="font-mono">{fmt(invoice.subtotal_cents)}</span>
            </div>
            <div className="tcv-sub flex justify-between text-xs mb-3 pb-3" style={{ borderBottom: '1px solid rgba(92,59,207,0.2)' }}>
              <span>VAT (15%)</span><span className="font-mono">{fmt(invoice.vat_cents)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="tcv-label text-[10px] font-bold uppercase tracking-wider">Total due</span>
              <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(invoice.total_cents)}</span>
            </div>
          </div>

          {invoice.paid_at ? (
            <div className="rounded-xl p-4 flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <CheckCircle size={14} style={{ color: 'var(--color-green)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--color-green)' }}>Paid in full on {fmtDate(invoice.paid_at)}</p>
            </div>
          ) : null}
          {invoice.notes ? <p className="text-xs italic" style={{ color: 'var(--color-text3)' }}>{invoice.notes}</p> : null}
        </div>

        <div className="p-7 sticky bottom-0 backdrop-blur space-y-2" style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}>
          {(invoice.status === 'sent' || invoice.status === 'overdue') ? (
            <button
              onClick={() => onAction(invoice, 'paid')}
              disabled={actioning === invoice.id + 'paid'}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 4px 16px rgba(52,211,153,0.3)' }}
            >
              {actioning === invoice.id + 'paid' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Mark as paid
            </button>
          ) : null}
          {invoice.status === 'draft' ? (
            <button
              onClick={() => onAction(invoice, 'sent')}
              disabled={actioning === invoice.id + 'sent'}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', boxShadow: '0 4px 16px rgba(96,165,250,0.3)' }}
            >
              {actioning === invoice.id + 'sent' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send invoice
            </button>
          ) : null}
          {(invoice.status === 'sent' || invoice.status === 'overdue') ? (
            <button
              onClick={() => onReminder(invoice)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              style={{ border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-amber)' }}
            >
              <Mail size={14} /> Email payment reminder
            </button>
          ) : null}
          {(invoice.status === 'draft' || invoice.status === 'sent') ? (
            <button
              onClick={() => onAction(invoice, 'void')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
            >
              Void
            </button>
          ) : null}
          <button
            onClick={() => onDownloadPDF(invoice, items)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>
    </>
  );
}
