'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, type ToastKind } from '@/components/Toast';
import { fmt } from '@/lib/invoice-helpers';
import { ArrowLeft, Plus, X, Loader2, Trash2, RefreshCw } from 'lucide-react';

interface BizClient { id: string; name: string; }
interface LineItem { description: string; quantity: number; unit_price_cents: number; }
interface Recurring {
  id: string; description: string; items: LineItem[]; day_of_month: number;
  active: boolean; last_generated_at: string | null; biztech_clients: { name: string } | null;
}

function total(items: LineItem[]) {
  return items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
}

function NewRecurringModal({ clients, onClose, onCreated }: { clients: BizClient[]; onClose: () => void; onCreated: () => void }) {
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('Monthly retainer');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price_cents: 0 }]);
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/biztech/recurring-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, description, items, day_of_month: dayOfMonth }),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
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
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New recurring invoice</h3>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Label</label>
                <input type="text" required className="field-input" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Bills on day of month</label>
                <input type="number" min={1} max={28} required className="field-input" value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid gap-x-2 mb-1.5 pt-2" style={{ gridTemplateColumns: '1fr 64px 96px 96px 24px' }}>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Description</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Qty</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Unit price</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--color-text3)' }}>Total</span>
              <span />
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 64px 96px 96px 24px' }}>
                  <input type="text" placeholder="e.g. Retainer — support hours" required className="field-input" value={it.description}
                    onChange={e => updateItem(idx, { description: e.target.value })} />
                  <input type="number" min={1} className="field-input" value={it.quantity}
                    onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
                  <input type="number" min={0} step={0.01} placeholder="0.00" className="field-input"
                    value={it.unit_price_cents / 100}
                    onChange={e => updateItem(idx, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} />
                  <span className="text-xs font-mono text-right tabular-nums" style={{ color: 'var(--color-text2)' }}>
                    {fmt(it.quantity * it.unit_price_cents)}
                  </span>
                  {items.length > 1 ? (
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="cursor-pointer p-1 justify-self-end" style={{ color: 'var(--color-text3)' }}>
                      <Trash2 size={14} />
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unit_price_cents: 0 }])}
              className="text-xs mt-2 cursor-pointer" style={{ color: '#5C3BCF' }}>
              + Add line item
            </button>

            <div className="flex items-center justify-between pt-2 text-sm" style={{ borderTop: '1px solid var(--color-border2)' }}>
              <span style={{ color: 'var(--color-text3)' }}>Subtotal (excl. VAT) · per month</span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(total(items))}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: '#5C3BCF' }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Creating…' : 'Create recurring invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RecurringInvoicesPage() {
  const router = useRouter();
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [clients, setClients] = useState<BizClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, cRes] = await Promise.all([
      fetch('/api/biztech/recurring-invoices'),
      fetch('/api/biztech/clients'),
    ]);
    if (rRes.ok) setRecurring((await rRes.json()).recurring ?? []);
    else setToast({ kind: 'error', message: 'Failed to load recurring invoices' });
    if (cRes.ok) setClients((await cRes.json()).clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(r: Recurring) {
    await fetch(`/api/biztech/recurring-invoices/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !r.active }) });
    setRecurring(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x));
  }

  async function deleteRecurring(r: Recurring) {
    if (!window.confirm(`Delete recurring invoice "${r.description}"? This can't be undone.`)) return;
    const res = await fetch(`/api/biztech/recurring-invoices/${r.id}`, { method: 'DELETE' });
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to delete' }); return; }
    setRecurring(prev => prev.filter(x => x.id !== r.id));
    setToast({ kind: 'success', message: 'Recurring invoice deleted' });
  }

  return (
    <div className="space-y-6 page-enter">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <NewRecurringModal clients={clients} onClose={() => setAddOpen(false)} onCreated={load} />}

      <button onClick={() => router.push('/biztech/invoices')} className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: 'var(--color-text3)' }}>
        <ArrowLeft size={13} /> Back to invoices
      </button>

      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">Retainers</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Recurring invoices</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>Auto-generated monthly for retainer clients — a draft invoice is created on the day of month you set.</p>
        </div>
        <button
          onClick={() => clients.length ? setAddOpen(true) : setToast({ kind: 'error', message: 'Add a client first' })}
          className="btn-purple btn-shine inline-flex items-center gap-1.5"
        >
          <Plus size={15} /> New recurring invoice
        </button>
      </div>

      <div className="bento-card overflow-hidden p-0">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" style={{ color: '#8b6ce8' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading…</p>
          </div>
        ) : recurring.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw size={20} className="mx-auto mb-4" style={{ color: 'var(--color-text3)' }} />
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No recurring invoices yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
              Set one up for a retainer client and it'll bill itself every month.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>{['Client', 'Label', 'Amount', 'Bills on', 'Last generated', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {recurring.map((r, i) => (
                <tr key={r.id} style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${Math.min(i, 12) * 35}ms`, opacity: r.active ? 1 : 0.5 }}>
                  <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{r.biztech_clients?.name ?? '—'}</td>
                  <td className="text-sm" style={{ color: 'var(--color-text2)' }}>{r.description}</td>
                  <td className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(total(r.items))}/mo</td>
                  <td className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>Day {r.day_of_month}</td>
                  <td className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                    {r.last_generated_at ? new Date(r.last_generated_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'Never'}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      style={r.active
                        ? { background: 'rgba(92,59,207,0.1)', border: '1px solid rgba(92,59,207,0.3)', color: '#5C3BCF' }
                        : { background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)', color: 'var(--color-text3)' }}
                    >
                      {r.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td>
                    <button title="Delete" onClick={() => deleteRecurring(r)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-red)' }}>
                      <Trash2 size={14} />
                    </button>
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
