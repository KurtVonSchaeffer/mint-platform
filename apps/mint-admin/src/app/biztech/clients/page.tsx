'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { Building2, RefreshCw, Plus, X, Loader2, Globe, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

const STATUS_CONFIG: Record<ClientStatus, { label: string; bg: string; border: string; color: string }> = {
  lead:     { label: 'Lead',     bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: 'var(--color-amber)' },
  active:   { label: 'Active',   bg: 'rgba(45,212,191,0.12)', border: 'rgba(45,212,191,0.3)',   color: '#2DD4BF' },
  paused:   { label: 'Paused',   bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)' },
  archived: { label: 'Archived', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: 'var(--color-text3)' },
};

function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm]     = useState({ name: '', industry: '', website: '', address: '', notes: '' });
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
      <div className="bento-card w-full max-w-md p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Add client</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Company name</label>
            <input type="text" required className="field-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Industry</label>
            <input type="text" className="field-input" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Website</label>
            <input type="text" className="field-input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Address</label>
            <input type="text" className="field-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes (optional)</label>
            <textarea className="field-input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' }}
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
  const [statusFilter, setStatusFilter] = useState<ClientStatus | null>(null);

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

  const byStatus = clients.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = statusFilter ? clients.filter(c => c.status === statusFilter) : clients;

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <AddClientModal onClose={() => setAddOpen(false)} onAdded={load} />}

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">MINT BizTech</p>
          <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Clients</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            Companies MINT provides IT consulting and services to
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' }}
          >
            <Plus size={14} /> Add client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(STATUS_CONFIG) as [ClientStatus, typeof STATUS_CONFIG[ClientStatus]][]).map(([k, cfg]) => {
          const isActive = statusFilter === k;
          return (
            <button
              key={k}
              onClick={() => setStatusFilter(prev => prev === k ? null : k)}
              className="bento-card p-4 text-left transition-all cursor-pointer"
              style={isActive ? { background: cfg.bg, border: `1px solid ${cfg.border}`, transform: 'translateY(-1px)' } : {}}
            >
              <p className="text-xs mb-1" style={{ color: isActive ? cfg.color : 'var(--color-text3)' }}>{cfg.label}</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: cfg.color }}>{byStatus[k] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bento-card p-12 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: '#0D9488' }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)', color: '#0D9488' }}>
            <Inbox size={20} />
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No clients yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
            Add your first BizTech client to start tracking their projects, quotes, and invoices.
          </p>
        </div>
      ) : (
        <div className="bento-card overflow-hidden p-0">
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
              {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
              {statusFilter ? ` · ${STATUS_CONFIG[statusFilter].label}` : ' · newest first'}
            </span>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: STATUS_CONFIG[statusFilter].bg, color: STATUS_CONFIG[statusFilter].color, border: `1px solid ${STATUS_CONFIG[statusFilter].border}` }}
              >
                ✕ clear
              </button>
            )}
          </div>
          <div>
            {filtered.map(client => {
              const cfg = STATUS_CONFIG[client.status];
              return (
                <article
                  key={client.id}
                  onClick={() => router.push(`/biztech/clients/${client.id}`)}
                  className="p-6 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{client.name}</h3>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--color-text3)' }}>
                        {client.industry && (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 size={11} />
                            {client.industry}
                          </span>
                        )}
                        {client.website && (
                          <span className="inline-flex items-center gap-1.5">
                            <Globe size={11} />
                            {client.website}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                        {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
