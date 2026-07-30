'use client';

import { useState, useEffect, useMemo } from 'react';
import { CHECK_CATALOG, computeMonthlyFee, fmtR, type CheckId } from '@/lib/quote-pricing';
import { Clock, FileText, Plus, Send, X } from 'lucide-react';

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
  pending_approval: { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: '#FBBF24',               label: 'Awaiting Approval'     },
  draft:            { bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)',   color: '#60A5FA',               label: 'Approved — Ready to Send' },
  sent:             { bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)',  color: '#A78BFA',               label: 'Sent to Client'        },
  viewed:           { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',  color: '#FBBF24',               label: 'Viewed by Client'      },
  accepted:         { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',  color: '#34D399',               label: 'Accepted'              },
  declined:         { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)', color: '#F87171',               label: 'Not Approved / Declined' },
  expired:          { bg: 'rgba(75,80,128,0.1)',    border: 'rgba(75,80,128,0.2)',    color: 'var(--color-text3)',    label: 'Expired'               },
};

const VOLUME_PRESETS = [
  { label: '100/mo',    value: 100   },
  { label: '500/mo',    value: 500   },
  { label: '1,000/mo',  value: 1000  },
  { label: '2,500/mo',  value: 2500  },
  { label: '5,000/mo',  value: 5000  },
  { label: '10,000/mo', value: 10000 },
];

export default function TelemarketerQuotesPage() {
  const [quotes,   setQuotes]   = useState<TmQuote[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<'all' | QuoteStatus>('all');
  const [saving,   setSaving]   = useState(false);

  // Form state
  const [client,   setClient]   = useState('');
  const [contact,  setContact]  = useState('');
  const [email,    setEmail]    = useState('');
  const [quota,    setQuota]    = useState(500);
  const [branches, setBranches] = useState(1);
  const [checks,   setChecks]   = useState<CheckId[]>(['bureau', 'banking']);

  const monthlyFee = useMemo(() => computeMonthlyFee(checks, quota, branches), [checks, quota, branches]);
  const setupFee   = 100000;

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
    setQuota(500); setBranches(1); setChecks(['bureau', 'banking']);
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
      setToast('Quote submitted — Keri-Leigh will review and approve before it\'s sent.');
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const pending  = quotes.filter(q => q.status === 'pending_approval').length;
  const active   = quotes.filter(q => ['draft', 'sent', 'viewed'].includes(q.status)).length;
  const won      = quotes.filter(q => q.status === 'accepted').length;

  return (
    <div className="space-y-6 page-enter">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl text-sm font-medium shadow-xl cursor-pointer"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', color: 'var(--color-text)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Sales</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>My Quotes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            Quotes you submit go to Keri-Leigh for sign-off before being sent to lender clients.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
          <Plus size={15} /> Submit Quote
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Approval', value: pending, color: '#FBBF24', rgb: '251,191,36' },
          { label: 'Active Pipeline',  value: active,  color: '#60A5FA', rgb: '96,165,250' },
          { label: 'Accepted',         value: won,     color: '#34D399', rgb: '52,211,153' },
        ].map(k => (
          <div key={k.label} className="bento-card p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.35 }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(${k.rgb},0.10) 0%, transparent 60%)` }} />
            <p className="eyebrow mb-1 relative">{k.label}</p>
            <p className="text-3xl font-bold relative" style={{ color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
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

      {/* Table */}
      <div className="bento-card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-40" style={{ color: 'var(--color-text3)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--color-text3)' }}>
            <FileText size={24} opacity={0.3} />
            <p className="text-sm">
              {filter === 'all' ? 'No quotes submitted yet. Hit "Submit Quote" to create one.' : `No ${filter} quotes.`}
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
                const s = STATUS_STYLE[q.status] ?? STATUS_STYLE.pending_approval;
                return (
                  <tr key={q.dbId}
                    style={{
                      animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both`,
                      animationDelay: `${i * 40}ms`,
                      borderLeft: q.status === 'pending_approval' ? '3px solid #FBBF24' : undefined,
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
                        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                        {s.label}
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

      {/* Pending info banner */}
      {pending > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
            <Clock size={13} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {pending} quote{pending !== 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
              Keri-Leigh will review and approve before the quote is sent to the lender client.
            </p>
          </div>
        </div>
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
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
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
                            onChange={e => setChecks(prev => e.target.checked ? [...prev, c.id as CheckId] : prev.filter(x => x !== c.id))}
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
                      <span className="font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmtR(monthlyFee)}<span className="text-xs font-normal" style={{ color: 'var(--color-text3)' }}>/mo</span></span>
                    </div>
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--color-text3)' }}>
                    Admin can adjust pricing before sending to the lender client.
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
