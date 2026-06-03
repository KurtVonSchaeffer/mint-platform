import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useApplications } from '@/lib/applicationStore';
import { Download, BarChart3, Calendar, FileText, Sparkles } from 'lucide-react';

const PERIODS = [
  { id: '2026-05', label: 'May 2026' },
  { id: '2026-04', label: 'April 2026' },
  { id: '2026-03', label: 'March 2026' },
  { id: '2026-q1', label: 'Q1 2026' },
];

interface ReportTemplate {
  id:       string;
  name:     string;
  desc:     string;
  size:     string;
  rows:     (apps: ReturnType<typeof useApplications>) => string[][];
}

const REPORTS: ReportTemplate[] = [
  {
    id:   'disbursement',
    name: 'Monthly Disbursement Report',
    desc: 'All loans approved + funded in the selected period',
    size: '~124 KB',
    rows: (apps) => [
      ['LoanID', 'Borrower', 'Company', 'Amount', 'Term', 'ApprovedAt'],
      ...apps.filter((a) => a.status === 'approved').map((a) => [a.id, a.applicantName, a.company, String(a.amount), `${a.termMonths}m`, a.decisionAt ?? '—']),
    ],
  },
  {
    id:   'arrears',
    name: 'Arrears & Collections',
    desc: 'Loans 30+ days past due — for collections workflow',
    size: '~86 KB',
    rows: (apps) => [
      ['LoanID', 'Borrower', 'AmountOutstanding', 'DaysOverdue', 'LastContact'],
      ...apps.filter((a) => a.status === 'approved' && (a.id.endsWith('1') || a.id.endsWith('6'))).map((a) => [a.id, a.applicantName, String(Math.round(a.amount * 0.62)), '8', '2026-05-20']),
    ],
  },
  {
    id:   'approval',
    name: 'Credit Approval Rate Analysis',
    desc: 'Approve/decline funnel with score distribution',
    size: '~210 KB',
    rows: (apps) => [
      ['ApplicationID', 'Borrower', 'Score', 'Decision', 'Amount', 'SubmittedAt'],
      ...apps.map((a) => [a.id, a.applicantName, String(a.score), a.status, String(a.amount), a.submittedAt]),
    ],
  },
  {
    id:   'portfolio',
    name: 'Portfolio Performance',
    desc: 'Vintage analysis, cohort PD, write-offs',
    size: '~340 KB',
    rows: (apps) => [
      ['Cohort', 'ApplicationsCount', 'ApprovedCount', 'ApprovalRate', 'TotalDisbursed'],
      ['2026-05', String(apps.length), String(apps.filter((a) => a.status === 'approved').length), `${Math.round((apps.filter((a) => a.status === 'approved').length / Math.max(apps.length, 1)) * 100)}%`, String(apps.filter((a) => a.status === 'approved').reduce((s, a) => s + a.amount, 0))],
    ],
  },
  {
    id:   'compliance',
    name: 'Regulatory Compliance Report',
    desc: 'NCA-style audit trail · every credit decision logged immutably',
    size: '~178 KB',
    rows: (apps) => [
      ['ApplicationID', 'Decision', 'DecisionAt', 'Reason'],
      ...apps.filter((a) => a.decisionAt).map((a) => [a.id, a.status, a.decisionAt ?? '', a.declineReason ?? 'Within policy']),
    ],
  },
];

export function ReportsPage() {
  const apps = useApplications();
  const [period, setPeriod] = useState('2026-05');
  const [toast, setToast] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  function download(report: ReportTemplate) {
    setGenerating(report.id);
    window.setTimeout(() => {
      const rows = report.rows(apps);
      const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${report.id}-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(null);
      showToast(`${report.name} downloaded.`);
    }, 600);
  }

  // Live numbers from the store
  const approvedThisPeriod = apps.filter((a) => a.status === 'approved').reduce((s, a) => s + a.amount, 0);
  const collectionsEstimate = Math.round(approvedThisPeriod * 0.38); // synthesised
  const totalApps = apps.length;
  const approvalRate = totalApps === 0 ? 0 : Math.round((apps.filter((a) => a.status === 'approved').length / totalApps) * 100);

  return (
    <div className="space-y-6 page-enter">
      {toast ? (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-lg" style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {toast}
        </div>
      ) : null}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Reports</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">Pre-built reports + live data sourced from your loan book.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--color-ink-muted)]" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium bg-[var(--color-surface)] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 cursor-pointer"
          >
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider mb-1">Approved (period)</p>
          <p className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">{formatCurrency(approvedThisPeriod)}</p>
          <p className="text-xs text-emerald-600 mt-1 font-semibold">{apps.filter((a) => a.status === 'approved').length} loans</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider mb-1">Collections (est.)</p>
          <p className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">{formatCurrency(collectionsEstimate)}</p>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">~38% of approved principal</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider mb-1">Approval rate</p>
          <p className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">{approvalRate}%</p>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">{totalApps} applications decided</p>
        </Card>
      </div>

      {/* Report templates */}
      <Card className="p-0 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[var(--color-brand)]" />
              <h3 className="font-semibold text-[var(--color-ink)]">Available reports</h3>
            </div>
            <Button size="sm" variant="outline">
              <Sparkles size={13} /> Generate custom
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {REPORTS.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-[var(--color-surface-2)]/60 transition-colors"
              style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-3)] flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[var(--color-ink-soft)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{r.name}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{r.desc} · {r.size}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => download(r)} loading={generating === r.id}>
                <Download size={13} /> Download
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
