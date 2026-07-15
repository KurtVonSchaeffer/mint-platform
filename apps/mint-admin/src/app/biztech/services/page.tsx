'use client';

import { useState, useEffect, useCallback } from 'react';
import { Toast, type ToastKind } from '@/components/Toast';
import { fmt } from '@/lib/invoice-helpers';
import { Plus, X, Loader2, Trash2, Wrench, Pencil } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  unit_price_cents: number;
  unit: string;
  active: boolean;
}

const UNITS = ['once-off', 'hour', 'day', 'month'];

function ServiceModal({ service, onClose, onSaved }: { service: Service | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [price, setPrice] = useState(service ? service.unit_price_cents / 100 : 0);
  const [unit, setUnit] = useState(service?.unit ?? 'once-off');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { name, description, unit_price_cents: Math.round(price * 100), unit };
    if (service) {
      await fetch(`/api/biztech/services/${service.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/biztech/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(92,59,207,0.22)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(92,59,207,0.16), 0 0 60px rgba(92,59,207,0.12)',
          animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg, #5C3BCF, #DDC357)' }} />
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{service ? 'Edit service' : 'New service'}</h3>
            <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Name</label>
              <input type="text" required className="field-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Description (optional)</label>
              <textarea className="field-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Price (R)</label>
                <input type="number" min={0} step={0.01} required className="field-input" value={price} onChange={e => setPrice(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Per</label>
                <select className="field-input" value={unit} onChange={e => setUnit(e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Saving…' : service ? 'Save changes' : 'Add service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function BizTechServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'closed' | 'new' | Service>('closed');
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/biztech/services');
    if (res.ok) setServices((await res.json()).services ?? []);
    else setToast({ kind: 'error', message: 'Failed to load services' });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(s: Service) {
    await fetch(`/api/biztech/services/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !s.active }) });
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
  }

  async function deleteService(s: Service) {
    if (!window.confirm(`Delete "${s.name}" from the catalog?`)) return;
    const res = await fetch(`/api/biztech/services/${s.id}`, { method: 'DELETE' });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to delete service' }); return; }
    setServices(prev => prev.filter(x => x.id !== s.id));
    setToast({ kind: 'success', message: `"${s.name}" deleted` });
  }

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {modal !== 'closed' && (
        <ServiceModal service={modal === 'new' ? null : modal} onClose={() => setModal('closed')} onSaved={load} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">Rate card</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Services</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Billable services MINT BizTech offers, with consistent pricing.</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-purple btn-shine inline-flex items-center gap-1.5">
          <Plus size={15} /> New service
        </button>
      </div>

      <div className="bento-card overflow-hidden p-0">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" style={{ color: '#8b6ce8' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading services…</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench size={20} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No services yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
              Add a service to reuse consistent pricing when building quotes and invoices.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>{['Service', 'Price', 'Per', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={s.id} style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${Math.min(i, 12) * 35}ms`, opacity: s.active ? 1 : 0.5 }}>
                  <td>
                    <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                    {s.description && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{s.description}</p>}
                  </td>
                  <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(s.unit_price_cents)}</td>
                  <td className="text-xs" style={{ color: 'var(--color-text3)' }}>{s.unit}</td>
                  <td>
                    <button
                      onClick={() => toggleActive(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      style={s.active
                        ? { background: 'rgba(92,59,207,0.1)', border: '1px solid rgba(92,59,207,0.3)', color: '#5C3BCF' }
                        : { background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)', color: 'var(--color-text3)' }}
                    >
                      {s.active ? 'Active' : 'Archived'}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button title="Edit" onClick={() => setModal(s)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                        <Pencil size={14} />
                      </button>
                      <button title="Delete" onClick={() => deleteService(s)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-red)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
