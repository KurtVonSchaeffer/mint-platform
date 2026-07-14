'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ClientAvatar } from '@/components/biztech/ClientAvatar';
import { RefreshCw, Plus, X, Loader2, Inbox, Building2, MapPin, Receipt, FolderKanban, FileText, Tag, Globe, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkSummary {
  invoices: { outstandingCents: number };
  quotes:   { pipelineCents: number };
  projects: { byStatus: Record<string, number> };
}

function centsToRand(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
}

type ClientStatus = 'lead' | 'active' | 'paused' | 'archived';

interface BizClient {
  id:        string;
  name:      string;
  industry:  string | null;
  status:    ClientStatus;
  website:   string | null;
  address:   string | null;
  notes:     string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  lead:     { label: 'Lead',     color: 'var(--color-amber)' },
  active:   { label: 'Active',   color: '#5C3BCF' },
  paused:   { label: 'Paused',   color: 'var(--color-sky)' },
  archived: { label: 'Archived', color: 'var(--color-text3)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function IconField({ icon: Icon, top, children }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; top?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon size={14} style={{ position: 'absolute', left: 11, top: top ? 12 : '50%', transform: top ? 'none' : 'translateY(-50%)', color: 'var(--color-text3)', pointerEvents: 'none' }} />
      {children}
    </div>
  );
}

function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm]     = useState({ name: '', industry: '', website: '', address: '', notes: '', status: 'active' as ClientStatus });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/biztech/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border2)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(92,59,207,0.12)',
          animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <div className="flex items-center gap-3">
            {form.name.trim() ? (
              <div key="avatar" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
                <ClientAvatar name={form.name} size={36} />
              </div>
            ) : (
              <div key="icon" className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(92,59,207,0.12)' }}>
                <Building2 size={16} style={{ color: '#5C3BCF' }} />
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text3)' }}>New client</p>
              <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>{form.name.trim() || 'Add a BizTech client'}</h3>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1 rounded-md" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="px-7 py-6 space-y-5 max-h-[65vh] overflow-y-auto">
            <div className="space-y-3 biztech-field-in" style={{ animationDelay: '0ms' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5" style={{ color: '#5C3BCF' }}>
                <Building2 size={11} /> Company details
              </p>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Company name</label>
                <IconField icon={Building2}>
                  <input type="text" required autoFocus className="field-input" style={{ paddingLeft: 34 }} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </IconField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Industry</label>
                  <IconField icon={Tag}>
                    <input type="text" className="field-input" style={{ paddingLeft: 34 }} value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} />
                  </IconField>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Website</label>
                  <IconField icon={Globe}>
                    <input type="text" className="field-input" style={{ paddingLeft: 34 }} value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
                  </IconField>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Status</label>
                <select
                  className="field-input"
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as ClientStatus }))}
                >
                  {(Object.keys(STATUS_CONFIG) as ClientStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text3)' }}>
                  Already an onboarded client? Leave this as Active. Use Lead for prospects not yet signed.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 biztech-field-in" style={{ borderTop: '1px solid var(--color-border2)', animationDelay: '80ms' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-sky)' }}>
                <MapPin size={11} /> Location &amp; notes
              </p>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Address</label>
                <IconField icon={MapPin}>
                  <input type="text" className="field-input" style={{ paddingLeft: 34 }} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </IconField>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Notes (optional)</label>
                <IconField icon={StickyNote} top>
                  <textarea className="field-input" style={{ paddingLeft: 34 }} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </IconField>
              </div>
            </div>
          </div>

          <div className="flex gap-2 px-7 py-5" style={{ borderTop: '1px solid var(--color-border2)' }}>
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
              style={{ background: '#5C3BCF' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BizTechClientsPage() {
  const router = useRouter();
  const [clients, setClients]   = useState<BizClient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [toast, setToast]       = useState<{ kind: ToastKind; message: string } | null>(null);
  const [work, setWork]         = useState<WorkSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/biztech/clients');
    if (res.ok) {
      const { clients: raw } = await res.json();
      setClients((raw ?? []).map((c: Record<string, string>) => ({
        ...c,
        createdAt: c.created_at ?? c.createdAt,
      })));
    } else {
      setToast({ kind: 'error', message: 'Failed to load clients' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/biztech/reports/summary')
      .then(r => r.ok ? r.json() : null)
      .then(setWork)
      .catch(() => {});
  }, []);

  const activeProjects = work ? Object.entries(work.projects.byStatus).filter(([s]) => s !== 'completed' && s !== 'cancelled').reduce((s, [, n]) => s + n, 0) : 0;
  const filtered = clients;

  return (
    <div className="space-y-5 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <AddClientModal onClose={() => setAddOpen(false)} onAdded={load} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Clients</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            Companies MINT provides IT consulting and services to
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#5C3BCF' }}
          >
            <Plus size={14} /> Add client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Outstanding invoices', value: work ? centsToRand(work.invoices.outstandingCents) : '—', icon: Receipt, color: 'var(--color-amber)' },
          { label: 'Active projects',      value: work ? String(activeProjects) : '—',                       icon: FolderKanban, color: '#5C3BCF' },
          { label: 'Quote pipeline',       value: work ? centsToRand(work.quotes.pipelineCents) : '—',        icon: FileText, color: 'var(--color-sky)' },
        ].map(s => (
          <div key={s.label} className="biztech-tile px-5 py-4" style={{ ...PANEL, borderLeft: `2px solid ${s.color}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              <s.icon size={13} style={{ color: s.color }} />
            </div>
            <p className="stat-value text-xl font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center" style={PANEL}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center" style={PANEL}>
          <Inbox size={20} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No clients yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
            Add your first BizTech client to start tracking their projects, quotes, and invoices.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-xs" style={{ color: 'var(--color-text3)' }}>
            {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((client, i) => {
              const cfg = STATUS_CONFIG[client.status];
              return (
                <div
                  key={client.id}
                  onClick={() => router.push(`/biztech/clients/${client.id}`)}
                  className="biztech-card biztech-field-in cursor-pointer p-5"
                  style={{ ...PANEL, animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ClientAvatar name={client.name} size={32} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{client.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{client.industry ?? 'No industry set'}</p>
                      </div>
                    </div>
                    <StatusDot label={cfg.label} color={cfg.color} />
                  </div>
                  <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--color-text3)' }}>Website</span>
                      <span className="truncate max-w-[60%]" style={{ color: 'var(--color-text2)' }}>{client.website ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--color-text3)' }}>Added</span>
                      <span className="font-mono" style={{ color: 'var(--color-text2)' }}>{formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
