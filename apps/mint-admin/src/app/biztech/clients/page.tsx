'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ClientAvatar } from '@/components/biztech/ClientAvatar';
import { RefreshCw, Plus, X, Loader2, Inbox, Building2, MapPin, Receipt, FolderKanban, FileText, Tag, Globe, StickyNote, Users2, ArrowRight, ChevronDown, Search, Mail, Clock, UserRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '@/components/ThemeProvider';

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
  updatedAt: string;
  primaryContact: { name: string; email: string | null } | null;
  assignedTo: string | null;
}

interface StaffUser { id: string; name: string; email: string | null; }

function useStaffUsers() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : { users: [] })
      .then(({ users }) => setUsers((users ?? []).map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email }))))
      .catch(() => {});
  }, []);
  return users;
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
  const [form, setForm]     = useState({ name: '', industry: '', website: '', address: '', notes: '', status: 'active' as ClientStatus, assigned_to: '' });
  const [saving, setSaving] = useState(false);
  const staff = useStaffUsers();

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
          border: '1px solid rgba(92,59,207,0.22)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(92,59,207,0.16), 0 0 60px rgba(92,59,207,0.12)',
          animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg, #5C3BCF, #DDC357)' }} />
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
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text2)' }}>Assigned to</label>
                <IconField icon={UserRound}>
                  <select
                    className="field-input"
                    style={{ paddingLeft: 34 }}
                    value={form.assigned_to}
                    onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </IconField>
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

interface QuickCounts { contacts: number; documents: number; projects: number; }

function QuickView({ clients, onChanged }: { clients: BizClient[]; onChanged: () => void }) {
  const router = useRouter();
  const staff = useStaffUsers();
  const [selectedId, setSelectedId] = useState('');
  const [counts, setCounts]         = useState<QuickCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);

  const selected = clients.find(c => c.id === selectedId) ?? null;

  async function setOwner(userId: string) {
    if (!selected) return;
    setSavingOwner(true);
    await fetch(`/api/biztech/clients/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: userId || null }),
    });
    setSavingOwner(false);
    onChanged();
  }

  useEffect(() => {
    if (!selectedId) { setCounts(null); return; }
    setCountsLoading(true);
    Promise.all([
      fetch(`/api/biztech/clients/${selectedId}/contacts`).then(r => r.ok ? r.json() : { contacts: [] }),
      fetch(`/api/biztech/clients/${selectedId}/documents`).then(r => r.ok ? r.json() : { documents: [] }),
      fetch(`/api/biztech/projects?client_id=${selectedId}`).then(r => r.ok ? r.json() : { projects: [] }),
    ]).then(([c, d, p]) => {
      setCounts({ contacts: (c.contacts ?? []).length, documents: (d.documents ?? []).length, projects: (p.projects ?? []).length });
      setCountsLoading(false);
    }).catch(() => setCountsLoading(false));
  }, [selectedId]);

  return (
    <div style={{ ...PANEL, overflow: 'hidden' }}>
      <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
        <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--color-text)' }}>Quick view</p>
        <div className="relative flex-1 max-w-xs">
          <select
            className="field-input w-full text-sm appearance-none"
            style={{ paddingRight: 30 }}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            <option value="">Select a client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text3)', pointerEvents: 'none' }} />
        </div>
      </div>

      {!selected ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Pick a client above to see their details here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          <div className="p-5 space-y-3" style={{ borderRight: '1px solid var(--color-border2)' }}>
            <div className="flex items-center gap-2.5">
              <ClientAvatar name={selected.name} size={34} />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{selected.name}</p>
                <StatusDot label={STATUS_CONFIG[selected.status].label} color={STATUS_CONFIG[selected.status].color} />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text2)' }}>
                <Building2 size={12} style={{ color: 'var(--color-text3)' }} /> {selected.industry ?? 'No industry set'}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text2)' }}>
                <Globe size={12} style={{ color: 'var(--color-text3)' }} /> {selected.website ?? '—'}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text2)' }}>
                <MapPin size={12} style={{ color: 'var(--color-text3)' }} /> {selected.address ?? '—'}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text2)' }}>
                <StickyNote size={12} style={{ color: 'var(--color-text3)' }} />
                <span className="truncate">{selected.notes ?? 'No notes yet.'}</span>
              </div>
            </div>
          </div>
          <div className="p-5 flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text3)' }}>
                <UserRound size={11} /> Assigned to {savingOwner && <Loader2 size={10} className="animate-spin" />}
              </p>
              <select
                className="field-input w-full text-sm"
                value={selected.assignedTo ?? ''}
                onChange={e => setOwner(e.target.value)}
                disabled={savingOwner}
              >
                <option value="">Unassigned</option>
                {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>At a glance</p>
            {countsLoading || !counts ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin" style={{ color: '#5C3BCF' }} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Contacts',  value: counts.contacts,  icon: Users2 },
                  { label: 'Documents', value: counts.documents, icon: FileText },
                  { label: 'Projects',  value: counts.projects,  icon: FolderKanban },
                ].map(s => (
                  <div key={s.label} className="rounded-lg px-2.5 py-2 text-center" style={{ background: 'var(--color-surface2)' }}>
                    <s.icon size={12} className="mx-auto mb-1" style={{ color: '#5C3BCF' }} />
                    <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push(`/biztech/clients/${selected.id}`)}
              className="mt-auto inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
              style={{ background: '#5C3BCF' }}
            >
              View full profile <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const FILTER_OPTIONS = ['All', 'Lead', 'Active', 'Paused', 'Archived'] as const;

export default function BizTechClientsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [clients, setClients]   = useState<BizClient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [toast, setToast]       = useState<{ kind: ToastKind; message: string } | null>(null);
  const [work, setWork]         = useState<WorkSummary | null>(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<typeof FILTER_OPTIONS[number]>('All');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/biztech/clients');
    if (res.ok) {
      const { clients: raw } = await res.json();
      setClients((raw ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        createdAt: (c.created_at ?? c.createdAt) as string,
        updatedAt: (c.updated_at ?? c.updatedAt) as string,
        primaryContact: (c.primary_contact ?? c.primaryContact ?? null) as BizClient['primaryContact'],
        assignedTo: (c.assigned_to ?? c.assignedTo ?? null) as string | null,
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
  const filtered = clients.filter(c => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter.toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.industry ?? '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

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

      {clients.length > 0 && <QuickView clients={clients} onChanged={load} />}

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
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text3)' }} />
              <input
                type="text"
                placeholder="Search…"
                className="field-input w-full text-sm"
                style={{ paddingLeft: 32 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="field-input text-sm appearance-none"
                style={{ paddingRight: 30 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof FILTER_OPTIONS[number])}
              >
                {FILTER_OPTIONS.map(o => <option key={o} value={o}>{o} Filter</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text3)', pointerEvents: 'none' }} />
            </div>
            <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--color-text3)' }}>
              {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
            </span>
          </div>
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
                  {isLight ? (
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
                  ) : (
                    <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                      <div className="flex items-center gap-2 text-xs">
                        <Users2 size={11} style={{ color: 'var(--color-text3)' }} />
                        <span style={{ color: 'var(--color-text3)' }}>Contact</span>
                        <span className="truncate ml-auto" style={{ color: 'var(--color-text2)' }}>{client.primaryContact?.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail size={11} style={{ color: 'var(--color-text3)' }} />
                        <span style={{ color: 'var(--color-text3)' }}>Email</span>
                        <span className="truncate ml-auto" style={{ color: 'var(--color-text2)' }}>{client.primaryContact?.email ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Clock size={11} style={{ color: 'var(--color-text3)' }} />
                        <span style={{ color: 'var(--color-text3)' }}>Last activity</span>
                        <span className="font-mono ml-auto" style={{ color: 'var(--color-text2)' }}>{formatDistanceToNow(new Date(client.updatedAt ?? client.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
