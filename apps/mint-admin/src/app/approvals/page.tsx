'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Loader2, Building2, User2,
  RefreshCw, AlertCircle, ArrowLeft, ChevronRight,
  TrendingUp, Clock, MessageSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Approval {
  id:              string;
  title:           string;
  amount_cents:    number | null;
  notes:           string | null;
  created_at:      string;
  approval_status: string;
  approval_note:   string | null;
  agent_id:        string;
  agentName:       string;
  agentEmail:      string;
  leads:           { name: string; company: string } | null;
}

const R = (cents: number) =>
  `R ${Math.round(cents / 100).toLocaleString('en-ZA')}`;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Initials({ name }: { name: string }) {
  const letters = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 0 0 2px rgba(124,58,237,0.25)' }}
    >
      {letters}
    </div>
  );
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [acting,    setActing]    = useState<string | null>(null);
  const [rejectId,  setRejectId]  = useState<string | null>(null);
  const [note,      setNote]      = useState('');
  const [done,      setDone]      = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await fetch('/api/admin/approvals');
    if (res.ok) setApprovals((await res.json()).approvals ?? []);
    else setError('Failed to load approvals');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'approve' | 'reject', rejNote?: string) {
    setActing(id);
    const res = await fetch('/api/admin/approvals', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, action, note: rejNote }),
    });
    setActing(null); setRejectId(null); setNote('');
    if (res.ok) {
      setDone(prev => new Set(prev).add(id));
      setTimeout(() => {
        setApprovals(a => a.filter(x => x.id !== id));
        setDone(prev => { const s = new Set(prev); s.delete(id); return s; });
      }, 900);
    }
  }

  const visible = approvals.filter(a => !done.has(a.id) || done.has(a.id));

  return (
    <div className="space-y-8 page-enter max-w-3xl">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
          style={{
            border: '1px solid var(--color-border2)',
            color: 'var(--color-text3)',
            background: 'var(--color-surface)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)';
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="eyebrow">Workflow</p>
            <ChevronRight size={11} style={{ color: 'var(--color-text3)', opacity: 0.4 }} />
            <p className="eyebrow" style={{ color: 'var(--color-violet)', opacity: 1 }}>Sign-off queue</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
            Proposal Approvals
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            High-value proposals (R50k+) waiting for your sign-off
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          {!loading && approvals.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#d97706', border: '1px solid rgba(251,191,36,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#d97706', animation: 'radar-ring 2s ease-out infinite' }} />
              {approvals.length} pending
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)', background: 'var(--color-surface)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading approvals…</p>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="bento-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
          <AlertCircle size={15} style={{ color: '#F87171', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!loading && !error && approvals.length === 0 && (
        <div className="bento-card flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <CheckCircle2 size={24} style={{ color: '#34D399' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>All caught up</p>
          <p className="text-sm max-w-xs" style={{ color: 'var(--color-text3)' }}>
            No proposals waiting for approval. New high-value submissions will appear here automatically.
          </p>
        </div>
      )}

      {/* ── Cards ───────────────────────────────────────────── */}
      <div className="space-y-4">
        {visible.map((a, idx) => {
          const isDone    = done.has(a.id);
          const isActing  = acting === a.id;
          const isRejecting = rejectId === a.id;

          return (
            <div
              key={a.id}
              className="bento-card p-0 overflow-hidden transition-all duration-500"
              style={{
                opacity: isDone ? 0 : 1,
                transform: isDone ? 'scale(0.97) translateY(-4px)' : 'none',
                animationDelay: `${idx * 60}ms`,
              }}
            >
              {/* Gradient accent top bar */}
              <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 50%, #34D399 100%)' }} />

              {/* Card body */}
              <div className="p-5">
                {/* Top row: proposal title + amount badge */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706', border: '1px solid rgba(251,191,36,0.2)' }}>
                        Pending approval
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>
                        <Clock size={9} className="inline mr-0.5 -mt-px" />
                        {fmtTimeAgo(a.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                      {a.title}
                    </h3>
                  </div>
                  {a.amount_cents != null && (
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-black tracking-tight" style={{ color: '#f59e0b', letterSpacing: '-0.04em' }}>
                        {R(a.amount_cents)}
                      </p>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--color-text3)' }}>proposal value</p>
                    </div>
                  )}
                </div>

                {/* Info row: company + lead + agent */}
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-0"
                    style={{ background: 'var(--color-ink)', border: '1px solid var(--color-border2)' }}>
                    <Building2 size={12} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--color-text3)' }}>Company</p>
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{a.leads?.company ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-0"
                    style={{ background: 'var(--color-ink)', border: '1px solid var(--color-border2)' }}>
                    <User2 size={12} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--color-text3)' }}>Lead</p>
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{a.leads?.name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-0"
                    style={{ background: 'var(--color-ink)', border: '1px solid var(--color-border2)' }}>
                    <TrendingUp size={12} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--color-text3)' }}>Pipeline value</p>
                      <p className="text-xs font-bold truncate" style={{ color: '#059669' }}>
                        {a.amount_cents ? R(a.amount_cents) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agent row */}
                <div className="flex items-center gap-2.5 mb-4">
                  <Initials name={a.agentName} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{a.agentName}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>{a.agentEmail}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] font-medium" style={{ color: 'var(--color-text3)' }}>Submitted</p>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text2)' }}>{fmtDate(a.created_at)}</p>
                  </div>
                </div>

                {/* Notes */}
                {a.notes && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-4"
                    style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)' }}>
                    <MessageSquare size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-violet)', opacity: 0.7 }} />
                    <p className="text-xs italic leading-relaxed" style={{ color: 'var(--color-text3)' }}>"{a.notes}"</p>
                  </div>
                )}

                {/* Reject textarea */}
                {isRejecting && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#F87171' }}>
                      Reason for rejection (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={2}
                      placeholder="e.g. Pricing too low, needs further review…"
                      className="field-input w-full text-sm resize-none"
                      style={{ borderColor: 'rgba(248,113,113,0.3)' }}
                      autoFocus
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isRejecting ? (
                    <>
                      <button
                        onClick={() => { setRejectId(null); setNote(''); }}
                        className="flex-1 text-sm px-4 py-2.5 rounded-xl font-medium transition-all"
                        style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => act(a.id, 'reject', note || undefined)}
                        disabled={isActing}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold text-white transition-all"
                        style={{ background: isActing ? 'rgba(220,38,38,0.5)' : '#dc2626', boxShadow: '0 2px 12px rgba(220,38,38,0.25)' }}
                      >
                        {isActing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Confirm rejection
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setRejectId(a.id); setNote(''); }}
                        disabled={!!acting}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
                        style={{
                          border: '1px solid rgba(220,38,38,0.3)',
                          color: '#ef4444',
                          opacity: acting ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!acting) { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.5)'; } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.3)'; }}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                      <button
                        onClick={() => act(a.id, 'approve')}
                        disabled={!!acting}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold text-white transition-all"
                        style={{
                          background: isActing ? 'rgba(5,150,105,0.5)' : 'linear-gradient(135deg, #059669, #34D399)',
                          boxShadow: acting ? 'none' : '0 2px 16px rgba(52,211,153,0.25)',
                          opacity: acting && !isActing ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!acting) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(52,211,153,0.4)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(52,211,153,0.25)'; }}
                      >
                        {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {isActing ? 'Approving…' : 'Approve proposal'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
