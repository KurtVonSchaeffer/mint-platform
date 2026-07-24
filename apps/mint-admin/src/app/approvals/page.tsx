'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, CheckCircle2, XCircle, Loader2,
  Building2, DollarSign, User, RefreshCw, AlertCircle, FileText,
} from 'lucide-react';

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

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [acting,    setActing]    = useState<string | null>(null);
  const [rejectId,  setRejectId]  = useState<string | null>(null);
  const [note,      setNote]      = useState('');

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
    await fetch('/api/admin/approvals', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, action, note: rejNote }),
    });
    setActing(null); setRejectId(null); setNote('');
    load();
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Workflow</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
            Proposal Approvals
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            High-value proposals (R50k+) pending your sign-off
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {error && (
        <div className="bento-card p-6 flex items-center gap-2">
          <AlertCircle size={16} style={{ color: '#F87171' }} />
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {!loading && !error && approvals.length === 0 && (
        <div className="bento-card p-16 text-center">
          <ClipboardCheck size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No pending approvals</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
            Proposals over R50,000 will appear here for sign-off.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {approvals.map(a => (
          <div key={a.id} className="bento-card p-0 overflow-hidden">
            {/* Header strip */}
            <div className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--color-border2)', background: 'rgba(3,105,161,0.04)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(3,105,161,0.1)', color: '#0369a1' }}>
                <FileText size={13} />
              </div>
              <p className="font-semibold text-sm flex-1" style={{ color: 'var(--color-text)' }}>{a.title}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                Pending approval
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x"
              style={{ borderBottom: '1px solid var(--color-border2)', borderColor: 'var(--color-border2)' }}>
              {[
                { icon: Building2,   label: 'Company',  value: a.leads?.company ?? '—' },
                { icon: User,        label: 'Lead',     value: a.leads?.name    ?? '—' },
                { icon: User,        label: 'Agent',    value: a.agentName              },
                { icon: DollarSign,  label: 'Amount',   value: a.amount_cents ? R(a.amount_cents) : '—', highlight: true },
              ].map(({ icon: Icon, label, value, highlight }) => (
                <div key={label} className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={11} style={{ color: 'var(--color-text3)' }} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text3)' }}>{label}</span>
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: highlight ? '#0369a1' : 'var(--color-text)' }}>{value}</p>
                </div>
              ))}
            </div>

            {a.notes && (
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <p className="text-xs italic" style={{ color: 'var(--color-text3)' }}>"{a.notes}"</p>
              </div>
            )}

            {/* Reject note input */}
            {rejectId === a.id && (
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border2)', background: 'rgba(220,38,38,0.03)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text2)' }}>Reason for rejection (optional)</p>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Pricing too low, needs manager review..."
                  className="field-input w-full text-sm resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>Submitted {fmtDate(a.created_at)} by {a.agentName}</p>
              <div className="flex items-center gap-2">
                {rejectId === a.id ? (
                  <>
                    <button onClick={() => { setRejectId(null); setNote(''); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
                      Cancel
                    </button>
                    <button onClick={() => act(a.id, 'reject', note || undefined)}
                      disabled={acting === a.id}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity"
                      style={{ background: '#dc2626', opacity: acting === a.id ? 0.6 : 1 }}>
                      {acting === a.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                      Confirm rejection
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setRejectId(a.id); setNote(''); }}
                      disabled={!!acting}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity"
                      style={{ border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626', opacity: acting ? 0.5 : 1 }}>
                      <XCircle size={11} /> Reject
                    </button>
                    <button onClick={() => act(a.id, 'approve')}
                      disabled={!!acting}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity"
                      style={{ background: '#059669', opacity: acting ? 0.5 : 1 }}>
                      {acting === a.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
