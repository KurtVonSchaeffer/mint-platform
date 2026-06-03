'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  Receipt, Download, Send, CheckCircle, AlertCircle, Clock, Plus, X, Mail,
  Loader2, Sparkles, ChevronDown,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────── */
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
type InvoiceType   = 'monthly_licence' | 'setup' | 'usage' | 'add_on';

interface LineItem {
  id:               string;
  description:      string;
  quantity:         number;
  unit_price_cents: number;
  total_cents:      number;
  service:          string | null;
}

interface Client {
  id:   string;
  name: string;
  slug: string;
}

interface Invoice {
  id:             string;
  reference:      string;
  type:           InvoiceType;
  status:         InvoiceStatus;
  subtotal_cents: number;
  vat_cents:      number;
  total_cents:    number;
  period_start:   string | null;
  period_end:     string | null;
  issued_at:      string | null;
  due_at:         string | null;
  paid_at:        string | null;
  void_at:        string | null;
  notes:          string | null;
  clients:        Client | null;
  invoice_line_items: LineItem[];
}


/* ─── Helpers ────────────────────────────────────────────────────────── */
const statusStyle: Record<InvoiceStatus, { label: string; bg: string; border: string; color: string; icon: typeof Clock }> = {
  draft:   { label: 'Draft',   bg: 'rgba(75,80,128,0.15)',   border: 'rgba(75,80,128,0.3)',    color: 'var(--color-text3)', icon: Receipt     },
  sent:    { label: 'Sent',    bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)',   icon: Send        },
  paid:    { label: 'Paid',    bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',  color: 'var(--color-green)', icon: CheckCircle },
  overdue: { label: 'Overdue', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)',   icon: AlertCircle },
  void:    { label: 'Void',    bg: 'rgba(75,80,128,0.1)',    border: 'rgba(75,80,128,0.2)',    color: 'var(--color-text3)', icon: Receipt     },
};

const typeStyle: Record<InvoiceType, { label: string; color: string }> = {
  monthly_licence: { label: 'Licence', color: 'var(--color-text3)'  },
  setup:           { label: 'Setup',   color: 'var(--color-violet)'  },
  usage:           { label: 'Usage',   color: 'var(--color-amber)'   },
  add_on:          { label: 'Add-on',  color: 'var(--color-sky)'     },
};

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysOverdue(dueAt: string | null): number {
  if (!dueAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dueAt).getTime()) / 86400000));
}

/* ─── Generate modal ────────────────────────────────────────────────── */
function GenerateModal({ onClose, onGenerated }: {
  onClose: () => void;
  onGenerated: (result: { invoicesCreated: number; totalCents: number; errors: { clientName: string; error: string }[] }) => void;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth]     = useState(currentMonth);
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<{ invoicesCreated: number; invoicesSkipped: number; totalCents: number; errors: { clientName: string; error: string }[] } | null>(null);

  const MONTH_OPTIONS = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const iso = d.toISOString().slice(0, 7);
    return { value: iso, label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) };
  });

  async function run() {
    setRunning(true);
    try {
      const res  = await fetch('/api/billing/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month }) });
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
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}
            >
              <Sparkles size={14} />
            </div>
            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Generate invoices</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-7">
          {!result ? (
            <>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text3)' }}>
                Generates draft invoices for all active and trial clients for the selected month.
                Existing invoices are skipped. Pro-rata is applied for mid-month activations.
              </p>
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
              <div
                className="rounded-xl p-3 mb-5 space-y-1 text-xs"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--color-text2)' }}
              >
                <p>✓ Licence fees with pro-rata for new activations</p>
                <p>✓ Pass-through API costs (TruID, Experian, DocuSeal, SACRRA)</p>
                <p>✓ VAT at 15% applied automatically</p>
                <p>✓ Invoices created as <strong>Draft</strong> — review before sending</p>
              </div>
              <button
                onClick={run}
                disabled={running}
                className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {running ? 'Generating…' : 'Generate drafts'}
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

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function InvoicesPage() {
  const [invoices, setInvoices]           = useState<Invoice[]>([]);
  const [loading, setLoading]             = useState(true);
  const [supaConnected, setSupaConnected] = useState(false);
  const [filter, setFilter]               = useState<'all' | InvoiceStatus>('all');
  const [selected, setSelected]           = useState<Invoice | null>(null);
  const [generateOpen, setGenerateOpen]   = useState(false);
  const [actioning, setActioning]         = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ kind: ToastKind; message: string } | null>(null);

  const pushToast = useCallback((kind: ToastKind, message: string) => setToast({ kind, message }), []);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('fetch failed');
      const { invoices: raw } = await res.json();
      if (Array.isArray(raw)) { setInvoices(raw as Invoice[]); setSupaConnected(true); }
    } catch {
      pushToast('error', 'Showing demo data — Supabase env vars may not be set.');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { void loadInvoices(); }, [loadInvoices]);

  async function sendReminder(inv: Invoice) {
    if (!inv.clients?.id) return;
    // Get client contact email from clients list or fallback to slug-based
    const contactEmail = `accounts@${inv.clients.slug}.co.za`;
    const days = inv.due_at
      ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_at).getTime()) / 86400000))
      : 0;

    const { invoiceReminderEmail } = await import('@/lib/email');
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      contactEmail,
        subject: days > 0
          ? `OVERDUE: Invoice ${inv.reference} — ${days} days past due`
          : `Payment reminder: Invoice ${inv.reference}`,
        html: invoiceReminderEmail({
          reference:   inv.reference,
          clientName:  inv.clients.name,
          contact:     'Accounts',
          totalCents:  inv.total_cents,
          dueDate:     inv.due_at ? new Date(inv.due_at).toLocaleDateString('en-ZA') : 'N/A',
          daysOverdue: days,
        }),
      }),
    });
    pushToast('success', `Payment reminder sent to ${contactEmail}.`);
  }

  async function doAction(inv: Invoice, action: 'send' | 'mark_paid' | 'void') {
    if (!supaConnected) {
      const patch: Partial<Invoice> = {};
      if (action === 'send')      { patch.status = 'sent'; patch.issued_at = new Date().toISOString(); }
      if (action === 'mark_paid') { patch.status = 'paid'; patch.paid_at   = new Date().toISOString(); }
      if (action === 'void')      { patch.status = 'void'; patch.void_at   = new Date().toISOString(); }
      setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, ...patch } : x)));
      if (selected?.id === inv.id) setSelected((s) => s ? { ...s, ...patch } : s);
      pushToast('success', action === 'mark_paid' ? `${inv.reference} marked as paid.` : action === 'send' ? `${inv.reference} sent.` : `${inv.reference} voided.`);
      return;
    }
    setActioning(inv.id + action);
    try {
      const res  = await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, status: data.invoice.status, paid_at: data.invoice.paid_at ?? x.paid_at } : x)));
      if (selected?.id === inv.id) setSelected((s) => s ? { ...s, status: data.invoice.status } : s);
      pushToast('success', action === 'mark_paid' ? `${inv.reference} paid ✓` : `${inv.reference} ${action === 'send' ? 'sent' : 'voided'}.`);
    } catch (err) {
      pushToast('error', String(err));
    } finally {
      setActioning(null);
    }
  }

  function downloadPDF(inv: Invoice) {
    const w = window.open('', '_blank', 'width=820,height=1200');
    if (!w) { pushToast('error', 'Pop-up blocked — allow pop-ups for this site.'); return; }
    w.document.write(printableInvoice(inv));
    w.document.close();
    setTimeout(() => w.print(), 250);
    pushToast('info', `${inv.reference} opened in print view.`);
  }

  function exportSage() {
    const rows = [
      ['Reference', 'Client', 'Type', 'Subtotal', 'VAT', 'Total', 'Issued', 'Due', 'Paid', 'Status'].join(','),
      ...invoices.map((i) => [i.reference, `"${i.clients?.name ?? ''}"`, i.type, (i.subtotal_cents / 100).toFixed(2), (i.vat_cents / 100).toFixed(2), (i.total_cents / 100).toFixed(2), fmtDate(i.issued_at), fmtDate(i.due_at), fmtDate(i.paid_at), i.status].join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `algolend-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    pushToast('success', `Exported ${invoices.length} invoices (Sage-compatible).`);
  }

  const filtered    = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);
  const collected   = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0);
  const outstanding = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_cents, 0);
  const overdueAmt  = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total_cents, 0);

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}
      {generateOpen && (
        <GenerateModal
          onClose={() => { setGenerateOpen(false); void loadInvoices(); }}
          onGenerated={(r) => pushToast('success', `${r.invoicesCreated} invoice${r.invoicesCreated !== 1 ? 's' : ''} generated.`)}
        />
      )}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Revenue</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Invoices</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Licence fees, pro-rated activations, and pass-through API costs.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportSage}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={14} /> Export to Sage
            </button>
            <button onClick={() => setGenerateOpen(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
              <Plus size={15} /> Generate invoices
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Collected (incl. VAT)</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(collected)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>
              {invoices.filter((i) => i.status === 'paid').length} invoices paid
            </p>
          </div>
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Outstanding</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(outstanding)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-amber)' }}>
              {invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).length} invoices unpaid
            </p>
          </div>
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Overdue</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-text)' }}>{fmt(overdueAmt)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
              {overdueAmt > 0 ? 'Action required' : 'All clear'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'void'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={filter === f ? {
                background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text3)',
                border: '1px solid var(--color-border2)',
              }}
              onMouseEnter={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
              onMouseLeave={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {f === 'all' ? 'All' : f}
              {f !== 'all' ? <span className="ml-1.5 opacity-60">{invoices.filter((i) => i.status === f).length}</span> : null}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bento-card overflow-hidden p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" style={{ color: 'var(--color-purple2)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading invoices…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>No invoices match.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {['Reference', 'Client', 'Type', 'Amount', 'Period', 'Due', 'Status', ''].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => {
                  const s          = statusStyle[inv.status];
                  const t          = typeStyle[inv.type];
                  const StatusIcon = s.icon;
                  const od         = inv.status === 'overdue' ? daysOverdue(inv.due_at) : 0;
                  return (
                    <tr
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(inv)}
                      style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 35}ms` }}
                    >
                      <td className="font-mono text-xs" style={{ color: 'var(--color-violet)' }}>{inv.reference}</td>
                      <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{inv.clients?.name ?? '—'}</td>
                      <td>
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.color }}>{t.label}</span>
                      </td>
                      <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(inv.total_cents)}</td>
                      <td className="font-mono text-xs" style={{ color: 'var(--color-text3)' }}>
                        {inv.period_start ? inv.period_start.slice(0, 7) : '—'}
                      </td>
                      <td className="text-xs">
                        <span style={{ color: od > 0 ? 'var(--color-red)' : 'var(--color-text3)', fontWeight: od > 0 ? '600' : '400' }}>
                          {fmtDate(inv.due_at)}
                        </span>
                        {od > 0 ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-red)' }}>{od}d overdue</p> : null}
                        {inv.paid_at ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-green)' }}>Paid {fmtDate(inv.paid_at)}</p> : null}
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                        >
                          <StatusIcon size={11} />{s.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Download PDF" onClick={() => downloadPDF(inv)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--color-text3)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Download size={14} />
                          </button>
                          {inv.status === 'overdue' ? (
                            <button
                              title="Send reminder" onClick={() => doAction(inv, 'send')}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--color-red)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              <Send size={14} />
                            </button>
                          ) : null}
                          {(inv.status === 'sent' || inv.status === 'overdue') ? (
                            <button
                              title="Mark as paid" onClick={() => doAction(inv, 'mark_paid')}
                              disabled={actioning === inv.id + 'mark_paid'}
                              className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                              style={{ color: 'var(--color-green)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.1)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              {actioning === inv.id + 'mark_paid' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            </button>
                          ) : null}
                          {inv.status === 'draft' ? (
                            <button
                              title="Send invoice" onClick={() => doAction(inv, 'send')}
                              disabled={actioning === inv.id + 'send'}
                              className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                              style={{ color: 'var(--color-sky)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.1)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              {actioning === inv.id + 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail slide-over */}
      {selected ? (
        <>
          <div className="slideover-backdrop" onClick={() => setSelected(null)} />
          <div
            className="slideover-panel w-full max-w-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{}}
          >
            <div className="flex items-start justify-between p-7" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div>
                <p className="eyebrow mb-1">Invoice</p>
                <h2 className="font-mono text-base font-bold tracking-tight leading-tight" style={{ color: 'var(--color-text)' }}>{selected.reference}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>{selected.clients?.name ?? '—'}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
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
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Type',   value: <span className="font-semibold capitalize" style={{ color: typeStyle[selected.type].color }}>{typeStyle[selected.type].label}</span> },
                  { label: 'Status', value: (() => { const s = statusStyle[selected.status]; return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{selected.status}</span>; })() },
                  { label: 'Issued', value: <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(selected.issued_at)}</span> },
                  { label: 'Due',    value: <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(selected.due_at)}</span> },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="eyebrow mb-1">{m.label}</p>
                    {m.value}
                  </div>
                ))}
                {selected.period_start && (
                  <div className="col-span-2">
                    <p className="eyebrow mb-1">Period</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{fmtDate(selected.period_start)} → {fmtDate(selected.period_end)}</p>
                  </div>
                )}
              </div>

              {/* Line items */}
              {selected.invoice_line_items.length > 0 && (
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
                        {selected.invoice_line_items.map((li, i) => (
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

              {/* Totals */}
              <div
                className="tcv-card rounded-2xl p-5"
                style={{ border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 0 30px rgba(124,58,237,0.08)' }}
              >
                <div className="tcv-sub flex justify-between text-xs mb-1">
                  <span>Subtotal</span><span className="font-mono">{fmt(selected.subtotal_cents)}</span>
                </div>
                <div className="tcv-sub flex justify-between text-xs mb-3 pb-3" style={{ borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
                  <span>VAT (15%)</span><span className="font-mono">{fmt(selected.vat_cents)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="tcv-label text-[10px] font-bold uppercase tracking-wider">Total due</span>
                  <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(selected.total_cents)}</span>
                </div>
              </div>

              {selected.paid_at ? (
                <div className="rounded-xl p-4 flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <CheckCircle size={14} style={{ color: 'var(--color-green)' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-green)' }}>Paid in full on {fmtDate(selected.paid_at)}</p>
                </div>
              ) : null}
              {selected.notes ? (
                <p className="text-xs italic" style={{ color: 'var(--color-text3)' }}>{selected.notes}</p>
              ) : null}
            </div>

            {/* Slide-over actions */}
            <div
              className="p-7 sticky bottom-0 backdrop-blur space-y-2"
              style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}
            >
              {(selected.status === 'sent' || selected.status === 'overdue') ? (
                <button
                  onClick={() => doAction(selected, 'mark_paid')}
                  disabled={actioning === selected.id + 'mark_paid'}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 4px 16px rgba(52,211,153,0.3)' }}
                >
                  {actioning === selected.id + 'mark_paid' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Mark as paid
                </button>
              ) : null}
              {selected.status === 'draft' ? (
                <button
                  onClick={() => doAction(selected, 'send')}
                  disabled={actioning === selected.id + 'send'}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', boxShadow: '0 4px 16px rgba(96,165,250,0.3)' }}
                >
                  {actioning === selected.id + 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send invoice
                </button>
              ) : null}
              {selected.status === 'overdue' ? (
                <button
                  onClick={() => doAction(selected, 'send')}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid rgba(248,113,113,0.3)', color: 'var(--color-red)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Send size={14} /> Send reminder
                </button>
              ) : null}
              {(selected.status === 'sent' || selected.status === 'overdue') ? (
                <button
                  onClick={() => sendReminder(selected)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  style={{ border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-amber)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.08)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Mail size={14} /> Email payment reminder
                </button>
              ) : null}
              {(selected.status === 'draft' || selected.status === 'sent') ? (
                <button
                  onClick={() => doAction(selected, 'void')}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  Void
                </button>
              ) : null}
              <button
                onClick={() => downloadPDF(selected)}
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
      ) : null}
    </Shell>
  );
}

/* ─── Print-ready invoice HTML ──────────────────────────────────────── */
function printableInvoice(inv: Invoice): string {
  const fmtC = (cents: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
  const fmtD = (iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const linesHtml = inv.invoice_line_items.map((li) => `
    <tr><td>${li.description}</td><td class="r">${li.quantity.toLocaleString()}</td><td class="r">${li.unit_price_cents > 0 ? fmtC(li.unit_price_cents) : '—'}</td><td class="r">${fmtC(li.total_cents)}</td></tr>
  `).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.reference}</title>
<style>
  body { font-family: -apple-system, sans-serif; color: #0f172a; padding: 60px 80px; max-width: 820px; margin: 0 auto; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 32px; }
  .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.025em; color: #7C3AED; }
  .meta { text-align: right; color: #64748b; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 28px; margin: 0 0 6px 0; }
  .sub { color: #64748b; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; text-align: left; }
  th.r, td.r { text-align: right; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  .totals { margin-top: 16px; text-align: right; }
  .totals tr td { padding: 4px 0; }
  .totals .total-row td { font-size: 18px; font-weight: 700; padding-top: 10px; border-top: 2px solid #7C3AED; }
  .stamp { display: inline-block; padding: 6px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; margin-top: 24px; background: #d1fae5; color: #065f46; }
</style></head><body>
  <div class="head">
    <div><div class="brand">AlgoLend</div><div style="font-size:11px;color:#64748b;margin-top:2px;">A product of Mint Platforms (Pty) Ltd · VAT No. 4360329853</div></div>
    <div class="meta"><strong>${inv.reference}</strong><br>Issued: ${fmtD(inv.issued_at)}<br>Due: ${fmtD(inv.due_at)}</div>
  </div>
  <h1>Tax Invoice</h1>
  <div class="sub">Billed to <strong>${inv.clients?.name ?? '—'}</strong>${inv.period_start ? ` · Period ${fmtD(inv.period_start)} – ${fmtD(inv.period_end)}` : ''}</div>
  <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>${linesHtml}</tbody></table>
  <table class="totals" style="width:280px;margin-left:auto;margin-top:16px;">
    <tr><td style="color:#64748b">Subtotal</td><td style="text-align:right">${fmtC(inv.subtotal_cents)}</td></tr>
    <tr><td style="color:#64748b">VAT (15%)</td><td style="text-align:right">${fmtC(inv.vat_cents)}</td></tr>
    <tr class="total-row"><td>Total due</td><td style="text-align:right">${fmtC(inv.total_cents)}</td></tr>
  </table>
  ${inv.paid_at ? `<div><span class="stamp">✓ Paid ${fmtD(inv.paid_at)}</span></div>` : ''}
  ${inv.notes ? `<p style="color:#94a3b8;font-size:11px;margin-top:20px;">${inv.notes}</p>` : ''}
</body></html>`;
}
