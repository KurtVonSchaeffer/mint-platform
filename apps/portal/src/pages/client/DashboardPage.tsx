import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useApplications, statusLabel, statusBadgeClass } from '@/lib/applicationStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, TrendingUp, Clock, CheckCircle, ArrowRight, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const REPAYMENT_PROGRESS = 0.38;

export function ClientDashboard() {
  const { profile } = useAuth();
  const applications = useApplications();
  const hasOpenBanking = useFeature('open_banking');
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const approved   = applications.filter((a) => a.status === 'approved');
  const inFlight   = applications.filter((a) => ['submitted', 'under_review', 'awaiting_documents'].includes(a.status));
  const totalAmount = approved.reduce((s, a) => s + a.amount, 0);
  const outstanding = totalAmount * (1 - REPAYMENT_PROGRESS);
  const nextMonthly = approved.length === 0 ? 0 : Math.round(approved.reduce((s, a) => s + (a.amount / a.termMonths) * 1.18, 0));

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Good morning, {firstName}</h1>
          <p className="text-[var(--color-ink-soft)] mt-1 text-sm">Here's an overview of your account.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/client/calculator')} variant="outline" size="md">
            <Calculator size={14} /> Calculator
          </Button>
          <Button onClick={() => navigate('/client/apply')} size="md">
            Apply for Loan <ArrowRight size={15} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active loans"
          value={String(approved.length)}
          icon={<CreditCard size={18} />}
          accent="brand"
          sub={approved.length === 0 ? 'No active facilities' : `${formatCurrency(totalAmount)} approved`}
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(outstanding)}
          icon={<TrendingUp size={18} />}
          sub={`${Math.round(REPAYMENT_PROGRESS * 100)}% repaid`}
          accent="info"
        />
        <StatCard
          label="Next payment"
          value={approved.length > 0 ? formatDate('2026-06-01') : '—'}
          icon={<Clock size={18} />}
          sub={approved.length > 0 ? formatCurrency(nextMonthly) : 'Nothing scheduled'}
          accent="warning"
        />
        <StatCard
          label="In progress"
          value={String(inFlight.length)}
          icon={<CheckCircle size={18} />}
          sub={inFlight.length === 0 ? 'No pending applications' : 'Awaiting decision'}
          accent="success"
        />
      </div>

      {/* Open Banking banner */}
      {hasOpenBanking ? (
        <Card className="p-5 border-[var(--color-brand)] bg-[var(--color-brand-muted)]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--color-brand)] text-sm">Connect your bank account</p>
              <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">Speed up your application with real-time bank verification via TruID.</p>
            </div>
            <Button variant="outline" size="sm">Connect Bank</Button>
          </div>
        </Card>
      ) : null}

      {/* Recent applications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Recent applications</h2>
          <button
            onClick={() => navigate('/client/loans')}
            className="text-xs font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
          >
            View all →
          </button>
        </div>
        {applications.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--color-surface-3)] flex items-center justify-center">
              <CreditCard size={18} className="text-[var(--color-ink-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-ink-2)] mb-1">No applications yet</p>
            <p className="text-xs text-[var(--color-ink-soft)] mb-4">Apply for your first loan to get started.</p>
            <Button onClick={() => navigate('/client/apply')} size="sm">
              Apply now <ArrowRight size={13} />
            </Button>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {applications.slice(0, 4).map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate('/client/loans')}
                  className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-[var(--color-surface-2)]/60 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      a.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                      a.status === 'declined' ? 'bg-red-50 text-red-600' :
                                                'bg-[var(--color-brand-muted)] text-[var(--color-brand)]'
                    }`}>
                      <CreditCard size={17} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-xs font-bold text-[var(--color-ink-2)]">{a.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusBadgeClass[a.status]}`}>
                          {statusLabel[a.status]}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-muted)]">{a.purpose} · {a.termMonths} months</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--color-ink)]">{formatCurrency(a.amount)}</p>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">{formatDate(a.submittedAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
