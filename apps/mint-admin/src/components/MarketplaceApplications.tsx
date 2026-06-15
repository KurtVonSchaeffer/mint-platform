'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface Application {
  id: string;
  status: string;
  offered_amount: number;
  offered_rate_pct: number;
  offered_term_months: number;
  monthly_installment: number;
  total_repayment: number;
  initiation_fee: number;
  accepted_at: string | null;
  quote_requests: {
    id: string;
    reference: string;
    consumer_email: string;
    consumer_name: string | null;
    credit_profile: { creditScore?: number; monthlyIncome?: number; employmentStatus?: string } | null;
    requested_amount: number;
    requested_term: number;
    created_at: string;
  } | null;
}

function fmtZar(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  accepted:        { label: 'Pending review', bg: 'rgba(251,191,36,0.08)',  color: 'var(--color-amber)', border: 'rgba(251,191,36,0.2)'  },
  lender_approved: { label: 'Approved',        bg: 'rgba(52,211,153,0.08)',  color: 'var(--color-green)', border: 'rgba(52,211,153,0.2)'  },
  lender_declined: { label: 'Declined',         bg: 'rgba(248,113,113,0.08)',color: 'var(--color-red)',   border: 'rgba(248,113,113,0.2)' },
  disbursed:       { label: 'Disbursed',         bg: 'rgba(96,165,250,0.08)', color: 'var(--color-sky)',   border: 'rgba(96,165,250,0.2)'  },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, bg: 'rgba(255,255,255,0.05)', color: 'var(--color-text3)', border: 'rgba(255,255,255,0.1)' };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

interface Props {
  clientId: string;
  onToast: (kind: 'success' | 'error' | 'info', message: string) => void;
}

export function MarketplaceApplications({ clientId, onToast }: Props) {
  const [apps, setApps]           = useState<Application[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acting, setActing]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/marketplace-applications`);
    if (res.ok) {
      const d = await res.json();
      setApps(d.applications ?? []);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function act(appId: string, action: 'approve' | 'decline') {
    setActing(appId + action);
    const res = await fetch(`/api/marketplace/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) {
      onToast('error', json.error ?? 'Action failed');
    } else {
      onToast(
        action === 'approve' ? 'success' : 'info',
        action === 'approve'
          ? 'Application approved — borrower has been notified.'
          : 'Application declined — borrower has been notified.',
      );
      load();
    }
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
      </div>
    );
  }

  const pending  = apps.filter(a => a.status === 'accepted');
  const actioned = apps.filter(a => a.status !== 'accepted');

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
          Marketplace Applications
        </p>
        {pending.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-amber)', border: '1px solid rgba(251,191,36,0.2)' }}>
            {pending.length} pending
          </span>
        )}
      </div>

      {apps.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border2)' }}>
          <Clock size={18} style={{ color: 'var(--color-text3)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>No applications yet — borrowers who pick this lender will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...pending, ...actioned].map(app => {
            const req   = app.quote_requests;
            const score = req?.credit_profile?.creditScore;
            const isExp = expandedId === app.id;
            const isPending = app.status === 'accepted';

            return (
              <div key={app.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isPending ? 'rgba(251,191,36,0.2)' : 'var(--color-border2)'}`, background: isPending ? 'rgba(251,191,36,0.02)' : 'var(--color-surface)' }}>
                {/* Row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExp ? null : app.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {req?.consumer_name || req?.consumer_email || 'Borrower'}
                      </p>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-text3)' }}>
                      {fmtZar(app.offered_amount)} · {app.offered_rate_pct}% p.a. · {app.offered_term_months}mo
                      {score ? ` · Score ${score}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{fmtZar(app.monthly_installment)}<span className="text-[10px] font-normal" style={{ color: 'var(--color-text3)' }}>/mo</span></p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{fmtDate(app.accepted_at)}</p>
                  </div>
                  {isExp ? <ChevronUp size={13} style={{ color: 'var(--color-text3)' }} className="shrink-0" /> : <ChevronDown size={13} style={{ color: 'var(--color-text3)' }} className="shrink-0" />}
                </button>

                {/* Expanded */}
                {isExp && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                    {/* Borrower details */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-3">
                      {[
                        { label: 'Reference',  value: req?.reference ?? '—' },
                        { label: 'Email',       value: req?.consumer_email ?? '—' },
                        { label: 'Requested',   value: req ? `${fmtZar(req.requested_amount)} / ${req.requested_term}mo` : '—' },
                        { label: 'Offered',     value: `${fmtZar(app.offered_amount)} / ${app.offered_term_months}mo` },
                        { label: 'Monthly',     value: fmtZar(app.monthly_installment) },
                        { label: 'Total repay', value: fmtZar(app.total_repayment) },
                        { label: 'Initiation',  value: fmtZar(app.initiation_fee) },
                        { label: 'Rate',        value: `${app.offered_rate_pct}% p.a.` },
                        ...(score ? [{ label: 'Credit score', value: String(score) }] : []),
                        ...(req?.credit_profile?.employmentStatus ? [{ label: 'Employment', value: req.credit_profile.employmentStatus }] : []),
                        ...(req?.credit_profile?.monthlyIncome ? [{ label: 'Monthly income', value: fmtZar(req.credit_profile.monthlyIncome) }] : []),
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{label}</p>
                          <p className="text-xs font-semibold font-mono" style={{ color: 'var(--color-text)' }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons — only for pending */}
                    {isPending && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => act(app.id, 'approve')}
                          disabled={!!acting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }}
                        >
                          {acting === app.id + 'approve' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Approve — add to loan book
                        </button>
                        <button
                          onClick={() => act(app.id, 'decline')}
                          disabled={!!acting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--color-red)', border: '1px solid rgba(248,113,113,0.2)' }}
                        >
                          {acting === app.id + 'decline' ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                          Decline
                        </button>
                      </div>
                    )}

                    {!isPending && (
                      <p className="text-[11px] pt-1" style={{ color: 'var(--color-text3)' }}>
                        {app.status === 'lender_approved' ? 'Approved — borrower has been notified to expect contact.' : 'Declined — borrower has been notified.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
