'use client';

import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  FileText, Send, Download, Plus, CheckCircle, Clock, XCircle, X, Eye, Sparkles,
} from 'lucide-react';

type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

interface Quote {
  id:         string;
  client:     string;
  contact:    string;
  email:      string;
  setupFee:   number;
  monthlyFee: number;
  addOns:     string[];
  status:     QuoteStatus;
  sentDate:   string | null;
  validUntil: string | null;
  viewedAt:   string | null;
  acceptedAt?: string;
}

const INITIAL_QUOTES: Quote[] = [
  { id: 'Q-2026-014', client: 'Horizon Credit (Pty) Ltd',     contact: 'Tshepo Mokoena',  email: 'tshepo@horizoncredit.co.za',    setupFee: 145000, monthlyFee: 18500, addOns: ['TruID Open Banking', 'SACRRA Reporting'], status: 'sent',     sentDate: '2026-05-21', validUntil: '2026-06-21', viewedAt: '2026-05-22 09:14' },
  { id: 'Q-2026-013', client: 'Phakisa Microfinance',         contact: 'Lindiwe Khumalo', email: 'lindi@phakisa.co.za',            setupFee: 95000,  monthlyFee: 12000, addOns: ['E-Contracts'],                             status: 'viewed',   sentDate: '2026-05-18', validUntil: '2026-06-18', viewedAt: '2026-05-20 14:32' },
  { id: 'Q-2026-012', client: 'Velocity Business Loans',      contact: 'Mandla Sithole',  email: 'mandla@velocityloans.co.za',     setupFee: 220000, monthlyFee: 32000, addOns: ['TruID Open Banking', 'SACRRA', 'Multi-Branch', 'Custom integrations'], status: 'accepted', sentDate: '2026-05-10', validUntil: '2026-06-10', viewedAt: '2026-05-11 08:22', acceptedAt: '2026-05-15 16:08' },
  { id: 'Q-2026-011', client: 'Imbali Finance',               contact: 'Bongi Dlamini',   email: 'bongi@imbalifinance.co.za',      setupFee: 75000,  monthlyFee: 9500,  addOns: [],                                          status: 'declined', sentDate: '2026-05-08', validUntil: '2026-06-08', viewedAt: '2026-05-09 11:45' },
  { id: 'Q-2026-010', client: 'Stratus Capital Partners',     contact: 'Naledi Mthembu',  email: 'naledi@stratuscapital.co.za',    setupFee: 175000, monthlyFee: 24000, addOns: ['TruID', 'SACRRA', 'Multi-Branch'],         status: 'draft',    sentDate: null,          validUntil: null,          viewedAt: null },
];

const statusStyle: Record<QuoteStatus, { bg: string; border: string; color: string; icon: typeof Clock }> = {
  draft:    { bg: 'rgba(75,80,128,0.15)',   border: 'rgba(75,80,128,0.3)',    color: 'var(--color-text3)', icon: FileText    },
  sent:     { bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)',   icon: Send        },
  viewed:   { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)', color: 'var(--color-amber)', icon: Clock       },
  accepted: { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)', color: 'var(--color-green)', icon: CheckCircle },
  declined: { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)',color: 'var(--color-red)',   icon: XCircle     },
  expired:  { bg: 'rgba(75,80,128,0.1)',    border: 'rgba(75,80,128,0.2)',   color: 'var(--color-text3)', icon: XCircle     },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function QuotesPage() {
  const [quotes, setQuotes]   = useState<Quote[]>(INITIAL_QUOTES);
  const [filter, setFilter]   = useState<'all' | QuoteStatus>('all');
  const [selected, setSelected] = useState<Quote | null>(null);
  const [toast, setToast]     = useState<{ kind: ToastKind; message: string } | null>(null);

  function pushToast(kind: ToastKind, message: string) { setToast({ kind, message }); }

  async function sendQuote(q: Quote) {
    if (q.status !== 'draft' && q.status !== 'sent') return;

    const updated: Quote = { ...q, status: 'sent', sentDate: todayPlus(0), validUntil: todayPlus(30) };

    // Optimistically update both arrays so the UI reflects it immediately
    setQuotes(prev => prev.map(x => x.id === q.id ? updated : x));
    setSelected(updated);

    // Fire the email (falls back to console.log if RESEND_API_KEY not set)
    try {
      const { quoteEmail } = await import('@/lib/email');
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:      q.email,
          subject: `Your AlgoLend proposal — ${q.id}`,
          html:    quoteEmail({
            id:         q.id,
            client:     q.client,
            contact:    q.contact,
            setupFee:   q.setupFee,
            monthlyFee: q.monthlyFee,
            addOns:     q.addOns,
            validUntil: todayPlus(30),
          }),
        }),
      });
      pushToast('success', `Quote ${q.id} emailed to ${q.email}.`);
    } catch {
      pushToast('info', `Quote ${q.id} marked as sent. Add RESEND_API_KEY to enable real emails.`);
    }
  }

  function markAccepted(q: Quote) {
    setQuotes((prev) => prev.map((x) =>
      x.id === q.id ? { ...x, status: 'accepted', acceptedAt: new Date().toISOString() } : x,
    ));
    pushToast('success', `${q.id} marked as accepted. First invoice queued.`);
    setSelected(null);
  }

  function markDeclined(q: Quote) {
    setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'declined' } : x)));
    pushToast('info', `${q.id} marked as declined.`);
    setSelected(null);
  }

  function downloadPDF(q: Quote) {
    const w = window.open('', '_blank', 'width=820,height=1100');
    if (!w) { pushToast('error', 'Browser blocked the PDF popup. Allow popups for this site.'); return; }
    w.document.write(printableQuote(q));
    w.document.close();
    setTimeout(() => w.print(), 250);
    pushToast('info', `${q.id} opened in print view.`);
  }

  function newQuote() {
    const id = `Q-${new Date().getFullYear()}-${String(quotes.length + 11).padStart(3, '0')}`;
    const draft: Quote = { id, client: 'New Prospect (Pty) Ltd', contact: 'Contact name', email: 'contact@example.co.za', setupFee: 100000, monthlyFee: 15000, addOns: [], status: 'draft', sentDate: null, validUntil: null, viewedAt: null };
    setQuotes((prev) => [draft, ...prev]);
    setSelected(draft);
    pushToast('success', `Draft ${id} created. Edit and send when ready.`);
  }

  const filtered = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter);
  const pipelineValue  = quotes.filter((q) => ['sent', 'viewed'].includes(q.status)).reduce((s, q) => s + q.monthlyFee * 12, 0);
  const acceptedValue  = quotes.filter((q) => q.status === 'accepted').reduce((s, q) => s + q.setupFee + q.monthlyFee * 12, 0);
  const decidedCount   = quotes.filter((q) => q.status !== 'draft').length;
  const acceptanceRate = decidedCount === 0 ? 0 : Math.round((quotes.filter((q) => q.status === 'accepted').length / decidedCount) * 100);

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Sales pipeline</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Quotes</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Custom pricing proposals for prospective lenders.</p>
          </div>
          <button onClick={newQuote} className="btn-purple btn-shine inline-flex items-center gap-1.5">
            <Plus size={15} />
            New quote
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Pipeline ARR (sent + viewed)</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{fmt(pipelineValue)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-amber)' }}>
              {quotes.filter((q) => ['sent', 'viewed'].includes(q.status)).length} awaiting response
            </p>
          </div>
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Accepted (TCV — yr 1)</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-green)' }}>{fmt(acceptedValue)}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>
              {quotes.filter((q) => q.status === 'accepted').length} accepted
            </p>
          </div>
          <div className="bento-card p-5">
            <p className="eyebrow mb-1">Acceptance rate</p>
            <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{acceptanceRate}%</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>Of {decidedCount} decided</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'viewed', 'accepted', 'declined'] as const).map((f) => (
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
              {f !== 'all' ? <span className="ml-1.5 opacity-60">{quotes.filter((q) => q.status === f).length}</span> : null}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bento-card overflow-hidden p-0">
          <table className="data-table">
            <thead>
              <tr>
                {['Quote', 'Client', 'Setup', 'Monthly', 'Status', 'Valid until', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const s = statusStyle[q.status];
                const StatusIcon = s.icon;
                return (
                  <tr
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(q)}
                    style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
                  >
                    <td>
                      <p className="font-mono text-xs" style={{ color: 'var(--color-violet)' }}>{q.id}</p>
                      {q.sentDate ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>Sent {q.sentDate}</p> : null}
                    </td>
                    <td>
                      <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{q.client}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{q.contact} · {q.email}</p>
                    </td>
                    <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(q.setupFee)}</td>
                    <td>
                      <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(q.monthlyFee)}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text3)' }}>/mo</span>
                    </td>
                    <td>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                      >
                        <StatusIcon size={11} />
                        {statusStyle[q.status].bg ? q.status : q.status}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--color-text3)' }}>{q.validUntil ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Open quote"
                          onClick={() => setSelected(q)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--color-text3)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          title="Download PDF"
                          onClick={() => downloadPDF(q)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--color-text3)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Download size={14} />
                        </button>
                        {q.status === 'draft' ? (
                          <button
                            title="Send quote"
                            onClick={() => sendQuote(q)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--color-green)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.1)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Send size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote detail slide-over */}
      {selected ? (
        <>
          <div className="slideover-backdrop" onClick={() => setSelected(null)} />
          <div
            className="slideover-panel w-full max-w-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-7" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div>
                <p className="eyebrow mb-1">Quote</p>
                <h2 className="font-mono text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{selected.id}</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text2)' }}>{selected.client}</p>
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{selected.contact} · {selected.email}</p>
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

            {/* Status row */}
            <div className="px-7 py-5" style={{ borderBottom: '1px solid var(--color-border2)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="eyebrow mb-2">Status</p>
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const s = statusStyle[selected.status];
                  const Icon = s.icon;
                  return (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                    >
                      <Icon size={12} />
                      {selected.status}
                    </span>
                  );
                })()}
                {selected.viewedAt ? <span className="text-[11px]" style={{ color: 'var(--color-text3)' }}>Viewed {selected.viewedAt}</span> : null}
                {selected.acceptedAt ? <span className="text-[11px] font-semibold" style={{ color: 'var(--color-green)' }}>Accepted {selected.acceptedAt}</span> : null}
              </div>
            </div>

            {/* Line items */}
            <div className="p-7 space-y-5">
              <div>
                <p className="eyebrow mb-3">Line items</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm" style={{ color: 'var(--color-text2)' }}>One-off implementation</span>
                    <span className="font-bold" style={{ color: 'var(--color-text)' }}>{fmt(selected.setupFee)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm" style={{ color: 'var(--color-text2)' }}>Monthly platform licence</span>
                    <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                      {fmt(selected.monthlyFee)}
                      <span className="text-xs font-normal" style={{ color: 'var(--color-text3)' }}> /mo</span>
                    </span>
                  </div>
                  {selected.addOns.length > 0 ? (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text3)' }}>Included add-ons</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.addOns.map((a) => (
                          <span
                            key={a}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Year-1 total */}
              <div
                className="tcv-card rounded-2xl p-5"
                style={{
                  border: '1px solid rgba(124,58,237,0.3)',
                  boxShadow: '0 0 30px rgba(124,58,237,0.1)',
                }}
              >
                <p className="tcv-label text-[10px] font-bold uppercase tracking-wider mb-1">Year-one total contract value</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmt(selected.setupFee + selected.monthlyFee * 12)}</p>
                <p className="tcv-sub text-[11px] mt-1">
                  {fmt(selected.setupFee)} setup + {fmt(selected.monthlyFee * 12)} licence (12 months)
                </p>
              </div>

              {/* Public accept link */}
              {(['sent', 'viewed'] as QuoteStatus[]).includes(selected.status) ? (
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={13} style={{ color: 'var(--color-sky)' }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-sky)' }}>Public accept link</p>
                  </div>
                  <code
                    className="block font-mono text-[11px] rounded-lg px-3 py-2 break-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(96,165,250,0.2)', color: 'var(--color-sky)' }}
                  >
                    https://algolend.co.za/accept/{selected.id.toLowerCase()}
                  </code>
                  <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--color-sky)' }}>
                    Client clicks this in the email — they can accept without logging in.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div
              className="p-7 sticky bottom-0 backdrop-blur space-y-2"
              style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}
            >
              {(selected.status === 'draft' || selected.status === 'sent' || selected.status === 'viewed') ? (
                <button
                  onClick={() => sendQuote(selected)}
                  className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  {selected.status === 'draft' ? 'Send quote' : 'Resend quote'}
                </button>
              ) : null}
              {(['sent', 'viewed'] as QuoteStatus[]).includes(selected.status) ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => markAccepted(selected)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'linear-gradient(135deg, #059669, #34d399)',
                      boxShadow: '0 4px 16px rgba(52,211,153,0.3)',
                    }}
                  >
                    <CheckCircle size={14} />
                    Mark accepted
                  </button>
                  <button
                    onClick={() => markDeclined(selected)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-red)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
                  >
                    <XCircle size={14} />
                    Mark declined
                  </button>
                </div>
              ) : null}
              <button
                onClick={() => downloadPDF(selected)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </>
      ) : null}
    </Shell>
  );
}

/* ─── Printable HTML for the PDF view ─────────────────────────────── */

function printableQuote(q: Quote): string {
  const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
  const tcv = q.setupFee + q.monthlyFee * 12;
  const addOnsHtml = q.addOns.length === 0 ? '' : `
    <h3>Included add-ons</h3>
    <ul>${q.addOns.map((a) => `<li>${a}</li>`).join('')}</ul>
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Quote ${q.id} — AlgoLend</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Geist', sans-serif; color: #0f172a; padding: 60px 80px; max-width: 800px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 32px; }
  .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.025em; color: #7C3AED; }
  .meta { text-align: right; font-size: 12px; color: #64748b; }
  h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.02em; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 32px 0 12px 0; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 16px 0 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 14px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  td.amt { text-align: right; font-weight: 600; }
  .total { background: #1a0533; color: white; padding: 24px; border-radius: 16px; margin-top: 32px; }
  .total .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
  .total .v { font-size: 32px; font-weight: 700; margin-top: 4px; }
  .total .sub { font-size: 12px; opacity: 0.7; margin-top: 4px; }
  .foot { margin-top: 48px; font-size: 11px; color: #94a3b8; line-height: 1.6; }
  ul { padding-left: 18px; font-size: 13px; } li { margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">AlgoLend</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">A product of Mint Platforms (Pty) Ltd</div>
    </div>
    <div class="meta">
      <div><strong>${q.id}</strong></div>
      ${q.sentDate ? `<div>Issued: ${q.sentDate}</div>` : ''}
      ${q.validUntil ? `<div>Valid until: ${q.validUntil}</div>` : ''}
    </div>
  </div>
  <h1>Pricing proposal</h1>
  <div style="color: #64748b; font-size: 14px;">Prepared for ${q.client}</div>
  <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">${q.contact} · ${q.email}</div>
  <h2>Line items</h2>
  <table>
    <tr><td>One-off implementation</td><td class="amt">${fmt(q.setupFee)}</td></tr>
    <tr><td>Monthly platform licence</td><td class="amt">${fmt(q.monthlyFee)} / mo</td></tr>
  </table>
  ${addOnsHtml}
  <div class="total">
    <div class="label">Year-one total contract value</div>
    <div class="v">${fmt(tcv)}</div>
    <div class="sub">${fmt(q.setupFee)} setup + ${fmt(q.monthlyFee * 12)} licence (12 months)</div>
  </div>
  <p class="foot">
    Pass-through API costs (Experian, TruID, DocuSeal) are billed at cost in addition to the figures above — no markup.
    This proposal is valid for 30 days from the issue date. To accept, reply to this email or use the secure accept link shared separately.
  </p>
</body>
</html>`;
}
