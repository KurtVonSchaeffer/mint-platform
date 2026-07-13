'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { StatusDot } from '@/components/biztech/StatusDot';
import { ClientAvatar } from '@/components/biztech/ClientAvatar';
import { RefreshCw, Plus, X, Loader2, Inbox } from 'lucide-react';
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

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  lead:     { label: 'Lead',     color: 'var(--color-amber)' },
  active:   { label: 'Active',   color: '#5C3BCF' },
  paused:   { label: 'Paused',   color: 'var(--color-sky)' },
  archived: { label: 'Archived', color: 'var(--color-text3)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

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
      <div className="w-full max-w-md p-7" style={{ ...PANEL, animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
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
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
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

  const statusKeys = Object.keys(STATUS_CONFIG) as ClientStatus[];
  const filtered = statusFilter ? clients.filter(c => c.status === statusFilter) : clients;

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

      <div className="flex items-stretch" style={PANEL}>
        {statusKeys.map((k, i) => {
          const cfg = STATUS_CONFIG[k];
          const isActive = statusFilter === k;
          return (
            <button
              key={k}
              onClick={() => setStatusFilter(prev => prev === k ? null : k)}
              className="flex-1 text-left px-5 py-3 cursor-pointer transition-colors"
              style={{
                borderLeft: i > 0 ? '1px solid var(--color-border2)' : 'none',
                background: isActive ? 'var(--color-surface2)' : 'transparent',
              }}
            >
              <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text3)' }}>{cfg.label}</p>
              <p className="text-xl font-semibold tabular-nums" style={{ color: isActive ? cfg.color : 'var(--color-text)' }}>{byStatus[k] ?? 0}</p>
            </button>
          );
        })}
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
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text3)' }}>
              {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
              {statusFilter ? ` · ${STATUS_CONFIG[statusFilter].label}` : ''}
            </span>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                className="text-xs font-medium cursor-pointer"
                style={{ color: 'var(--color-text3)' }}
              >
                Clear filter
              </button>
            )}
          </div>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Client</th>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Industry</th>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Website</th>
                <th className="text-left font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Status</th>
                <th className="text-right font-medium px-4 py-2 text-xs" style={{ color: 'var(--color-text3)', borderBottom: '1px solid var(--color-border2)' }}>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const cfg = STATUS_CONFIG[client.status];
                return (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/biztech/clients/${client.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border2)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2.5">
                        <ClientAvatar name={client.name} />
                        {client.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text3)' }}>{client.industry ?? '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text3)' }}>{client.website ?? '—'}</td>
                    <td className="px-4 py-2.5"><StatusDot label={cfg.label} color={cfg.color} /></td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-text3)' }}>
                      {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
