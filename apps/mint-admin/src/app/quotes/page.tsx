'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { QuoteEditPanel, type QuoteEditState, type CustomItem } from '@/components/QuoteEditPanel';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import {
  CHECK_CATALOG, BRANCH_RATE, computeMonthlyFee, parseQuota, nearestTierLabel, fmtR, fmtRc,
  type CheckId,
} from '@/lib/quote-pricing';
import {
  FileText, Send, Download, Plus, CheckCircle, Clock, XCircle, X, Eye, Sparkles,
  Pencil, Save, UserPlus, AlertCircle, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { PriceReveal } from '@/components/PriceReveal';
import { useRole } from '@/hooks/useRole';

type QuoteStatus = 'pending_approval' | 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

interface Quote {
  dbId:           string;       // UUID from DB (used for API calls)
  id:             string;       // reference Q-YYYY-NNN (used for display)
  client:         string;
  contact:        string;
  email:          string;
  setupFee:       number;
  monthlyFee:     number;
  selectedChecks: CheckId[];
  quota:          number;
  branches:       number;
  customItems:    CustomItem[];
  status:         QuoteStatus;
  sentDate:       string | null;
  validUntil:     string | null;
  viewedAt:       string | null;
  acceptedAt?:    string;
  agentId?:       string;
  submittedBy?:   string;
}

// Map DB row → Quote
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): Quote {
  return {
    dbId:           row.id,
    id:             row.reference,
    client:         row.client_name,
    contact:        row.contact_name,
    email:          row.contact_email,
    setupFee:       Number(row.setup_fee),
    monthlyFee:     Number(row.monthly_fee),
    selectedChecks: (row.selected_checks ?? []) as CheckId[],
    quota:          parseQuota(row.volume_tier),
    branches:       row.branches ?? 1,
    customItems:    (row.custom_items ?? []) as CustomItem[],
    status:         row.status as QuoteStatus,
    sentDate:       row.sent_at   ? row.sent_at.slice(0, 10)   : null,
    validUntil:     row.valid_until ?? null,
    viewedAt:       row.viewed_at  ? row.viewed_at.slice(0, 16).replace('T', ' ') : null,
    acceptedAt:     row.accepted_at ? row.accepted_at.slice(0, 16).replace('T', ' ') : undefined,
    agentId:        row.agent_id    ?? undefined,
    submittedBy:    row.submitted_by ?? undefined,
  };
}

const statusStyle: Record<QuoteStatus, { bg: string; border: string; color: string; icon: typeof Clock }> = {
  pending_approval: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',   color: '#FBBF24',            icon: AlertCircle },
  draft:            { bg: 'rgba(75,80,128,0.15)',   border: 'rgba(75,80,128,0.3)',    color: 'var(--color-text3)', icon: FileText    },
  sent:             { bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)',   icon: Send        },
  viewed:           { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)', color: 'var(--color-amber)', icon: Clock       },
  accepted:         { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)', color: 'var(--color-green)', icon: CheckCircle },
  declined:         { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)',color: 'var(--color-red)',   icon: XCircle     },
  expired:          { bg: 'rgba(75,80,128,0.1)',    border: 'rgba(75,80,128,0.2)',   color: 'var(--color-text3)', icon: XCircle     },
};

function todayPlus(days: number) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function QuotesPage() {
  const { isSuperAdmin, email } = useRole();
  const [quotes, setQuotes]       = useState<Quote[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all' | QuoteStatus>('all');
  const [selected, setSelected]   = useState<Quote | null>(null);
  const [editState, setEditState]     = useState<QuoteEditState | null>(null);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<{ kind: ToastKind; message: string } | null>(null);
  const [onboardQuote, setOnboardQuote] = useState<Quote | null>(null);

  function pushToast(kind: ToastKind, message: string) { setToast({ kind, message }); }

  // Load from DB on mount
  useEffect(() => {
    fetch('/api/quotes')
      .then(r => r.json())
      .then(({ quotes: rows }) => {
        const mapped = (rows ?? []).map(fromRow);
        setQuotes(mapped);

        // Auto-create prefilled draft when arriving from the pricing calculator
        const params = new URLSearchParams(window.location.search);
        if (params.get('new') === '1') {
          const raw     = sessionStorage.getItem('new_quote_prefill');
          sessionStorage.removeItem('new_quote_prefill');
          const prefill = raw ? JSON.parse(raw) : null;
          window.history.replaceState({}, '', '/quotes');
          createQuote({
            client:         prefill?.client,
            contact:        prefill?.contact,
            email:          prefill?.email,
            monthlyFee:     prefill?.monthlyFee     ?? computeMonthlyFee(['bureau', 'banking'], prefill?.quota ?? 50, 1),
            selectedChecks: prefill?.selectedChecks ?? ['bureau', 'banking'],
            quota:          prefill?.quota          ?? 50,
            branches:       prefill?.branches       ?? 1,
          }, mapped);
        }
      })
      .catch(() => pushToast('error', 'Failed to load quotes.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createQuote(prefill?: Partial<Quote> & { client?: string; contact?: string; email?: string }, existingQuotes?: Quote[]) {
    const quota = prefill?.quota ?? 50;
    const payload = {
      client:         prefill?.client   ?? 'New Prospect (Pty) Ltd',
      contact:        prefill?.contact  ?? 'Contact name',
      email:          prefill?.email    ?? 'contact@example.co.za',
      setupFee:       100000,
      monthlyFee:     prefill?.monthlyFee ?? computeMonthlyFee(['bureau', 'banking'], quota, 1),
      selectedChecks: prefill?.selectedChecks ?? ['bureau', 'banking'],
      quota,
      branches:       prefill?.branches ?? 1,
      customItems:    [],
      status:         'draft',
    };
    setSaving(true);
    try {
      const res  = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const draft = fromRow(data.quote);
      setQuotes(prev => [draft, ...(existingQuotes ?? prev)]);
      setSelected(draft);
      setEditState({
        client: draft.client, contact: draft.contact, email: draft.email,
        setupFee: String(draft.setupFee), monthlyFee: String(draft.monthlyFee),
        selectedChecks: draft.selectedChecks, quota: String(draft.quota),
        branches: String(draft.branches), customItems: [],
      });
      pushToast('success', `Draft ${draft.id} created.`);
    } catch (e) {
      pushToast('error', `Failed to create quote: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(q: Quote) {
    setEditState({
      client: q.client, contact: q.contact, email: q.email,
      setupFee: String(q.setupFee), monthlyFee: String(q.monthlyFee),
      selectedChecks: q.selectedChecks, quota: String(q.quota),
      branches: String(q.branches), customItems: q.customItems,
    });
  }

  async function saveEdit(q: Quote) {
    if (!editState) return;
    const branches   = Math.max(1, parseInt(editState.branches, 10) || 1);
    const setupFee   = Math.max(0, parseInt(editState.setupFee.replace(/\D/g, ''), 10) || 0);
    const flatFee    = Math.max(0, parseFloat(editState.monthlyFee) || 0);
    const branchExtra = branches > 1 ? (branches - 1) * BRANCH_RATE : 0;
    const customMo   = editState.customItems.filter((c) => c.recurring).reduce((s, c) => s + c.amount, 0);
    const monthly    = flatFee + branchExtra + customMo;
    const patch = {
      client:         editState.client.trim()   || q.client,
      contact:        editState.contact.trim()  || q.contact,
      email:          editState.email.trim()    || q.email,
      setupFee, monthlyFee: monthly,
      selectedChecks: editState.selectedChecks,
      quota:          Math.max(0, parseInt(editState.quota, 10) || 0),
      branches,
      customItems:    editState.customItems,
    };
    setSaving(true);
    try {
      const res  = await fetch(`/api/quotes/${q.dbId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = fromRow(data.quote);
      setQuotes(prev => prev.map(x => x.dbId === q.dbId ? updated : x));
      setSelected(updated);
      setEditState(null);
      pushToast('success', `${q.id} updated.`);
    } catch (e) {
      pushToast('error', `Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(q: Quote, patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const res  = await fetch(`/api/quotes/${q.dbId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = fromRow(data.quote);
      setQuotes(prev => prev.map(x => x.dbId === q.dbId ? updated : x));
      setSelected(updated);
      return updated;
    } catch (e) {
      pushToast('error', `Update failed: ${(e as Error).message}`);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendQuote(q: Quote) {
    const until   = todayPlus(30);
    const updated = await patchStatus(q, { status: 'sent', sentDate: todayPlus(0), validUntil: until });
    if (!updated) return;
    const html = `<p>Dear ${q.contact},</p><p>Please find your AlgoLend pricing proposal <strong>${q.id}</strong> below.</p><p><strong>Once-off implementation fee (paid before go-live):</strong> ${fmtR(q.setupFee)}<br><strong>Monthly platform licence (recurring, billed monthly — not upfront):</strong> ${fmtR(q.monthlyFee)}/mo, includes ${q.quota.toLocaleString()} API checks/month<br><strong>Usage beyond the included quota</strong> is billed pay-as-you-go at our published per-check rates.<br><strong>Valid until:</strong> ${until}</p><p>Reply to this email with any questions.</p><p>— MINT Platforms (Pty) Ltd</p>`;
    fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: q.email, subject: `AlgoLend proposal ${q.id} — ${q.client}`, html }),
    }).catch(() => null);
    pushToast('success', `Quote ${q.id} sent to ${q.email}.`);
  }

  async function markAccepted(q: Quote) {
    await patchStatus(q, { status: 'accepted', acceptedAt: new Date().toISOString() });
    pushToast('success', `${q.id} accepted.`);
    setSelected(null);
  }

  async function markDeclined(q: Quote) {
    await patchStatus(q, { status: 'declined' });
    pushToast('info', `${q.id} declined.`);
    setSelected(null);
  }

  function downloadPDF(q: Quote) {
    const w = window.open('', '_blank', 'width=820,height=1100');
    if (!w) { pushToast('error', 'Allow popups to download PDF.'); return; }
    w.document.write(printableQuote(q, isSuperAdmin));
    w.document.close();
    setTimeout(() => w.print(), 250);
  }

  const filtered       = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter);
  const pipelineValue  = quotes.filter((q) => ['sent','viewed'].includes(q.status)).reduce((s, q) => s + q.monthlyFee * 12, 0);
  const acceptedValue  = quotes.filter((q) => q.status === 'accepted').reduce((s, q) => s + q.setupFee + q.monthlyFee * 12, 0);
  const decidedCount   = quotes.filter((q) => !['draft', 'pending_approval'].includes(q.status)).length;
  const acceptanceRate = decidedCount === 0 ? 0 : Math.round((quotes.filter((q) => q.status === 'accepted').length / decidedCount) * 100);

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}
      {onboardQuote ? (
        <OnboardingWizard
          onClose={() => setOnboardQuote(null)}
          onCreated={() => {
            setOnboardQuote(null);
            setSelected(null);
            setToast({ kind: 'success', message: `${onboardQuote.client} activated as a new client.` });
          }}
          initialValues={{
            name:         onboardQuote.client,
            contactEmail: onboardQuote.email,
            contactName:  onboardQuote.contact,
          }}
        />
      ) : null}

      <div className="space-y-6 page-enter">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Sales pipeline</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Quotes</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Custom pricing proposals for prospective lenders.</p>
          </div>
          <button onClick={() => createQuote()} disabled={saving} className="btn-purple btn-shine inline-flex items-center gap-1.5 disabled:opacity-50"><Plus size={15} /> New quote</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Pending Review',
              value: quotes.filter((q) => q.status === 'pending_approval').length,
              display: String(quotes.filter((q) => q.status === 'pending_approval').length),
              sub: 'Submitted by team — needs sign-off',
              subColor: '#FBBF24',
              rgb: '251,191,36',
            },
            {
              label: 'Pipeline ARR',
              value: pipelineValue,
              display: fmtR(pipelineValue),
              sub: `${quotes.filter((q) => ['sent','viewed'].includes(q.status)).length} awaiting response`,
              subColor: 'var(--color-sky)',
              rgb: '96,165,250',
            },
            {
              label: 'Accepted (TCV yr 1)',
              value: acceptedValue,
              display: fmtR(acceptedValue),
              sub: `${quotes.filter((q) => q.status === 'accepted').length} accepted`,
              subColor: 'var(--color-green)',
              rgb: '52,211,153',
            },
            {
              label: 'Acceptance Rate',
              value: acceptanceRate,
              display: `${acceptanceRate}%`,
              sub: `Of ${decidedCount} decided`,
              subColor: 'var(--color-text3)',
              rgb: '124,58,237',
            },
          ].map((card) => (
            <div key={card.label} className="bento-card p-5 relative overflow-hidden">
              {/* Dot grid */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.4 }} />
              {/* Color wash */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(${card.rgb},0.09) 0%, transparent 60%)` }} />
              <div className="relative">
                <p className="eyebrow mb-1">{card.label}</p>
                <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{card.display}</p>
                <p className="text-xs mt-1.5 font-semibold" style={{ color: card.subColor }}>{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['all','pending_approval','draft','sent','viewed','accepted','declined'] as const).map((f) => {
            const label = f === 'all' ? 'All' : f === 'pending_approval' ? 'Pending Approval' : f.charAt(0).toUpperCase() + f.slice(1);
            const count = f === 'all' ? quotes.length : quotes.filter((q) => q.status === f).length;
            const hasPending = f === 'pending_approval' && count > 0;
            return (
              <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={filter === f
                  ? { background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))', color: '#fff', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }
                  : hasPending
                    ? { background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
                onMouseEnter={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                onMouseLeave={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = hasPending ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)'; }}
              >
                {label}
                {f !== 'all' ? <span className="ml-1.5 opacity-60">{count}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="bento-card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40" style={{ color: 'var(--color-text3)' }}>Loading quotes…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--color-text3)' }}>
              <FileText size={24} opacity={0.3} />
              <p className="text-sm">{filter === 'all' ? 'No quotes yet. Create one to get started.' : `No ${filter} quotes.`}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr>{['Quote','Client','Monthly','Volume','Status','Valid until',''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((q, i) => {
                  const s = statusStyle[q.status];
                  const StatusIcon = s.icon;
                  return (
                    <tr key={q.dbId} className="cursor-pointer" onClick={() => setSelected(q)} style={{ animation: 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${i * 40}ms`, borderLeft: q.status === 'pending_approval' ? '3px solid #FBBF24' : undefined }}>
                      <td><p className="font-mono text-xs" style={{ color: 'var(--color-violet)' }}>{q.id}</p>{q.sentDate ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>Sent {q.sentDate}</p> : null}</td>
                      <td><p className="font-semibold" style={{ color: 'var(--color-text)' }}>{q.client}</p><p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{q.contact}</p></td>
                      <td><span className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmtR(q.monthlyFee)}</span><span className="text-xs" style={{ color: 'var(--color-text3)' }}>/mo</span></td>
                      <td><span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>{q.quota.toLocaleString()} calls</span></td>
                      <td><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}><StatusIcon size={11} />{q.status}</span></td>
                      <td className="text-xs" style={{ color: 'var(--color-text3)' }}>{q.validUntil ?? '—'}</td>
                      <td>
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button title="View" onClick={() => setSelected(q)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text3)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><Eye size={14} /></button>
                          <button title="PDF" onClick={() => downloadPDF(q)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text3)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><Download size={14} /></button>
                          {q.status === 'draft' ? <button title="Send" onClick={() => sendQuote(q)} disabled={saving} className="p-1.5 rounded-lg transition-colors disabled:opacity-50" style={{ color: 'var(--color-green)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.1)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><Send size={14} /></button> : null}
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

      {selected ? (
        <>
          <div className="slideover-backdrop" onClick={() => { setSelected(null); setEditState(null); }} />
          <div className="slideover-panel w-full max-w-lg flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between p-7 shrink-0" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div>
                <p className="eyebrow mb-1">Quote</p>
                <h2 className="font-mono text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{selected.id}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text2)' }}>{selected.client}</p>
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{selected.contact} · {selected.email}</p>
                {selected.submittedBy && (
                  <p className="text-xs mt-1 font-medium" style={{ color: '#FBBF24' }}>
                    Submitted by {selected.submittedBy} · awaiting approval
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                {(selected.status === 'draft' || selected.status === 'pending_approval') && !editState ? (
                  <button onClick={() => openEdit(selected)} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ color: 'var(--color-violet)', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <Pencil size={12} /> Edit
                  </button>
                ) : null}
                <button onClick={() => { setSelected(null); setEditState(null); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text3)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><X size={16} /></button>
              </div>
            </div>

            {/* Status */}
            <div className="px-7 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border2)', background: 'rgba(255,255,255,0.02)' }}>
              {(() => { const s = statusStyle[selected.status]; const Icon = s.icon; return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}><Icon size={12} />{selected.status}</span>
              ); })()}
              {selected.viewedAt ? <span className="text-[11px] ml-3" style={{ color: 'var(--color-text3)' }}>Viewed {selected.viewedAt}</span> : null}
              {selected.acceptedAt ? <span className="text-[11px] ml-3 font-semibold" style={{ color: 'var(--color-green)' }}>Accepted {selected.acceptedAt}</span> : null}
            </div>

            {/* Body: edit or view */}
            {editState ? (
              <QuoteEditPanel state={editState} onChange={(patch) => setEditState((s) => s ? { ...s, ...patch } : s)} isSuperAdmin={isSuperAdmin} email={email} />
            ) : (
              <div className="p-7 space-y-5">
                <div>
                  <p className="eyebrow mb-1">One-off, paid before go-live</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline"><span className="text-sm" style={{ color: 'var(--color-text2)' }}>Implementation / activation fee</span><span className="font-bold" style={{ color: 'var(--color-text)' }}>{fmtR(selected.setupFee)}</span></div>
                    {selected.customItems.filter((ci) => !ci.recurring).map((ci, i) => (
                      <div key={i} className="flex justify-between items-baseline"><span className="text-sm" style={{ color: 'var(--color-text2)' }}>{ci.label || 'Custom item'}</span><span className="font-bold" style={{ color: 'var(--color-text)' }}>{fmtR(ci.amount)}</span></div>
                    ))}
                  </div>
                  <p className="eyebrow mb-1">Recurring — billed monthly, not upfront</p>
                  <div className="space-y-1 mb-1">
                    <div className="flex justify-between items-baseline"><span className="text-sm" style={{ color: 'var(--color-text2)' }}>Platform licence</span><span className="font-bold" style={{ color: 'var(--color-text)' }}>{fmtR(selected.monthlyFee)}<span className="text-xs font-normal" style={{ color: 'var(--color-text3)' }}>/mo</span></span></div>
                    {selected.customItems.filter((ci) => ci.recurring).map((ci, i) => (
                      <div key={i} className="flex justify-between items-baseline"><span className="text-sm" style={{ color: 'var(--color-text2)' }}>{ci.label || 'Custom item'}</span><span className="font-bold" style={{ color: 'var(--color-text)' }}>{fmtR(ci.amount)}<span className="text-xs font-normal" style={{ color: 'var(--color-text3)' }}>/mo</span></span></div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--color-text3)' }}>Includes {selected.quota.toLocaleString()} API checks/month. Usage beyond this is billed pay-as-you-go at the per-check rates below — never charged upfront.</p>
                </div>
                {selected.selectedChecks.length > 0 ? (
                  <div>
                    <p className="eyebrow mb-2">Pay-as-you-go rates (beyond included quota)</p>
                    <div className="space-y-1">
                      {selected.selectedChecks.map((id) => {
                        const c = CHECK_CATALOG.find((x) => x.id === id);
                        if (!c) return null;
                        return (
                          <div key={id} className="flex justify-between items-center">
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' }}>{c.label}</span>
                            {c.clientRate === 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.25)' }}>
                                Included
                              </span>
                            ) : (
                              <PriceReveal isSuperAdmin={isSuperAdmin} email={email}>
                                <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>{fmtRc(c.clientRate)}/chk</span>
                              </PriceReveal>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="tcv-card rounded-2xl p-5" style={{ border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 0 30px rgba(124,58,237,0.1)' }}>
                  <p className="tcv-label text-[10px] font-bold uppercase tracking-wider mb-1">Projected year-one value (not an invoice)</p>
                  <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmtR(selected.setupFee + selected.monthlyFee * 12)}</p>
                  <p className="tcv-sub text-[11px] mt-1">{fmtR(selected.setupFee)} once-off setup + {fmtR(selected.monthlyFee)}/mo × 12 months. Nothing here is due upfront — setup is billed once, licence is billed monthly, and usage above the included quota is billed separately as incurred.</p>
                </div>
                {(['sent','viewed'] as QuoteStatus[]).includes(selected.status) ? (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <div className="flex items-center gap-2 mb-2"><Sparkles size={13} style={{ color: 'var(--color-sky)' }} /><p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-sky)' }}>Accept link</p></div>
                    <code className="block font-mono text-[11px] rounded-lg px-3 py-2 break-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(96,165,250,0.2)', color: 'var(--color-sky)' }}>https://algolend.co.za/accept/{selected.id.toLowerCase()}</code>
                  </div>
                ) : null}
              </div>
            )}

            {/* Actions */}
            <div className="p-7 sticky bottom-0 backdrop-blur space-y-2 mt-auto shrink-0" style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}>
              {editState ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => saveEdit(selected)} disabled={saving} className="btn-purple btn-shine inline-flex items-center justify-center gap-1.5 disabled:opacity-50"><Save size={14} />{saving ? 'Saving…' : 'Save changes'}</button>
                  <button onClick={() => setEditState(null)} className="inline-flex items-center justify-center py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>Cancel</button>
                </div>
              ) : (
                <>
                  {selected.status === 'pending_approval' ? (
                    <div className="space-y-2 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--color-text3)' }}>
                        Submitted by {selected.submittedBy ?? 'your team'} — review before approving
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => patchStatus(selected, { status: 'draft' })} disabled={saving}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #059669, #34d399)', boxShadow: '0 4px 16px rgba(52,211,153,0.3)' }}>
                          <ThumbsUp size={14} /> Approve
                        </button>
                        <button onClick={() => patchStatus(selected, { status: 'declined' })} disabled={saving}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                          style={{ border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', background: 'rgba(248,113,113,0.06)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.12)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)'; }}>
                          <ThumbsDown size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {(['draft','sent','viewed'] as QuoteStatus[]).includes(selected.status) ? (
                    <button onClick={() => sendQuote(selected)} disabled={saving} className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"><Send size={14} />{selected.status === 'draft' ? 'Send quote' : 'Resend quote'}</button>
                  ) : null}
                  {(['sent','viewed'] as QuoteStatus[]).includes(selected.status) ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => markAccepted(selected)} disabled={saving} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#059669,#34d399)', boxShadow: '0 4px 16px rgba(52,211,153,0.3)' }}><CheckCircle size={14} /> Accept</button>
                      <button onClick={() => markDeclined(selected)} disabled={saving} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-red)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}><XCircle size={14} /> Decline</button>
                    </div>
                  ) : null}
                  {selected.status === 'accepted' ? (
                    <button onClick={() => setOnboardQuote(selected)} className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2"><UserPlus size={14} /> Activate as client</button>
                  ) : null}
                  <button onClick={() => downloadPDF(selected)} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><Download size={14} /> Download PDF</button>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </Shell>
  );
}

function printableQuote(q: Quote, isSuperAdmin: boolean): string {
  const checksHtml = q.selectedChecks.map((id) => {
    const c = CHECK_CATALOG.find((x) => x.id === id);
    if (!c) return '';
    const rateText = c.clientRate === 0 ? 'Included' : `${fmtRc(c.clientRate)}/chk`;
    const rateCell = isSuperAdmin ? `<td class="amt">${rateText}</td>` : '<td class="amt">—</td>';
    return `<tr><td>${c.label}</td>${rateCell}</tr>`;
  }).join('');
  const tcv = q.setupFee + q.monthlyFee * 12;
  const logoSvg = `<svg width="30" height="34" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><defs><linearGradient id="lg" x1="5" y1="38" x2="5" y2="3" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient></defs><path d="M5 36 L5 13 Q5 3 16 3 Q28 3 28 14 Q28 23 19 26" stroke="url(#lg)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="14" r="11" fill="#1a1033"/></svg>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Quote ${q.id}</title>
<style>
  * { box-sizing: border-box; } body { font-family: -apple-system, sans-serif; color: #0f172a; padding: 60px 80px; max-width: 800px; margin: 0 auto; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 32px; }
  .brand-wrap { display: flex; align-items: center; gap: 10px; }
  .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.025em; color: #1a1033; }
  .meta { text-align: right; font-size: 12px; color: #64748b; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 24px 0 10px; }
  table { width: 100%; border-collapse: collapse; } td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; } td.amt { text-align: right; font-weight: 600; }
  .total { background: #1a0533; color: white; padding: 24px; border-radius: 16px; margin-top: 28px; }
  .total .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
  .total .v { font-size: 32px; font-weight: 700; margin-top: 4px; } .total .sub { font-size: 12px; opacity: 0.7; margin-top: 4px; }
  .foot { margin-top: 40px; font-size: 11px; color: #94a3b8; line-height: 1.6; }
</style></head><body>
<div class="head"><div><div class="brand-wrap">${logoSvg}<span class="brand">AlgoLend</span></div><div style="font-size:11px;color:#64748b;margin-top:4px">A product of MINT Platforms (Pty) Ltd</div></div>
<div class="meta"><strong>${q.id}</strong>${q.sentDate ? `<br>Issued: ${q.sentDate}` : ''}${q.validUntil ? `<br>Valid until: ${q.validUntil}` : ''}</div></div>
<div style="font-size:22px;font-weight:700;margin-bottom:4px">Pricing proposal</div>
<div style="color:#64748b">${q.client} · ${q.contact} · ${q.email}</div>
<h2>Once-off — paid before go-live</h2>
<table>
  <tr><td>Implementation / activation fee</td><td class="amt">${fmtR(q.setupFee)}</td></tr>
  ${q.customItems.filter((ci) => !ci.recurring).map((ci) => `<tr><td>${ci.label}</td><td class="amt">${fmtR(ci.amount)}</td></tr>`).join('')}
</table>
<h2>Recurring — billed monthly, not upfront</h2>
<table>
  <tr><td>Platform licence — ${nearestTierLabel(q.quota)} tier (includes ${q.quota.toLocaleString()} API checks/mo)</td><td class="amt">${fmtR(q.monthlyFee)}/mo</td></tr>
  ${q.customItems.filter((ci) => ci.recurring).map((ci) => `<tr><td>${ci.label}</td><td class="amt">${fmtR(ci.amount)}/mo</td></tr>`).join('')}
</table>
<p style="font-size:11px;color:#64748b;margin-top:10px">The monthly licence fee already covers ${q.quota.toLocaleString()} API checks. Any usage beyond that quota is billed pay-as-you-go at the per-check rates below — it is never charged upfront.</p>
${checksHtml ? `<h2>Pay-as-you-go rates (beyond included quota)</h2><table>${checksHtml}</table>` : ''}
<div class="total"><div class="label">Projected year-one value (not an invoice)</div><div class="v">${fmtR(tcv)}</div><div class="sub">${fmtR(q.setupFee)} once-off setup + ${fmtR(q.monthlyFee)}/mo &times; 12 months. Setup is billed once; the licence recurs monthly; nothing here is due as a single upfront payment.</div></div>
<p class="foot">Pass-through costs for CIPC, SACRRA, and other bureau data are included in the per-check rates above. This proposal is valid for 30 days from the issue date.</p>
</body></html>`;
}
