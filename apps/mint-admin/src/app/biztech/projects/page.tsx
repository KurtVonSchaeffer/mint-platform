'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { RefreshCw, Plus, X, Loader2, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

interface Project {
  id: string; name: string; status: ProjectStatus; due_date: string | null;
  created_at: string; biztech_clients: { name: string } | null;
}

interface BizClient { id: string; name: string; }

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  planning:  { label: 'Planning',  color: 'var(--color-text3)' },
  active:    { label: 'Active',    color: '#5C3BCF' },
  on_hold:   { label: 'On hold',   color: 'var(--color-amber)' },
  completed: { label: 'Completed', color: 'var(--color-sky)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-red)' },
};

function NewProjectModal({ clients, onClose, onCreated }: { clients: BizClient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ client_id: '', name: '', description: '', start_date: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/biztech/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, start_date: form.start_date || null, due_date: form.due_date || null }),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New project</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Client</label>
            <select required className="field-input" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Project name</label>
            <input type="text" required className="field-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Description</label>
            <textarea className="field-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Start date</label>
              <input type="date" className="field-input" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Due date</label>
              <input type="date" className="field-input" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BizTechProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<BizClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch('/api/biztech/projects'),
      fetch('/api/biztech/clients'),
    ]);
    if (pRes.ok) setProjects((await pRes.json()).projects ?? []);
    else setToast({ kind: 'error', message: 'Failed to load projects' });
    if (cRes.ok) setClients((await cRes.json()).clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <NewProjectModal clients={clients} onClose={() => setAddOpen(false)} onCreated={load} />}

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">MINT BizTech</p>
          <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Delivery work for BizTech clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => clients.length ? setAddOpen(true) : setToast({ kind: 'error', message: 'Add a client first' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#5C3BCF' }}
          >
            <Plus size={14} /> New project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bento-card p-12 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <Inbox size={22} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No projects yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>Start a project for a BizTech client to track delivery.</p>
        </div>
      ) : (
        <div className="bento-card overflow-hidden p-0">
          <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} · newest first
            </span>
          </div>
          <div>
            {projects.map(p => {
              const cfg = STATUS_CONFIG[p.status];
              return (
                <article
                  key={p.id}
                  onClick={() => router.push(`/biztech/projects/${p.id}`)}
                  className="p-5 flex items-center justify-between cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(92,59,207,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                      <StatusDot label={cfg.label} color={cfg.color} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>{p.biztech_clients?.name ?? '—'}</p>
                  </div>
                  <p className="text-[10px] font-mono shrink-0" style={{ color: 'var(--color-text3)' }}>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
