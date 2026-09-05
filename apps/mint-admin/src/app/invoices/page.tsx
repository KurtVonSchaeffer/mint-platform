'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { printableInvoice } from '@/lib/invoice-template';
import { GenerateInvoicesModal } from '@/components/GenerateInvoicesModal';
import { InvoiceDetailPanel } from '@/components/InvoiceDetailPanel';
import {
  fmt, fmtDate, daysOverdue, statusStyle, typeStyle,
  type Invoice, type InvoiceStatus,
} from '@/lib/invoice-helpers';
import { Plus, Loader2, Download, Send, CheckCircle } from 'lucide-react';

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function InvoicesPage() {
  const [invoices, setInvoices]           = useState<Invoice[]>([]);
  const [loading, setLoading]             = useState(true);
  const [supaConnected, setSupaConnected] = useState(false);
  const [filter, setFilter]               = useState<'all' | InvoiceStatus>('all');
  const [selected, setSelected]           = useState<Invoice | null>(null);
  const [generateOpen, setGenerateOpen]   = useState(false);
  const [generateClientId, setGenerateClientId] = useState<string | undefined>(undefined);
  const [actioning, setActioning]         = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ kind: ToastKind; message: string } | null>(null);
  const [hoveredRow, setHoveredRow]       = useState<string | null>(null);
  const [sageExporting, setSageExporting] = useState(false);

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
          invoiceId:   inv.id,
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
    setSageExporting(true);
    const rows = [
      ['Reference', 'Client', 'Type', 'Subtotal', 'VAT', 'Total', 'Issued', 'Due', 'Paid', 'Status'].join(','),
      ...invoices.map((i) => [i.reference, `"${i.clients?.name ?? ''}"`, i.type, (i.subtotal_cents / 100).toFixed(2), (i.vat_cents / 100).toFixed(2), (i.total_cents / 100).toFixed(2), fmtDate(i.issued_at), fmtDate(i.due_at), fmtDate(i.paid_at), i.status].join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `algolend-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    pushToast('success', `Exported ${invoices.length} invoices (Sage-compatible).`);
    setTimeout(() => setSageExporting(false), 1400);
  }

  const filtered       = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);
  const collected      = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0);
  const outstanding    = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_cents, 0);
  const overdueAmt     = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total_cents, 0);
  const totalInvoiced  = invoices.filter((i) => i.status !== 'void').reduce((s, i) => s + i.total_cents, 0);
  const collectedPct   = totalInvoiced > 0 ? Math.min(100, (collected   / totalInvoiced) * 100) : 0;
  const outstandingPct = totalInvoiced > 0 ? Math.min(100, (outstanding / totalInvoiced) * 100) : 0;

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}
      {generateOpen && (
        <GenerateInvoicesModal
          onClose={() => { setGenerateOpen(false); setGenerateClientId(undefined); void loadInvoices(); }}
          onGenerated={(r) => pushToast('success', `${r.invoicesCreated} invoice${r.invoicesCreated !== 1 ? 's' : ''} generated.`)}
          defaultClientId={generateClientId}
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
              disabled={sageExporting}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors relative overflow-hidden disabled:cursor-default"
              style={{ border: '1px solid var(--color-border2)', color: sageExporting ? 'transparent' : 'var(--color-text2)', minWidth: 148 }}
              onMouseEnter={(e) => { if (!sageExporting) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={14} style={{ opacity: sageExporting ? 0 : 1 }} /> {sageExporting ? ' ' : 'Export to Sage'}
              {sageExporting && (
                <span className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-violet)' }}>
                  <span className="inline-block w-24 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border2)' }}>
                    <span className="block h-full rounded-full" style={{ background: 'linear-gradient(90deg,var(--color-purple),var(--color-violet))', animation: 'progress-fill 1.2s ease-out forwards' }} />
                  </span>
                  Exporting…
                </span>
              )}
            </button>
            <button onClick={() => setGenerateOpen(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
              <Plus size={15} /> Generate invoices
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {/* Collected */}
          <div className="bento-card p-5 overflow-hidden">
            <p className="eyebrow mb-1">Collected (incl. VAT)</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(collected)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>
              {invoices.filter((i) => i.status === 'paid').length} invoices paid
            </p>
            {/* 1px progress track */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--color-border2)' }}>
              <div style={{ height: '100%', width: '100%', transformOrigin: 'left', transform: `scaleX(${collectedPct / 100})`, background: 'linear-gradient(90deg,var(--color-purple),var(--color-green))', transition: 'transform 1s ease-out' }} />
            </div>
          </div>

          {/* Outstanding */}
          <div className="bento-card p-5 overflow-hidden">
            <p className="eyebrow mb-1">Outstanding</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(outstanding)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-amber)' }}>
              {invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).length} invoices unpaid
            </p>
            {/* 1px progress track */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'var(--color-border2)' }}>
              <div style={{ height: '100%', width: '100%', transformOrigin: 'left', transform: `scaleX(${outstandingPct / 100})`, background: 'linear-gradient(90deg,var(--color-amber),rgba(251,191,36,0.4))', transition: 'transform 1s ease-out' }} />
            </div>
          </div>

          {/* Overdue — green glow when all clear */}
          <div
            className="bento-card p-5"
            style={overdueAmt === 0 ? {
              borderColor: 'rgba(52,211,153,0.22)',
              boxShadow: '0 0 24px -6px rgba(52,211,153,0.18)',
              animation: 'glow-pulse 3.5s ease-in-out infinite',
            } : {}}
          >
            <p className="eyebrow mb-1">Overdue</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-text)' }}>{fmt(overdueAmt)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: overdueAmt > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
              {overdueAmt > 0 ? 'Action required' : '✓ All clear'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'void'] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                style={{
                  background:  isActive ? 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))' : 'rgba(255,255,255,0.04)',
                  color:       isActive ? '#fff'                : 'var(--color-text3)',
                  border:      isActive ? 'none'               : '1px solid var(--color-border2)',
                  boxShadow:   isActive ? '0 2px 12px rgba(124,58,237,0.35)' : 'none',
                  transition:  'background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                {f === 'all' ? 'All' : f}
                {f !== 'all' ? (
                  <span className="ml-1.5 tabular-nums" style={{ opacity: isActive ? 0.75 : 0.5 }}>
                    {invoices.filter((i) => i.status === f).length}
                  </span>
                ) : null}
              </button>
            );
          })}
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
                  const isHov      = hoveredRow === inv.id;
                  const isOther    = hoveredRow !== null && !isHov;
                  return (
                    <tr
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(inv)}
                      onMouseEnter={() => setHoveredRow(inv.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        animation: `fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`,
                        animationDelay: `${i * 35}ms`,
                        background: isHov ? 'rgba(124,58,237,0.05)' : 'transparent',
                        opacity: isOther ? 0.55 : 1,
                        transition: 'background 0.15s ease, opacity 0.15s ease',
                      }}
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
                          {/* Pulsing dot for SENT — "live in the wild" */}
                          {inv.status === 'sent' && (
                            <span className="relative inline-flex w-1.5 h-1.5 shrink-0">
                              <span className="absolute inset-0 rounded-full" style={{ background: 'var(--color-sky)', animation: 'radar-ring 2s ease-out infinite' }} />
                              <span className="relative rounded-full w-1.5 h-1.5" style={{ background: 'var(--color-sky)' }} />
                            </span>
                          )}
                          {inv.status !== 'sent' && <StatusIcon size={11} />}
                          {s.label}
                        </span>
                      </td>
                      <td>
                        {/* Actions — nearly invisible at rest, slide in on row hover */}
                        <div
                          className="flex items-center gap-1 justify-end"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            opacity: isHov ? 1 : 0.22,
                            transform: isHov ? 'translateX(0)' : 'translateX(5px)',
                            transition: 'opacity 0.18s ease, transform 0.18s ease',
                          }}
                        >
                          <button
                            title="Download PDF" onClick={() => downloadPDF(inv)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--color-text3)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Download size={14} />
                          </button>
                          {inv.status === 'overdue' && (
                            <button
                              title="Send reminder" onClick={() => doAction(inv, 'send')}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--color-red)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              <Send size={14} />
                            </button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
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
                          )}
                          {inv.status === 'draft' && (
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
      </div>

      {/* Detail slide-over */}
      {selected ? (
        <InvoiceDetailPanel
          inv={selected}
          actioning={actioning}
          onClose={() => setSelected(null)}
          onAction={doAction}
          onReminder={sendReminder}
          onDownloadPDF={downloadPDF}
          onGenerateInvoice={(clientId) => {
            setSelected(null);
            setGenerateClientId(clientId);
            setGenerateOpen(true);
          }}
        />
      ) : null}
    </Shell>
  );
}

