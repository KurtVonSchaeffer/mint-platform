'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ClientAvatar } from '@/components/biztech/ClientAvatar';
import { BiztechInvoiceDetailPanel, type BiztechInvoiceDetail, type BiztechInvoiceItem } from '@/components/biztech/BiztechInvoiceDetailPanel';
import { printableBiztechDoc } from '@/lib/biztech-doc-template';
import { RefreshCw, Plus, Loader2, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

interface Invoice {
  id: string; reference: string; status: InvoiceStatus; total_cents: number;
  created_at: string; biztech_clients: { name: string } | null;
}

interface BizClient { id: string; name: string; }

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

export default function BizTechInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<BizClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [selected, setSelected] = useState<{ invoice: BiztechInvoiceDetail; items: BiztechInvoiceItem[] } | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const openInvoice = useCallback(async (id: string) => {
    const res = await fetch(`/api/biztech/invoices/${id}`);
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to load invoice' }); return; }
    const data = await res.json();
    setSelected({ invoice: data.invoice, items: data.items ?? [] });
  }, []);

  async function doAction(invoice: BiztechInvoiceDetail, action: 'sent' | 'paid' | 'void') {
    setActioning(invoice.id + action);
    const res = await fetch(`/api/biztech/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action }),
    });
    setActioning(null);
    if (!res.ok) { setToast({ kind: 'error', message: 'Action failed' }); return; }
    const data = await res.json();
    setSelected(prev => prev ? { ...prev, invoice: data.invoice } : prev);
    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: data.invoice.status } : i));
    setToast({ kind: 'success', message: `Invoice ${action === 'sent' ? 'sent' : action === 'paid' ? 'marked as paid' : 'voided'}` });
  }

  async function sendReminder(invoice: BiztechInvoiceDetail) {
    const res = await fetch(`/api/biztech/invoices/${invoice.id}/remind`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setToast({ kind: 'error', message: data.error ?? 'Failed to send reminder' }); return; }
    setToast({ kind: 'success', message: `Reminder sent to ${data.sentTo}` });
  }

  function downloadPDF(invoice: BiztechInvoiceDetail, items: BiztechInvoiceItem[]) {
    const w = window.open('', '_blank');
    if (!w) return;
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

  const load = useCallback(async () => {
    setLoading(true);
    const [iRes, cRes] = await Promise.all([
      fetch('/api/biztech/invoices'),
      fetch('/api/biztech/clients'),
    ]);
    if (iRes.ok) setInvoices((await iRes.json()).invoices ?? []);
    else setToast({ kind: 'error', message: 'Failed to load invoices' });
    if (cRes.ok) setClients((await cRes.json()).clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Invoices</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Billing for BizTech clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => clients.length ? router.push('/biztech/invoice-creator') : setToast({ kind: 'error', message: 'Add a client first' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#5C3BCF' }}
          >
            <Plus size={14} /> New invoice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center" style={PANEL}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center" style={PANEL}>
          <Inbox size={20} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No invoices yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
            Create an invoice directly, or convert an accepted quote from the Quotes page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {invoices.map((inv, i) => {
            const cfg = STATUS_CONFIG[inv.status];
            return (
              <div
                key={inv.id}
                onClick={() => openInvoice(inv.id)}
                className="biztech-card biztech-field-in cursor-pointer p-5"
                style={{ ...PANEL, animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ClientAvatar name={inv.biztech_clients?.name ?? '—'} size={32} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{inv.biztech_clients?.name ?? '—'}</p>
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--color-text3)' }}>{inv.reference}</p>
                    </div>
                  </div>
                  <StatusDot label={cfg.label} color={cfg.color} />
                </div>
                <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--color-text3)' }}>Total</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{centsToRand(inv.total_cents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--color-text3)' }}>Created</span>
                    <span className="font-mono" style={{ color: 'var(--color-text2)' }}>{formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
