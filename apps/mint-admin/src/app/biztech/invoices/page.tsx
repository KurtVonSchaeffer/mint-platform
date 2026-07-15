'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { BiztechInvoiceDetailPanel, type BiztechInvoiceDetail, type BiztechInvoiceItem } from '@/components/biztech/BiztechInvoiceDetailPanel';
import { printableBiztechDoc } from '@/lib/biztech-doc-template';
import { fmt, fmtDate, daysOverdue } from '@/lib/invoice-helpers';
import { Plus, Loader2, Download, Send, CheckCircle, RefreshCw } from 'lucide-react';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

interface Invoice {
  id: string; reference: string; status: InvoiceStatus; total_cents: number;
  due_at: string | null; paid_at: string | null; created_at: string;
  biztech_clients: { name: string } | null;
}

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; border: string; color: string }> = {
  draft:   { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
  sent:    { bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)',  color: 'var(--color-sky)' },
  paid:    { bg: 'rgba(92,59,207,0.1)',   border: 'rgba(92,59,207,0.3)',    color: '#5C3BCF' },
  overdue: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)' },
  void:    { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
};

export default function BizTechInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasClients, setHasClients] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all');
  const [selected, setSelected] = useState<{ invoice: BiztechInvoiceDetail; items: BiztechInvoiceItem[] } | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [iRes, cRes] = await Promise.all([
      fetch('/api/biztech/invoices'),
      fetch('/api/biztech/clients'),
    ]);
    if (iRes.ok) setInvoices((await iRes.json()).invoices ?? []);
    else setToast({ kind: 'error', message: 'Failed to load invoices' });
    if (cRes.ok) setHasClients(((await cRes.json()).clients ?? []).length > 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openInvoice = useCallback(async (id: string) => {
    const res = await fetch(`/api/biztech/invoices/${id}`);
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to load invoice' }); return; }
    const data = await res.json();
    setSelected({ invoice: data.invoice, items: data.items ?? [] });
  }, []);

  async function patchStatus(id: string, action: 'sent' | 'paid' | 'void') {
    setActioning(id + action);
    const res = await fetch(`/api/biztech/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action }),
    });
    setActioning(null);
    if (!res.ok) { setToast({ kind: 'error', message: 'Action failed' }); return; }
    const data = await res.json();
    setSelected(prev => prev && prev.invoice.id === id ? { ...prev, invoice: data.invoice } : prev);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: data.invoice.status, paid_at: data.invoice.paid_at ?? i.paid_at } : i));
    setToast({ kind: 'success', message: `Invoice ${action === 'sent' ? 'sent' : action === 'paid' ? 'marked as paid' : 'voided'}` });
  }

  function doAction(invoice: BiztechInvoiceDetail, action: 'sent' | 'paid' | 'void') {
    return patchStatus(invoice.id, action);
  }

  async function quickDownload(id: string) {
    const res = await fetch(`/api/biztech/invoices/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    downloadPDF(data.invoice, data.items ?? []);
  }

  async function sendReminder(invoice: BiztechInvoiceDetail) {
    const res = await fetch(`/api/biztech/invoices/${invoice.id}/remind`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setToast({ kind: 'error', message: data.error ?? 'Failed to send reminder' }); return; }
    setToast({ kind: 'success', message: `Reminder sent to ${data.sentTo}` });
  }

  function downloadPDF(invoice: BiztechInvoiceDetail, items: BiztechInvoiceItem[]) {
    const w = window.open('', '_blank', 'width=820,height=1200');
    if (!w) { setToast({ kind: 'error', message: 'Pop-up blocked — allow pop-ups for this site.' }); return; }
    w.document.write(printableBiztechDoc({
      kind: 'Invoice',
      reference: invoice.reference,
      clientName: invoice.biztech_clients?.name ?? '—',
      status: invoice.status,
      dateLabel: 'Due',
      dateValue: invoice.due_at,
      subtotal_cents: invoice.subtotal_cents,
      vat_cents: invoice.vat_cents,
      total_cents: invoice.total_cents,
      notes: invoice.notes,
      items,
    }));
    w.document.close();
    setTimeout(() => w.print(), 250);
  }

  const filtered      = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const collected      = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0);
  const outstanding    = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_cents, 0);
  const overdueAmt     = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_cents, 0);
  const totalInvoiced  = invoices.filter(i => i.status !== 'void').reduce((s, i) => s + i.total_cents, 0);
  const collectedPct   = totalInvoiced > 0 ? Math.min(100, (collected / totalInvoiced) * 100) : 0;
  const outstandingPct = totalInvoiced > 0 ? Math.min(100, (outstanding / totalInvoiced) * 100) : 0;

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">Billing</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Invoices</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Billing for BizTech clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/biztech/invoices/recurring')}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          >
            <RefreshCw size={13} /> Recurring
          </button>
          <button
            onClick={() => hasClients ? router.push('/biztech/invoice-creator') : setToast({ kind: 'error', message: 'Add a client first' })}
            className="btn-purple btn-shine inline-flex items-center gap-1.5"
          >
            <Plus size={15} /> New invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bento-card p-5 overflow-hidden">
          <p className="eyebrow mb-1">Collected (incl. VAT)</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(collected)}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>
            {invoices.filter(i => i.status === 'paid').length} invoices paid
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--color-border2)' }}>
            <div style={{ height: '100%', width: `${collectedPct}%`, background: 'linear-gradient(90deg,#5C3BCF,var(--color-green))', transition: 'width 1s ease-out' }} />
          </div>
        </div>
        <div className="bento-card p-5 overflow-hidden">
          <p className="eyebrow mb-1">Outstanding</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(outstanding)}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-amber)' }}>
            {invoices.filter(i => ['sent', 'overdue'].includes(i.status)).length} invoices unpaid
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--color-border2)' }}>
            <div style={{ height: '100%', width: `${outstandingPct}%`, background: 'linear-gradient(90deg,var(--color-amber),rgba(251,191,36,0.4))', transition: 'width 1s ease-out' }} />
          </div>
        </div>
        <div
          className="bento-card p-5"
          style={overdueAmt === 0 ? { borderColor: 'rgba(52,211,153,0.22)', boxShadow: '0 0 24px -6px rgba(52,211,153,0.18)' } : {}}
        >
          <p className="eyebrow mb-1">Overdue</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-text)' }}>{fmt(overdueAmt)}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
            {overdueAmt > 0 ? 'Action required' : '✓ All clear'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'draft', 'sent', 'paid', 'overdue', 'void'] as const).map((f) => {
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
                  {invoices.filter(i => i.status === f).length}
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
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading invoices…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
            {invoices.length === 0 ? 'No invoices yet. Create one directly, or convert an accepted quote from the Quotes page.' : 'No invoices match.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>{['Reference', 'Client', 'Amount', 'Due', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const s = STATUS_STYLE[inv.status];
                const od = inv.status === 'overdue' ? daysOverdue(inv.due_at) : 0;
                const isHov = hoveredRow === inv.id;
                const isOther = hoveredRow !== null && !isHov;
                return (
                  <tr
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => openInvoice(inv.id)}
                    onMouseEnter={() => setHoveredRow(inv.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: `${Math.min(i, 12) * 35}ms`,
                      background: isHov ? 'rgba(92,59,207,0.05)' : 'transparent',
                      opacity: isOther ? 0.55 : 1,
                      transition: 'background 0.15s ease, opacity 0.15s ease',
                    }}
                  >
                    <td className="font-mono text-xs" style={{ color: '#5C3BCF' }}>{inv.reference}</td>
                    <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{inv.biztech_clients?.name ?? '—'}</td>
                    <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(inv.total_cents)}</td>
                    <td className="text-xs">
                      <span style={{ color: od > 0 ? 'var(--color-red)' : 'var(--color-text3)', fontWeight: od > 0 ? 600 : 400 }}>{fmtDate(inv.due_at)}</span>
                      {od > 0 ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-red)' }}>{od}d overdue</p> : null}
                      {inv.paid_at ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-green)' }}>Paid {fmtDate(inv.paid_at)}</p> : null}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                        {inv.status === 'sent' && (
                          <span className="relative inline-flex w-1.5 h-1.5 shrink-0">
                            <span className="absolute inset-0 rounded-full" style={{ background: 'var(--color-sky)', animation: 'radar-ring 2s ease-out infinite' }} />
                            <span className="relative rounded-full w-1.5 h-1.5" style={{ background: 'var(--color-sky)' }} />
                          </span>
                        )}
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div
                        className="flex items-center gap-1 justify-end"
                        onClick={(e) => e.stopPropagation()}
                        style={{ opacity: isHov ? 1 : 0.22, transform: isHov ? 'translateX(0)' : 'translateX(5px)', transition: 'opacity 0.18s ease, transform 0.18s ease' }}
                      >
                        <button title="Download PDF" onClick={() => quickDownload(inv.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                          <Download size={14} />
                        </button>
                        {(inv.status === 'sent' || inv.status === 'overdue') && (
                          <button
                            title="Mark as paid"
                            onClick={() => patchStatus(inv.id, 'paid')}
                            disabled={actioning === inv.id + 'paid'}
                            className="p-1.5 rounded-lg disabled:opacity-50"
                            style={{ color: 'var(--color-green)' }}
                          >
                            {actioning === inv.id + 'paid' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          </button>
                        )}
                        {inv.status === 'draft' && (
                          <button
                            title="Send invoice"
                            onClick={() => patchStatus(inv.id, 'sent')}
                            disabled={actioning === inv.id + 'sent'}
                            className="p-1.5 rounded-lg disabled:opacity-50"
                            style={{ color: 'var(--color-sky)' }}
                          >
                            {actioning === inv.id + 'sent' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
        <BiztechInvoiceDetailPanel
          invoice={selected.invoice}
          items={selected.items}
          actioning={actioning}
          onClose={() => setSelected(null)}
          onAction={doAction}
          onReminder={sendReminder}
          onDownloadPDF={downloadPDF}
        />
      )}
    </div>
  );
}
