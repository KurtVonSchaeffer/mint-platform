import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useFeature } from '@/hooks/useFeature';
import {
  ShieldCheck, FileText, AlertTriangle, Download, Check, X, RefreshCw,
} from 'lucide-react';

interface KycCheck {
  id:     string;
  label:  string;
  client: string;
  status: 'passed' | 'flagged' | 'pending';
  date:   string;
  notes?: string;
}

const INITIAL_CHECKS: KycCheck[] = [
  { id: 'k1', label: 'Identity Verification (Director)', client: 'Nkosi Holdings',     status: 'passed',  date: '2026-05-22' },
  { id: 'k2', label: 'AML Screening',                     client: 'Nkosi Holdings',     status: 'passed',  date: '2026-05-22' },
  { id: 'k3', label: 'PEP & Sanctions Check',             client: 'Dlamini Logistics',  status: 'flagged', date: '2026-05-22', notes: 'Match against partial PEP list — requires manual review.' },
  { id: 'k4', label: 'CIPC Verification',                 client: 'Mahlangu Tech',      status: 'passed',  date: '2026-05-21' },
  { id: 'k5', label: 'Biometric liveness',                client: 'Velocity Trading',   status: 'pending', date: '2026-05-23' },
];

export function CompliancePage() {
  const hasSacrra = useFeature('sacrra_bureau');
  const [checks, setChecks] = useState<KycCheck[]>(INITIAL_CHECKS);
  const [toast, setToast] = useState<string | null>(null);
  const [sacrraGenerating, setSacrraGenerating] = useState(false);
  const [sacrraGenerated, setSacrraGenerated] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  function clearFlag(id: string) {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'passed', notes: undefined } : c)));
    showToast('Flag cleared — false positive recorded against the PEP list.');
  }

  function escalate(id: string) {
    const check = checks.find((c) => c.id === id);
    showToast(`${check?.label ?? 'Check'} escalated to compliance officer.`);
  }

  function rerun(id: string) {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'pending', date: new Date().toISOString().slice(0, 10) } : c)));
    showToast('Re-running check — typically takes 30–60s.');
    window.setTimeout(() => {
      setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'passed' } : c)));
      showToast('Check passed on re-run.');
    }, 2000);
  }

  function generateSacrra() {
    setSacrraGenerating(true);
    showToast('Generating SACRRA layout 700 file…');
    window.setTimeout(() => {
      setSacrraGenerating(false);
      setSacrraGenerated(true);
      // Trigger a download
      const csv = 'SACRRA_LAYOUT_700,MOCK,2026-05-31,268_records\n';
      const blob = new Blob([csv], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `SACRRA-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('SACRRA file downloaded · ready for SFTP upload.');
    }, 1500);
  }

  const passedCount  = checks.filter((c) => c.status === 'passed').length;
  const flaggedCount = checks.filter((c) => c.status === 'flagged').length;
  const pendingCount = checks.filter((c) => c.status === 'pending').length;

  return (
    <div className="space-y-6 page-enter">
      {toast ? (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-lg" style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {toast}
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance</h1>
        <p className="text-sm text-slate-500 mt-1">KYC, AML, sanctions, and bureau reporting.</p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Passed (today)</p>
          <p className="text-2xl font-bold text-emerald-600 tracking-tight">{passedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Flagged</p>
          <p className="text-2xl font-bold text-red-600 tracking-tight">{flaggedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600 tracking-tight">{pendingCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC Checks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--color-brand)]" />
              <h3 className="font-semibold text-slate-900">Recent KYC / AML Checks</h3>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {checks.map((c, i) => (
              <div
                key={c.id}
                className="px-6 py-4 border-b border-slate-50 last:border-0"
                style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                    <p className="text-xs text-slate-400">{c.client} · {c.date}</p>
                  </div>
                  <Badge variant={c.status === 'passed' ? 'success' : c.status === 'flagged' ? 'danger' : 'warning'} className="capitalize">{c.status}</Badge>
                </div>
                {c.status === 'flagged' && c.notes ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3 text-xs text-red-700">
                    <strong>Note:</strong> {c.notes}
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => clearFlag(c.id)}><Check size={12} /> Clear (false positive)</Button>
                      <Button size="sm" variant="ghost" onClick={() => escalate(c.id)}><X size={12} /> Escalate</Button>
                    </div>
                  </div>
                ) : null}
                {c.status === 'pending' ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-amber-600 font-semibold">Awaiting provider response · usually ~60s</span>
                    <button onClick={() => rerun(c.id)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
                      <RefreshCw size={11} /> Re-run
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>

        {/* SACRRA */}
        {hasSacrra ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[var(--color-brand)]" />
                <h3 className="font-semibold text-slate-900">SACRRA Bureau Reporting</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Monthly submission due 31 May 2026</p>
                  <p className="text-xs text-amber-700 mt-0.5">268 records queued for export · layout 700 format</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600"><span>Last submission</span><span className="font-medium">30 Apr 2026</span></div>
                <div className="flex justify-between text-slate-600"><span>Bureau acceptance</span><span className="font-medium text-emerald-600">98.2%</span></div>
                <div className="flex justify-between text-slate-600"><span>Records this month</span><span className="font-medium">268</span></div>
                <div className="flex justify-between text-slate-600"><span>Last generated</span><span className="font-medium">{sacrraGenerated ? 'just now' : '—'}</span></div>
              </div>
              <Button size="sm" onClick={generateSacrra} loading={sacrraGenerating}>
                <Download size={14} /> {sacrraGenerated ? 'Re-generate' : 'Generate SACRRA file'}
              </Button>
              {sacrraGenerated ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 flex items-center gap-2">
                  <Check size={13} /> File ready · upload via SFTP within 7 days.
                </div>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
