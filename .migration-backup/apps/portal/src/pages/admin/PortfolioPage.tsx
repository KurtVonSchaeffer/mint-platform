import { useState } from 'react';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useApplications } from '@/lib/applicationStore';
import { Banknote, TrendingDown, AlertCircle, CheckCircle2, Search, Download, Eye } from 'lucide-react';

const REPAYMENT_PROGRESS = 0.38;
const WRITE_OFFS_YTD = 42_000;

export function PortfolioPage() {
  const applications = useApplications();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'arrears' | 'closed'>('all');
  const [toast, setToast] = useState<string | null>(null);

  // Synthesise loan-book rows from approved applications.
  const loans = applications
    .filter((a) => a.status === 'approved')
    .map((a) => {
      const balance = Math.round(a.amount * (1 - REPAYMENT_PROGRESS));
      // Deterministic "arrears" simulation — every 5th approved loan ages 8 days
      const isArrears = a.id.endsWith('1') || a.id.endsWith('6');
      return {
        id:           a.id.replace('APP', 'LN'),
        applicantId:  a.id,
        client:       a.applicantName,
        company:      a.company,
        amount:       a.amount,
        balance,
        nextDue:      '2026-06-01',
        status:       balance === 0 ? 'closed' : isArrears ? 'arrears' : 'active',
        daysOverdue:  isArrears ? 8 : 0,
        purpose:      a.purpose,
      };
    });

  const filtered = loans.filter((l) => {
    const matchSearch =
      !search ||
      l.client.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    return l.status === filter;
  });

  const totalBook    = loans.reduce((s, l) => s + l.balance, 0);
  const activeCount  = loans.filter((l) => l.status === 'active').length;
  const arrearsCount = loans.filter((l) => l.status === 'arrears').length;

  function exportCSV() {
    const lines = [
      ['LoanID', 'Borrower', 'Company', 'Original', 'Balance', 'NextDue', 'DaysOverdue', 'Status'].join(','),
      ...loans.map((l) => [l.id, `"${l.client}"`, `"${l.company}"`, l.amount, l.balance, l.nextDue, l.daysOverdue, l.status].join(',')),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `algolend-loan-book-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${loans.length} loans.`);
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6 page-enter">
      {toast ? (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-lg" style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {toast}
        </div>
      ) : null}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Loan Book</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">All active facilities and their repayment state.</p>
        </div>
        <Button size="md" variant="outline" onClick={exportCSV}>
          <Download size={14} /> Export book
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total book" value={formatCurrency(totalBook)} icon={<Banknote size={18} />} sub={`${loans.length} facilities`} accent="brand" />
        <StatCard label="Active" value={String(activeCount)} icon={<CheckCircle2 size={18} />} sub="Performing" accent="success" />
        <StatCard label="In arrears" value={String(arrearsCount)} icon={<AlertCircle size={18} />} sub={arrearsCount === 0 ? 'Clean book' : 'Action required'} accent="warning" />
        <StatCard label="Write-offs YTD" value={formatCurrency(WRITE_OFFS_YTD)} icon={<TrendingDown size={18} />} sub="Closed loss accounts" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by borrower or loan ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'active', 'arrears', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-3)] text-[var(--color-ink-soft)] hover:bg-slate-200'
              }`}
            >
              {f}
              {f !== 'all' ? <span className="ml-1.5 opacity-60">{loans.filter((l) => l.status === f).length}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Loan book */}
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-2)]/50">
              {['Loan ID', 'Borrower', 'Purpose', 'Original', 'Balance', 'Next due', 'Days overdue', 'Status', ''].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-[var(--color-ink-soft)]">
                {loans.length === 0
                  ? 'No approved loans yet. Approve an application to add it to the book.'
                  : 'No loans match the current filters.'}
              </td></tr>
            ) : filtered.map((loan, i) => (
              <tr
                key={loan.id}
                className="border-b border-slate-50 last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
                style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
              >
                <td className="px-6 py-4 font-mono text-xs text-[var(--color-ink-soft)]">{loan.id}</td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-[var(--color-ink)]">{loan.client}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{loan.company}</p>
                </td>
                <td className="px-6 py-4 text-xs text-[var(--color-ink-soft)]">{loan.purpose}</td>
                <td className="px-6 py-4 text-[var(--color-ink-2)]">{formatCurrency(loan.amount)}</td>
                <td className="px-6 py-4 font-bold text-[var(--color-ink)]">{formatCurrency(loan.balance)}</td>
                <td className="px-6 py-4 text-[var(--color-ink-soft)] text-xs">{loan.nextDue ? formatDate(loan.nextDue) : '—'}</td>
                <td className="px-6 py-4">
                  <span className={loan.daysOverdue > 0 ? 'text-red-600 font-bold text-sm' : 'text-[var(--color-ink-muted)] text-sm'}>
                    {loan.daysOverdue > 0 ? `${loan.daysOverdue}d` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={loan.status === 'arrears' ? 'danger' : loan.status === 'active' ? 'success' : 'muted'} className="capitalize">
                    {loan.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Button variant="ghost" size="sm"><Eye size={13} /> View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
