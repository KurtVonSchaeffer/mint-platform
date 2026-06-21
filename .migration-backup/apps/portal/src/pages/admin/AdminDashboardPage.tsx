import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { StatCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useApplications, statusLabel, statusBadgeClass,
} from '@/lib/applicationStore';
import {
  Users, Banknote, AlertTriangle, TrendingUp, ArrowRight, Clock, Inbox,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const { profile } = useAuth();
  const applications = useApplications();
  const hasSacrra = useFeature('sacrra_bureau');
  const navigate = useNavigate();

  const newApplications      = applications.filter((a) => a.status === 'submitted');
  const inReview             = applications.filter((a) => ['under_review', 'awaiting_documents'].includes(a.status));
  const approved             = applications.filter((a) => a.status === 'approved');
  const declinedThisMonth    = applications.filter((a) => a.status === 'declined').length;

  const activeBook = approved.reduce((s, a) => s + a.amount, 0);
  const pendingCount = newApplications.length + inReview.length;
  const decidedCount = approved.length + declinedThisMonth;
  const approvalRate = decidedCount === 0 ? 0 : Math.round((approved.length / decidedCount) * 100);

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Dashboard</h1>
          <p className="text-[var(--color-ink-soft)] text-sm mt-1 capitalize">
            {profile?.role?.replace('_', ' ') ?? 'Staff'} view · {formatDate(new Date())}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/applications')} size="md">
          View applications <ArrowRight size={15} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Borrowers"
          value="284"
          icon={<Users size={18} />}
          trend={{ value: '12%', up: true }}
        />
        <StatCard
          label="Active loan book"
          value={formatCurrency(activeBook)}
          icon={<Banknote size={18} />}
          sub={`${approved.length} active facilit${approved.length === 1 ? 'y' : 'ies'}`}
          accent="success"
        />
        <StatCard
          label="Pending applications"
          value={String(pendingCount)}
          icon={<Clock size={18} />}
          sub={newApplications.length > 0 ? `${newApplications.length} new` : 'Queue clear'}
          accent="warning"
        />
        <StatCard
          label="Approval rate"
          value={`${approvalRate}%`}
          icon={<TrendingUp size={18} />}
          sub={decidedCount === 0 ? 'No decisions yet' : `Of ${decidedCount} decided`}
          accent="info"
        />
      </div>

      {/* SACRRA compliance alert */}
      {hasSacrra ? (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">SACRRA submission due</p>
                <p className="text-xs text-amber-700 mt-0.5">Monthly bureau file due 31 May 2026 — 268 records queued</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/compliance')}>
              View SACRRA
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Recent applications — live */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Recent applications</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/applications')}>
            View all <ArrowRight size={14} />
          </Button>
        </div>
        {applications.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--color-surface-3)] flex items-center justify-center">
              <Inbox size={18} className="text-[var(--color-ink-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-ink-2)] mb-1">No applications yet</p>
            <p className="text-xs text-[var(--color-ink-soft)]">When borrowers submit, they'll appear here.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-2)]/50">
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map((app, i) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/applications')}
                    style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{app.applicantName}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] font-mono">{app.id}</p>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-ink-soft)] text-xs">{app.purpose}</td>
                    <td className="px-6 py-4 text-right font-bold text-[var(--color-ink)]">{formatCurrency(app.amount)}</td>
                    <td className="px-6 py-4 text-[var(--color-ink-soft)] text-xs">{formatDate(app.submittedAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass[app.status]}`}>
                        {statusLabel[app.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm">Review</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[var(--color-brand)]" />
            <h3 className="font-semibold text-[var(--color-ink)]">Disbursements (last 6 months)</h3>
          </div>
          <div className="h-40 flex items-end gap-3">
            {[820000, 1050000, 960000, 1320000, 1180000, 1450000].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-[var(--color-brand)] opacity-80 transition-all hover:opacity-100"
                  style={{ height: `${(v / 1500000) * 100}%` }}
                  title={formatCurrency(v)}
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">{['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-[var(--color-ink)] mb-4">Approval rate</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-5xl font-bold text-[var(--color-brand)] tracking-tight">{approvalRate}%</p>
              <p className="text-sm text-[var(--color-ink-muted)] mt-1">{decidedCount} decided</p>
              <p className="text-xs text-emerald-600 mt-1">↑ 3% vs prior month</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
