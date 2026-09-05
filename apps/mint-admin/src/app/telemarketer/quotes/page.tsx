'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CHECK_CATALOG, computeMonthlyFee, fmtR, type CheckId } from '@/lib/quote-pricing';
import {
  Clock, FileText, Plus, Send, X,
  CheckCircle2, ArrowUpRight, TrendingUp,
  AlertCircle, Loader2,
} from 'lucide-react';

type QuoteStatus = 'pending_approval' | 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

interface TmQuote {
  dbId:       string;
  id:         string;
  client:     string;
  contact:    string;
  email:      string;
  monthlyFee: number;
  setupFee:   number;
  quota:      number;
  status:     QuoteStatus;
  createdAt:  string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): TmQuote {
  return {
    dbId:       row.id,
    id:         row.reference,
    client:     row.client_name,
    contact:    row.contact_name,
    email:      row.contact_email,
    monthlyFee: Number(row.monthly_fee),
    setupFee:   Number(row.setup_fee),
    quota:      Number(row.volume_tier) || 0,
    status:     row.status as QuoteStatus,
    createdAt:  (row.created_at as string)?.slice(0, 10) ?? '',
  };
}

const STATUS_STYLE: Record<QuoteStatus, { bg: string; border: string; color: string; label: string }> = {
  pending_approval: { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: '#FBBF24',            label: 'Awaiting Approval'       },
  draft:            { bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)',   color: '#60A5FA',            label: 'Approved: Ready to Send' },
  sent:             { bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)',  color: '#A78BFA',            label: 'Sent to Client'          },
  viewed:           { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',  color: '#FBBF24',            label: 'Viewed by Client'        },
  accepted:         { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',  color: '#34D399',            label: 'Accepted'                },
  declined:         { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)', color: '#F87171',            label: 'Not Approved / Declined' },
  expired:          { bg: 'rgba(75,80,128,0.1)',    border: 'rgba(75,80,128,0.2)',    color: 'var(--color-text3)', label: 'Expired'                 },
};

const VOLUME_PRESETS = [
  { label: '100/mo',    value: 100   },
  { label: '500/mo',    value: 500   },
  { label: '1,000/mo',  value: 1000  },
  { label: '2,500/mo',  value: 2500  },
  { label: '5,000/mo',  value: 5000  },
  { label: '10,000/mo', value: 10000 },
];

const PACKS: {
  id:         string;
  label:      string;
  desc:       string;
  checks:     CheckId[];
  volume:     number;
  monthlyFee: number;   // published platform licence fee
  color:      string;
  rgb:        string;
}[] = [
  {
    id:         'starter',
    label:      'Starter',
    desc:       'Bureau + Bank account linking. R1,999/mo platform licence.',
    checks:     ['bureau', 'banking'],
    volume:     500,
    monthlyFee: 1999,
    color:      '#60A5FA',
    rgb:        '96,165,250',
  },
  {
    id:         'enterprise',
    label:      'Enterprise',
    desc:       'Full KYC, AML, e-contracts & more. R14,999/mo platform licence.',
    checks:     ['bureau', 'banking', 'contracts', 'liveness', 'homeaff', 'watchlist', 'address'],
    volume:     2000,
    monthlyFee: 14999,
    color:      '#A78BFA',
    rgb:        '167,139,250',
  },
];

// ── Animated number counter (matches dashboard) ───────────────────────────────
function AnimCount({ to }: { to: number }) {
  const [val, setVal] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (to === 0) return;
    let cur = 0;
    const inc = to / 40;
    timer.current = setInterval(() => {
      cur += inc;
      if (cur >= to) { setVal(to); clearInterval(timer.current!); }
      else { setVal(Math.round(cur)); }
    }, 16);
    return () => clearInterval(timer.current!);
  }, [to]);
  return <>{val.toLocaleString('en-ZA')}</>;
}

// ── Mini sparkline bars (matches dashboard) ───────────────────────────────────
function SparkBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-7 mt-3">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-[2px]"
          style={{ height: `${Math.max((v / max) * 100, 8)}%`, background: i === data.length - 1 ? color : `${color}38` }} />
      ))}
    </div>
  );
}

export default function TelemarketerQuotesPage() {
  const [quotes,   setQuotes]   = useState<TmQuote[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<'all' | QuoteStatus>('all');
  const [saving,   setSaving]   = useState(false);

  // Form state
  const [client,      setClient]      = useState('');
  const [contact,     setContact]     = useState('');
  const [email,       setEmail]       = useState('');
  const [quota,       setQuota]       = useState(500);
  const [branches,    setBranches]    = useState(1);
  const [checks,      setChecks]      = useState<CheckId[]>(['bureau', 'banking']);
  const [overrideFee, setOverrideFee] = useState<number | null>(null);

  const monthlyFee = useMemo(
    () => overrideFee ?? computeMonthlyFee(checks, quota, branches),
    [overrideFee, checks, quota, branches],
  );
  const setupFee = 100000;

  const activePack = overrideFee !== null
    ? PACKS.find(p => p.monthlyFee === overrideFee)
    : undefined;

  useEffect(() => {
    fetch('/api/telemarketer/quotes')
      .then(r => r.json())
      .then(({ quotes: rows }) => setQuotes((rows ?? []).map(fromRow)))
      .catch(() => {/* fail silently */})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function resetForm() {
    setClient(''); setContact(''); setEmail('');
    setQuota(500); setBranches(1); setChecks(['bureau', 'banking']); setOverrideFee(null);
    setShowForm(false);
  }

  async function submitQuote() {
    if (!client.trim() || !contact.trim() || !email.trim()) {
      setToast('Please fill in client name, contact person, and email.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/telemarketer/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, contact, email, quota, branches, selectedChecks: checks, setupFee, monthlyFee }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit');
      setQuotes(prev => [fromRow(data.quote), ...prev]);
      resetForm();
      setToast('Quote submitted. Keri-Leigh will review and approve before it\'s sent.');
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered      = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const pending       = quotes.filter(q => q.status === 'pending_approval').length;
  const active        = quotes.filter(q => ['draft', 'sent', 'viewed'].includes(q.status)).length;
  const won           = quotes.filter(q => q.status === 'accepted').length;
  const pipelineValue = quotes
    .filter(q => ['draft', 'sent', 'viewed', 'accepted'].includes(q.status))
    .reduce((sum, q) => sum + q.monthlyFee, 0);
  const winRate       = quotes.length > 0 ? Math.round((won / quotes.length) * 100) : 0;

  return (
    <div className="space-y-4 page-enter">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl text-sm font-medium shadow-xl cursor-pointer"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', color: 'var(--color-text)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {/* ══ Hero panel (matches dashboard greeting style) ═════════════════ */}
      <div className="bento-card p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)' }} />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="eyebrow mb-1">Sales</p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
                My Quotes
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
                Quotes go to Keri-Leigh for sign-off before being sent to lender clients.
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
              <Plus size={15} /> Submit Quote
            </button>
          </div>

          {!loading && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Win Rate',       value: `${winRate}%`,       color: '#A78BFA', sub: 'Quotes → Accepted'  },
                { label: 'Active Now',     value: String(active),       color: '#60A5FA', sub: 'In pipeline'        },
                { label: 'Pipeline Value', value: fmtR(pipelineValue), color: '#34D399', sub: 'Monthly recurring'  },
              ].map(item => (
                <div key={item.label} className="rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                  <p className="text-lg font-bold leading-tight" style={{ color: item.color, fontFamily: 'var(--font-mono)' }}>{item.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text3)' }}>{item.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: item.color, opacity: 0.6 }}>{item.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && (
        <>
          {/* ══ KPI Cards (matches dashboard row 3 style) ════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Quotes',
                value: quotes.length,
                sub:   'All time',
                color: '#A78BFA', rgb: '167,139,250',
                icon:  FileText,
                bars:  [3, 5, 4, 7, 6, 8, Math.max(quotes.length, 1)],
              },
              {
                label: 'Pending Approval',
                value: pending,
                sub:   'With Keri-Leigh',
                color: '#FBBF24', rgb: '251,191,36',
                icon:  Clock,
                bars:  [1, 2, 1, 3, 2, 3, Math.max(pending, 1)],
              },
              {
                label: 'Active Pipeline',
                value: active,
                sub:   'Sent or approved',
                color: '#60A5FA', rgb: '96,165,250',
                icon:  TrendingUp,
                bars:  [2, 3, 2, 4, 3, 5, Math.max(active, 1)],
              },
              {
                label: 'Accepted',
                value: won,
                sub:   'Deals closed',
                color: '#34D399', rgb: '52,211,153',
                icon:  CheckCircle2,
                bars:  [0, 1, 1, 2, 1, 2, Math.max(won, 1)],
              },
            ].map(item => (
              <div key={item.label}
                className="bento-card p-4 transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `rgba(${item.rgb},0.12)`, color: item.color }}>
                    <item.icon size={13} />
                  </div>
                  <ArrowUpRight size={11} style={{ color: item.color, opacity: 0.35 }} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                  {item.label}
                </p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                  <AnimCount to={item.value} />
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: item.color, opacity: 0.75 }}>{item.sub}</p>
                <SparkBars data={item.bars} color={item.color} />
              </div>
            ))}
          </div>

          {/* ══ Pipeline spotlight (matches earnings spotlight style) ══════ */}
          {pipelineValue > 0 && (
            <div className="bento-card p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.09) 0%, transparent 70%)' }} />
              <div className="grid lg:grid-cols-3 gap-6 relative">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(52,211,153,0.7)' }}>
                    Active Pipeline Value
                  </p>
                  <p className="text-4xl font-bold" style={{ color: '#34D399', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
                    R&nbsp;<AnimCount to={pipelineValue} />
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
                    Combined monthly recurring · {active} active quote{active !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Awaiting Approval', value: pending, color: '#FBBF24', rgb: '251,191,36',  sub: 'Needs sign-off', icon: Clock        },
                    { label: 'Deals Accepted',     value: won,    color: '#34D399', rgb: '52,211,153',  sub: 'Closed & won',   icon: CheckCircle2 },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col justify-between p-4 rounded-xl"
                      style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{item.label}</p>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ background: `rgba(${item.rgb},0.12)`, color: item.color }}>
                          <item.icon size={11} />
                        </div>
                      </div>
                      <p className="text-xl font-bold" style={{ color: item.color, fontFamily: 'var(--font-mono)' }}>
                        <AnimCount to={item.value} />
                      </p>
                      <p className="text-[10px] mt-1.5" style={{ color: item.color, opacity: 0.6 }}>{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ Pending approval banner ══════════════════════════════════ */}
          {pending > 0 && (
            <div className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
              style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.22)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
                <AlertCircle size={16} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {pending} quote{pending !== 1 ? 's' : ''} awaiting approval
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                  Keri-Leigh will review and approve before quotes are sent to lender clients.
                </p>
              </div>
            </div>
          )}

          {/* ══ Filter tabs ══════════════════════════════════════════════ */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending_approval', 'draft', 'sent', 'accepted', 'declined'] as const).map(f => {
              const label = f === 'all' ? 'All' : f === 'pending_approval' ? 'Pending' : f === 'draft' ? 'Approved' : f.charAt(0).toUpperCase() + f.slice(1);
              const count = f === 'all' ? quotes.length : quotes.filter(q => q.status === f).length;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={filter === f
                    ? { background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))', color: '#fff', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
                  {label}
                  {f !== 'all' && <span className="ml-1.5 opacity-60">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* ══ Table ════════════════════════════════════════════════════ */}
          <div className="bento-card overflow-hidden p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--color-text3)' }}>
                <FileText size={24} opacity={0.3} />
                <p className="text-sm">
                  {filter === 'all' ? 'No quotes yet. Hit "Submit Quote" to create one.' : `No ${filter} quotes.`}
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quote</th>
                    <th>Client</th>
                    <th>Monthly</th>
                    <th>Volume</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q, i) => {
                    const st = STATUS_STYLE[q.status] ?? STATUS_STYLE.pending_approval;
                    return (
                      <tr key={q.dbId}
                        style={{
                          animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both`,
                          animationDelay: `${i * 40}ms`,
                          background: q.status === 'pending_approval' ? 'rgba(251,191,36,0.05)' : undefined,
                        }}>
                        <td>
                          <p className="font-mono text-xs" style={{ color: 'var(--color-violet)' }}>{q.id}</p>
                        </td>
                        <td>
                          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{q.client}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{q.contact}</p>
                        </td>
                        <td>
                          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmtR(q.monthlyFee)}</span>
                          <span className="text-xs" style={{ color: 'var(--color-text3)' }}>/mo</span>
                        </td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
                            {q.quota.toLocaleString()} calls
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td className="text-xs" style={{ color: 'var(--color-text3)' }}>{q.createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Create Quote Modal ── */}
      {showForm && (
        <>
          <div className="confirm-backdrop" onClick={resetForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border2)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                maxHeight: '90vh',
                pointerEvents: 'auto',
                animation: 'slide-down 0.25s cubic-bezier(0.16,1,0.3,1) both',
              }}>

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5"
                style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <div>
                  <p className="eyebrow mb-0.5">New submission</p>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Submit Quote for Approval</h2>
                </div>
                <button onClick={resetForm} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-fill-subtle)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                {/* Client info */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                    Client Information
                  </p>
                  <input
                    value={client} onChange={e => setClient(e.target.value)}
                    placeholder="Company / institution name *"
                    className="field-input w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={contact} onChange={e => setContact(e.target.value)}
                      placeholder="Contact person *" className="field-input" />
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Email address *" className="field-input" type="email" />
                  </div>
                </div>

                {/* Volume presets */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                    Monthly API Checks Volume
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {VOLUME_PRESETS.map(p => (
                      <button key={p.value} onClick={() => setQuota(p.value)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={quota === p.value
                          ? { background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.35)' }
                          : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Branches */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                    Number of Branches
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setBranches(b => Math.max(1, b - 1))}
                      className="w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center transition-colors"
                      style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      −
                    </button>
                    <span className="text-xl font-bold w-8 text-center" style={{ color: 'var(--color-text)' }}>{branches}</span>
                    <button
                      onClick={() => setBranches(b => b + 1)}
                      className="w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center transition-colors"
                      style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      +
                    </button>
                  </div>
                </div>

                {/* Pack presets */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                    Package
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PACKS.map(pack => {
                      const isActive = activePack?.id === pack.id;
                      return (
                        <button
                          key={pack.id}
                          onClick={() => { setChecks([...pack.checks]); setQuota(pack.volume); setOverrideFee(pack.monthlyFee); }}
                          className="text-left px-3 py-3 rounded-xl transition-all"
                          style={isActive ? {
                            background: `rgba(${pack.rgb},0.1)`,
                            border: `1px solid rgba(${pack.rgb},0.4)`,
                          } : {
                            background: 'var(--color-surface2)',
                            border: '1px solid var(--color-border2)',
                          }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold"
                              style={{ color: isActive ? pack.color : 'var(--color-text)' }}>
                              {pack.label}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                style={{ background: `rgba(${pack.rgb},0.18)`, color: pack.color }}>
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] leading-snug" style={{ color: 'var(--color-text3)' }}>
                            {pack.desc}
                          </p>
                          <p className="text-xs font-bold mt-1.5 font-mono"
                            style={{ color: isActive ? pack.color : 'var(--color-text2)' }}>
                            {fmtR(pack.monthlyFee)}/mo
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--color-text3)', opacity: 0.65 }}>
                            platform licence · checks PAYG
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--color-text3)', opacity: 0.6 }}>
                    Or customise individual services below.
                  </p>
                </div>

                {/* Checks */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                    Services Required
                  </p>
                  <div className="space-y-1.5">
                    {CHECK_CATALOG.map(c => {
                      const isChecked = checks.includes(c.id as CheckId);
                      return (
                        <label key={c.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                          style={{
                            border: `1px solid ${isChecked ? 'rgba(124,58,237,0.3)' : 'var(--color-border2)'}`,
                            background: isChecked ? 'rgba(124,58,237,0.06)' : 'transparent',
                          }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => { setOverrideFee(null); setChecks(prev => e.target.checked ? [...prev, c.id as CheckId] : prev.filter(x => x !== c.id)); }}
                            style={{ accentColor: 'var(--color-violet)', width: 14, height: 14 }} />
                          <span className="text-sm flex-1" style={{ color: 'var(--color-text2)' }}>{c.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Price preview */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-violet)' }}>
                    Estimated Pricing
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm" style={{ color: 'var(--color-text2)' }}>Implementation fee (once-off)</span>
                      <span className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmtR(setupFee)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm" style={{ color: 'var(--color-text2)' }}>Monthly platform licence</span>
                      <span className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>
                        {fmtR(monthlyFee)}<span className="text-xs font-normal" style={{ color: 'var(--color-text3)' }}>/mo</span>
                      </span>
                    </div>
                    {activePack && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm" style={{ color: 'var(--color-text3)' }}>API checks</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
                          Pay-as-you-use
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--color-text3)' }}>
                    {activePack
                      ? `${activePack.label} pack. API checks billed per use on top. Admin can adjust before sending.`
                      : 'Admin can adjust pricing before sending to the lender client.'}
                  </p>
                </div>

              </div>

              {/* Footer actions */}
              <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-border2)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={resetForm}
                    className="py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    Cancel
                  </button>
                  <button onClick={submitQuote} disabled={saving}
                    className="btn-purple btn-shine inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    <Send size={14} />
                    {saving ? 'Submitting…' : 'Submit for Approval'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
