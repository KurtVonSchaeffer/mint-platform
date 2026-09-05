'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import {
  ClipboardList, RefreshCw, ChevronDown, ChevronUp, Loader2,
  FileText, Download, Mail, UserPlus, X, Building2, Phone,
  Hash, Users, AlertCircle, CheckCircle2, Clock, Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type OnboardingStatus = 'complete' | 'approved' | 'rejected' | 'info_requested';

interface Director { name: string; id_number: string; email?: string }

interface Application {
  id:                string;
  name:              string;
  email:             string;
  company:           string;
  onboarding_status: OnboardingStatus;
  onboarding_data:   {
    legal_name?: string;
    phone?:      string;
    ncr_number?: string;
    directors?:  Director[];
  } | null;
  created_at:        string;
}

interface Doc {
  id:           string;
  type:         string;
  file_name:    string;
  storage_path: string;
  status:       string;
  signed_url:   string | null;
}

const STATUS_CONFIG: Record<OnboardingStatus, { label: string; bg: string; border: string; color: string; icon: React.ReactNode }> = {
  complete:       { label: 'Pending review', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: '#F59E0B', icon: <Clock size={10} /> },
  approved:       { label: 'Approved',       bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  color: '#10B981', icon: <CheckCircle2 size={10} /> },
  rejected:       { label: 'Rejected',       bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: '#EF4444', icon: <X size={10} /> },
  info_requested: { label: 'Awaiting info',  bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  color: '#60A5FA', icon: <Info size={10} /> },
};

const DOC_LABELS: Record<string, string> = {
  cipc_cert:      'CIPC registration certificate',
  director_id:    'Director ID copy',
  ncr_cert:       'NCR lending licence',
  bank_statement: '3 months bank statements',
  signed_sla:     'Signed service agreement',
};

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.complete;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function RequestInfoModal({
  app,
  onClose,
  onSent,
}: {
  app: Application;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState('');
  const [saving, setSaving]   = useState(false);

  async function send() {
    setSaving(true);
    await fetch(`/api/applications/${app.id}/request-info`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message }),
    });
    setSaving(false);
    onSent();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-lg p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Request more information</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>Sending to {app.name} · {app.email}</p>
          </div>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <textarea
          className="field-input w-full"
          rows={5}
          placeholder="Describe what additional information or documents you need from the applicant…"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={saving || !message.trim()}
            className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
            {saving ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({ doc }: { doc: Doc }) {
  const label = DOC_LABELS[doc.type] ?? doc.type;
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText size={14} style={{ color: 'var(--color-violet)', flexShrink: 0 }} />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{label}</p>
          <p className="text-[10px] truncate" style={{ color: 'var(--color-text3)' }}>{doc.file_name}</p>
        </div>
      </div>
      {doc.signed_url ? (
        <a
          href={doc.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-fill-subtle)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Download size={10} /> View
        </a>
      ) : (
        <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>unavailable</span>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  onApprove,
  onRequestInfo,
}: {
  app: Application;
  onApprove:     (app: Application) => void;
  onRequestInfo: (app: Application) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [docs, setDocs]         = useState<Doc[] | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const data = app.onboarding_data;

  async function expand() {
    setExpanded(e => !e);
    if (!docs && !loadingDocs) {
      setLoadingDocs(true);
      const res = await fetch(`/api/applications/${app.id}/documents`);
      if (res.ok) {
        const { documents } = await res.json();
        setDocs(documents ?? []);
      } else {
        setDocs([]);
      }
      setLoadingDocs(false);
    }
  }

  const isPending  = app.onboarding_status === 'complete';
  const isApproved = app.onboarding_status === 'approved';

  return (
    <article style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      {/* Summary row — click to expand */}
      <button
        onClick={expand}
        className="w-full text-left px-6 py-5 transition-colors cursor-pointer"
        style={{ background: expanded ? 'rgba(124,58,237,0.04)' : 'transparent' }}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm"
              style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}
            >
              {app.company[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{app.company}</span>
                <StatusBadge status={app.onboarding_status} />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs flex-wrap" style={{ color: 'var(--color-text3)' }}>
                <span>{app.name}</span>
                <span className="opacity-40">·</span>
                <span>{app.email}</span>
                {data?.ncr_number && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1"><Hash size={10} /> NCR {data.ncr_number}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono hidden sm:block" style={{ color: 'var(--color-text3)' }}>
              {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
            </span>
            {expanded ? <ChevronUp size={14} style={{ color: 'var(--color-text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text3)' }} />}
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-6 pb-6 space-y-5" style={{ borderTop: '1px solid var(--color-border2)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">

            {/* Company details */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>
                Company details
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Building2 size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text3)' }} />
                  <div>
                    <span style={{ color: 'var(--color-text3)' }} className="text-xs">Legal name</span>
                    <p style={{ color: 'var(--color-text)' }}>{data?.legal_name || app.company}</p>
                  </div>
                </div>
                {data?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={13} className="shrink-0" style={{ color: 'var(--color-text3)' }} />
                    <div>
                      <span style={{ color: 'var(--color-text3)' }} className="text-xs">Phone</span>
                      <p style={{ color: 'var(--color-text)' }}>{data.phone}</p>
                    </div>
                  </div>
                )}
                {data?.ncr_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash size={13} className="shrink-0" style={{ color: 'var(--color-text3)' }} />
                    <div>
                      <span style={{ color: 'var(--color-text3)' }} className="text-xs">NCR number</span>
                      <p style={{ color: 'var(--color-text)' }}>{data.ncr_number}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={13} className="shrink-0" style={{ color: 'var(--color-text3)' }} />
                  <div>
                    <span style={{ color: 'var(--color-text3)' }} className="text-xs">Contact email</span>
                    <p style={{ color: 'var(--color-text)' }}>{app.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Directors */}
            {data?.directors && data.directors.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>
                  <span className="inline-flex items-center gap-1"><Users size={10} /> Directors ({data.directors.length})</span>
                </p>
                <div className="space-y-2">
                  {data.directors.map((d, i) => (
                    <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{d.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px]" style={{ color: 'var(--color-text3)' }}>
                        {d.id_number && <span>ID {d.id_number}</span>}
                        {d.email && <span>{d.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>
              Uploaded documents
            </p>
            {loadingDocs ? (
              <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-text3)' }}>
                <Loader2 size={14} className="animate-spin" /> Loading documents…
              </div>
            ) : docs && docs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {docs.map(doc => <DocumentRow key={doc.id} doc={doc} />)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm py-3" style={{ color: 'var(--color-text3)' }}>
                <AlertCircle size={13} /> No documents uploaded
              </div>
            )}
          </div>

          {/* Actions */}
          {!isApproved && (
            <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--color-border2)' }}>
              <button
                onClick={() => onRequestInfo(app)}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Mail size={13} /> Request info
              </button>
              {isPending && (
                <button
                  onClick={() => onApprove(app)}
                  className="btn-purple btn-shine inline-flex items-center gap-1.5"
                >
                  <UserPlus size={13} /> Approve & onboard
                </button>
              )}
            </div>
          )}
          {isApproved && (
            <div className="flex items-center gap-2 pt-1 text-sm" style={{ color: '#10B981' }}>
              <CheckCircle2 size={14} /> This application has been approved and onboarded
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps]       = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState<{ kind: ToastKind; message: string } | null>(null);
  const [onboardApp, setOnboardApp]     = useState<Application | null>(null);
  const [requestInfoApp, setRequestInfoApp] = useState<Application | null>(null);
  const [statusFilter, setStatusFilter] = useState<OnboardingStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/applications');
    if (res.ok) {
      const { applications } = await res.json();
      setApps(applications ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(app: Application) {
    setOnboardApp(app);
  }

  async function afterOnboard(app: Application) {
    setOnboardApp(null);
    await fetch(`/api/applications/${app.id}/approve`, { method: 'POST' });
    setToast({ kind: 'success', message: `${app.company} approved and onboarded as a client.` });
    load();
  }

  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.onboarding_status] = (acc[a.onboarding_status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = statusFilter ? apps.filter(a => a.onboarding_status === statusFilter) : apps;

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      {onboardApp && (
        <OnboardingWizard
          onClose={() => setOnboardApp(null)}
          onCreated={() => afterOnboard(onboardApp)}
          initialValues={{
            name:         onboardApp.company,
            contactEmail: onboardApp.email,
            contactName:  onboardApp.name,
          }}
        />
      )}

      {requestInfoApp && (
        <RequestInfoModal
          app={requestInfoApp}
          onClose={() => setRequestInfoApp(null)}
          onSent={() => {
            setToast({ kind: 'success', message: `Information request sent to ${requestInfoApp.name}.` });
            load();
          }}
        />
      )}

      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Self-serve onboarding</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Applications</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              Submitted via algolend.co.za/apply — review details and uploaded documents before onboarding
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.entries(STATUS_CONFIG) as [OnboardingStatus, typeof STATUS_CONFIG[OnboardingStatus]][]).map(([key, cfg]) => {
            const count    = counts[key] ?? 0;
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(prev => prev === key ? null : key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
                style={isActive
                  ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                  : { background: 'transparent', border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }
                }
              >
                {cfg.label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={isActive ? { background: cfg.border, color: cfg.color } : { background: 'var(--color-fill-subtle)', color: 'var(--color-text3)' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="text-xs px-2 py-1 rounded-full transition-colors cursor-pointer"
              style={{ color: 'var(--color-text3)' }}
            >
              ✕ clear
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="bento-card p-12 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
          </div>
        ) : apps.length === 0 ? (
          <div className="bento-card p-12 text-center">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}
            >
              <ClipboardList size={20} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No applications yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
              When a lender completes the self-serve form at algolend.co.za/apply, their application will appear here for review.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bento-card p-10 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No applications match the selected filter.</p>
          </div>
        ) : (
          <div className="bento-card overflow-hidden p-0">
            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border2)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                {filtered.length} {filtered.length === 1 ? 'application' : 'applications'}
                {statusFilter ? ` · ${STATUS_CONFIG[statusFilter].label}` : ''}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-green)' }}>● LIVE</span>
            </div>
            <div>
              {filtered.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onApprove={handleApprove}
                  onRequestInfo={setRequestInfoApp}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
