import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useApplications, statusLabel, statusBadgeClass } from '@/lib/applicationStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText, CreditCard, Plus, Calendar, TrendingUp, ChevronDown,
} from 'lucide-react';

// Mock repayment progress for approved facilities
const REPAYMENT_PROGRESS = 0.38;

export function LoansPage() {
  const applications = useApplications();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(applications[0]?.id ?? null);

  const approved = applications.filter((a) => a.status === 'approved');
  const inFlight = applications.filter((a) => ['submitted', 'under_review', 'awaiting_documents'].includes(a.status));
  const closed   = applications.filter((a) => a.status === 'declined');

  const totalDisbursed   = approved.reduce((s, a) => s + a.amount, 0);
  const outstandingTotal = totalDisbursed * (1 - REPAYMENT_PROGRESS);

  return (
    <div className="space-y-6 page-enter max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Loans</h1>
          <p className="text-slate-500 text-sm mt-1">All your applications and active facilities.</p>
        </div>
        <Button onClick={() => navigate('/client/apply')}>
          <Plus size={14} /> New Application
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <CreditCard size={12} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved facilities</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{approved.length}</p>
          <p className="text-xs text-slate-500 mt-1">{formatCurrency(totalDisbursed)} total</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-amber-600 mb-1">
            <FileText size={12} />
            <span className="text-[11px] font-bold uppercase tracking-wider">In progress</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{inFlight.length}</p>
          <p className="text-xs text-slate-500 mt-1">{inFlight.length === 0 ? 'No pending applications' : 'Awaiting decision'}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-[var(--color-brand)] mb-1">
            <TrendingUp size={12} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(outstandingTotal)}</p>
          <p className="text-xs text-slate-500 mt-1">Across all active loans</p>
        </Card>
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FileText size={18} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">No applications yet</p>
          <p className="text-xs text-slate-500 mb-5">Submit your first application to get started.</p>
          <Button onClick={() => navigate('/client/apply')}>
            <Plus size={14} /> Apply for a loan
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((a, i) => {
            const isExpanded = expanded === a.id;
            const monthlyInstallment = a.amount > 0 ? Math.round((a.amount / a.termMonths) * 1.18) : 0;
            return (
              <Card
                key={a.id}
                className="overflow-hidden p-0"
                style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 60}ms` }}
              >
                <button
                  className="w-full text-left p-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      a.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                      a.status === 'declined' ? 'bg-red-50 text-red-600' :
                                                'bg-[var(--color-brand-muted)] text-[var(--color-brand)]'
                    }`}>
                      <FileText size={17} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-mono text-sm font-bold text-slate-900">{a.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass[a.status]}`}>
                          {statusLabel[a.status]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{a.purpose} · {a.termMonths} months · Submitted {formatDate(a.submittedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="font-bold text-slate-900 tracking-tight">{formatCurrency(a.amount)}</p>
                      <p className="text-[11px] text-slate-400">{formatCurrency(monthlyInstallment)}/mo</p>
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded ? (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    {a.status === 'declined' && a.declineReason ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                        <strong className="font-semibold">Decline reason:</strong> {a.declineReason}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Composite score</p>
                        <p className={`text-lg font-bold tracking-tight ${a.score >= 70 ? 'text-emerald-600' : a.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {a.score} / 100
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Company</p>
                        <p className="text-sm font-semibold text-slate-900">{a.company}</p>
                      </div>
                    </div>

                    {a.status === 'approved' ? (
                      <div className="bg-white rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">Repayment progress</span>
                          <span className="text-xs text-slate-500 font-mono">{Math.round(REPAYMENT_PROGRESS * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                          <div className="h-full bg-[var(--color-brand)] rounded-full transition-all duration-700" style={{ width: `${REPAYMENT_PROGRESS * 100}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-500"><Calendar size={11} /> Next: 1 Jun · {formatCurrency(monthlyInstallment)}</span>
                          <Button size="sm" variant="ghost">Pay early</Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {closed.length > 0 ? (
        <p className="text-xs text-slate-400 text-center pt-2">
          {closed.length} closed application{closed.length === 1 ? '' : 's'} in history
        </p>
      ) : null}
    </div>
  );
}
