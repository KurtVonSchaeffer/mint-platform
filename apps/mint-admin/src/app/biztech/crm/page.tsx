'use client';

import { useState, useEffect, useCallback } from 'react';
import { Toast, type ToastKind } from '@/components/Toast';
import { RefreshCw, Plus, X, Loader2, Inbox, Phone, Mail, Users, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ActivityType = 'call' | 'email' | 'meeting' | 'note';

interface Activity {
  id: string; type: ActivityType; summary: string; occurred_at: string;
  biztech_clients: { id: string; name: string } | null;
}

interface BizClient { id: string; name: string; }

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: typeof Phone; color: string }> = {
  call:    { label: 'Call',    icon: Phone,      color: '#5C3BCF' },
  email:   { label: 'Email',   icon: Mail,       color: 'var(--color-sky)' },
  meeting: { label: 'Meeting', icon: Users,      color: 'var(--color-amber)' },
  note:    { label: 'Note',    icon: StickyNote, color: 'var(--color-text3)' },
};

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function LogActivityModal({ clients, onClose, onCreated }: { clients: BizClient[]; onClose: () => void; onCreated: () => void }) {
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState<ActivityType>('note');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/biztech/clients/${clientId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, summary }),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-7" style={PANEL}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Log activity</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Client</label>
            <select required className="field-input" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Type</label>
            <select className="field-input" value={type} onChange={e => setType(e.target.value as ActivityType)}>
              {(Object.entries(TYPE_CONFIG) as [ActivityType, typeof TYPE_CONFIG[ActivityType]][]).map(([k, cfg]) => (
                <option key={k} value={k}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Summary</label>
            <textarea required className="field-input" rows={3} value={summary} onChange={e => setSummary(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Logging…' : 'Log activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BizTechCrmPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clients, setClients] = useState<BizClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, cRes] = await Promise.all([
      fetch('/api/biztech/activities'),
      fetch('/api/biztech/clients'),
    ]);
    if (aRes.ok) setActivities((await aRes.json()).activities ?? []);
    else setToast({ kind: 'error', message: 'Failed to load activity' });
    if (cRes.ok) setClients((await cRes.json()).clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <LogActivityModal clients={clients} onClose={() => setAddOpen(false)} onCreated={load} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>CRM</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>Calls, emails, meetings, and notes across all clients</p>
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
            <Plus size={14} /> Log activity
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center" style={PANEL}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#5C3BCF' }} />
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center" style={PANEL}>
          <Inbox size={22} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No activity logged yet</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>Log a call, email, meeting, or note for any client.</p>
        </div>
      ) : (
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} · most recent first
            </span>
          </div>
          <div>
            {activities.map(a => {
              const cfg = TYPE_CONFIG[a.type];
              const Icon = cfg.icon;
              return (
                <div key={a.id} className="px-6 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(92,59,207,0.1)' }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{a.biztech_clients?.name ?? '—'}</p>
                      <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text2)' }}>{a.summary}</p>
                    <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--color-text3)' }}>{formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}</p>
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
