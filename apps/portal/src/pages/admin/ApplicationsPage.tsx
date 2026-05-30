import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useApplications, applicationStore, statusLabel, statusBadgeClass,
  type ApplicationStatus,
} from '@/lib/applicationStore';
import {
  Search, Eye, X, CheckCircle, XCircle, FileText, Clock, RefreshCw,
} from 'lucide-react';

const STATUS_FILTERS: Array<{ id: 'all' | ApplicationStatus; label: string }> = [
  { id: 'all',                label: 'All' },
  { id: 'submitted',          label: 'New' },
  { id: 'under_review',       label: 'In review' },
  { id: 'awaiting_documents', label: 'Awaiting docs' },
  { id: 'approved',           label: 'Approved' },
  { id: 'declined',           label: 'Declined' },
];

export function ApplicationsPage() {
  const applications = useApplications();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  const filtered = applications.filter((a) => {
    const matchSearch =
      !search ||
      a.applicantName.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedApp = applications.find((a) => a.id === selected);

  function approve(id: string) {
    applicationStore.updateStatus(id, 'approved');
    showToast(`${id} approved · borrower notified.`);
    setSelected(null);
  }

  function decline(id: string) {
    if (!declineReason.trim()) {
      showToast('Decline reason is required.');
      return;
    }
    applicationStore.updateStatus(id, 'declined', { declineReason: declineReason.trim() });
    showToast(`${id} declined · reason recorded.`);
    setSelected(null);
    setDeclineReason('');
  }

  function moveToReview(id: string) {
    applicationStore.updateStatus(id, 'under_review');
    showToast(`${id} moved to in-review.`);
  }

  function requestDocs(id: string) {
    applicationStore.updateStatus(id, 'awaiting_documents');
    showToast(`Document request sent for ${id}.`);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Live queue — borrowers' submissions land here automatically.</p>
        </div>
        <Button size="md" variant="outline">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s.id ? 'bg-[var(--color-brand)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
              {s.id !== 'all' ? (
                <span className="ml-1.5 opacity-60">
                  {applications.filter((a) => a.status === s.id).length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['ID', 'Applicant', 'Purpose', 'Amount', 'Score', 'Submitted', 'Status', ''].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">No applications match your filters.</td></tr>
            ) : filtered.map((app, i) => (
              <tr
                key={app.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelected(app.id)}
                style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}
              >
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{app.id}</td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">{app.applicantName}</p>
                  <p className="text-xs text-slate-400">{app.company}</p>
                </td>
                <td className="px-6 py-4 text-slate-600 text-xs">{app.purpose}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(app.amount)}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold ${app.score >= 70 ? 'text-emerald-600' : app.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {app.score}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">{formatDate(app.submittedAt)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass[app.status]}`}>
                    {statusLabel[app.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(app.id); }}>
                    <Eye size={13} /> Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selectedApp ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-stretch justify-end"
          onClick={() => setSelected(null)}
          style={{ animation: 'fade-in 0.2s ease-out both' }}
        >
          <div
            className="bg-white h-full w-full max-w-lg overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className="flex items-start justify-between p-7 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Application</p>
                <h2 className="font-mono text-lg font-bold tracking-tight">{selectedApp.id}</h2>
                <p className="text-sm text-slate-700 mt-2 font-semibold">{selectedApp.applicantName}</p>
                <p className="text-xs text-slate-400">{selectedApp.company}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-7 space-y-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">Current status</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass[selectedApp.status]}`}>
                  {statusLabel[selectedApp.status]}
                </span>
                {selectedApp.decisionAt ? (
                  <p className="text-[11px] text-slate-500 mt-2">Decision: {formatDate(selectedApp.decisionAt)}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { l: 'Amount',     v: formatCurrency(selectedApp.amount) },
                  { l: 'Term',       v: `${selectedApp.termMonths} months` },
                  { l: 'Purpose',    v: selectedApp.purpose },
                  { l: 'Submitted',  v: formatDate(selectedApp.submittedAt) },
                ].map((row) => (
                  <div key={row.l} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">{row.l}</p>
                    <p className="font-semibold text-slate-900">{row.v}</p>
                  </div>
                ))}
              </div>

              <div className={`rounded-xl p-4 ${selectedApp.score >= 70 ? 'bg-emerald-50 border border-emerald-200' : selectedApp.score >= 50 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-[10px] font-mono uppercase tracking-wider opacity-70 mb-1">Composite credit score</p>
                <p className={`text-3xl font-bold tracking-tight ${selectedApp.score >= 70 ? 'text-emerald-700' : selectedApp.score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                  {selectedApp.score} <span className="text-base font-medium opacity-60">/ 100</span>
                </p>
                <p className="text-xs mt-1 opacity-80">
                  {selectedApp.score >= 70 ? 'Strong — within standard policy.' :
                   selectedApp.score >= 50 ? 'Marginal — review supporting documents.' :
                                              'Below threshold — likely decline per policy.'}
                </p>
              </div>

              {selectedApp.declineReason ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  <strong className="font-semibold">Decline reason:</strong> {selectedApp.declineReason}
                </div>
              ) : null}

              {(['under_review', 'awaiting_documents', 'submitted'] as ApplicationStatus[]).includes(selectedApp.status) ? (
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Decline reason (required to decline)</label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Insufficient cash flow per Q1 bank statements."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 resize-none transition-all"
                  />
                </div>
              ) : null}
            </div>

            <div className="p-7 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur space-y-2">
              {selectedApp.status === 'submitted' ? (
                <Button onClick={() => moveToReview(selectedApp.id)} variant="outline" className="w-full">
                  <Clock size={14} /> Move to review
                </Button>
              ) : null}
              {(['submitted', 'under_review'] as ApplicationStatus[]).includes(selectedApp.status) ? (
                <Button onClick={() => requestDocs(selectedApp.id)} variant="outline" className="w-full">
                  <FileText size={14} /> Request more documents
                </Button>
              ) : null}
              {(['submitted', 'under_review', 'awaiting_documents'] as ApplicationStatus[]).includes(selectedApp.status) ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => approve(selectedApp.id)}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => decline(selectedApp.id)}
                    className="inline-flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={14} /> Decline
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
