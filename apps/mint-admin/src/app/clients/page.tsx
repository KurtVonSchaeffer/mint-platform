'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { ImportFromVercelModal } from '@/components/ImportFromVercelModal';
import { ALL_FEATURES, FEATURE_LABELS } from '@/lib/features';
import Link from 'next/link';
import {
  Power, Settings2, ExternalLink, X, Search, Plus, Zap, Building2, Mail, Loader2, Download,
  LayoutGrid, Table2, Trash2,
} from 'lucide-react';

interface ClientFeature { flag: string; enabled: boolean; }

interface Client {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  domain: string | null;
  status: 'trial' | 'active' | 'suspended' | 'churned';
  tier: 'core' | 'growth' | 'enterprise';
  monthly_fee_cents: number;
  api_quota: number;
  contact_email: string;
  client_features: ClientFeature[];
  features: Record<string, boolean>;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function normalise(raw: Omit<Client, 'features'>): Client {
  return {
    ...raw,
    features: Object.fromEntries((raw.client_features ?? []).map((f) => [f.flag, f.enabled])),
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'trial'>('all');
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<Client | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('fetch failed');
      const { clients: raw } = await res.json();
      setClients((raw as Omit<Client, 'features'>[]).map(normalise));
    } catch {
      setToast({ kind: 'error', message: 'Could not load clients — check Supabase env vars.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  function openClient(c: Client) {
    setSelected(c);
    setEditFeatures({ ...c.features });
  }

  function toggleKillRequest(c: Client) {
    setPendingConfirm(c);
  }

  function activateLabel(status: Client['status']) {
    if (status === 'active') return 'Suspend';
    if (status === 'trial')  return 'Activate';
    return 'Reactivate';
  }

  async function confirmKill() {
    if (!pendingConfirm) return;
    const next = pendingConfirm.status === 'active' ? 'suspended' : 'active';
    setClients((prev) =>
      prev.map((c) => (c.id === pendingConfirm.id ? { ...c, status: next } : c)),
    );
    setPendingConfirm(null);
    try {
      const res = await fetch(`/api/clients/${pendingConfirm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setToast({
        kind: next === 'suspended' ? 'error' : 'success',
        message: `${pendingConfirm.name} has been ${next === 'suspended' ? 'suspended' : 'reactivated'}.`,
      });
    } catch (err) {
      setClients((prev) =>
        prev.map((c) => (c.id === pendingConfirm.id ? { ...c, status: pendingConfirm.status } : c)),
      );
      setToast({ kind: 'error', message: `Failed to update status: ${err}` });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setClients(prev => prev.filter(c => c.id !== pendingDelete.id));
      setToast({ kind: 'success', message: `${pendingDelete.name} has been permanently deleted.` });
    } catch (err) {
      setToast({ kind: 'error', message: `Failed to delete: ${err}` });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  async function saveFeatures() {
    if (!selected) return;
    const changes = ALL_FEATURES.filter((f) => (editFeatures[f] ?? false) !== (selected.features[f] ?? false)).length;
    if (changes === 0) {
      setToast({ kind: 'success', message: `No changes to save for ${selected.name}.` });
      setSelected(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: editFeatures }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClients((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, features: { ...editFeatures } } : c)),
      );
      setToast({
        kind: 'success',
        message: `${changes} feature ${changes === 1 ? 'change' : 'changes'} saved for ${selected.name}.`,
      });
      setSelected(null);
    } catch (err) {
      setToast({ kind: 'error', message: `Failed to save features: ${err}` });
    } finally {
      setSaving(false);
    }
  }

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tierBadge: Record<Client['tier'], string> = {
    core:       'badge badge-core',
    growth:     'badge badge-growth',
    enterprise: 'badge badge-enterprise',
  };
  const statusBadge: Record<Client['status'], string> = {
    active:    'badge badge-active',
    trial:     'badge badge-trial',
    suspended: 'badge badge-suspended',
    churned:   'badge badge-churned',
  };

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}

      {wizardOpen && (
        <OnboardingWizard
          onClose={() => { setWizardOpen(false); loadClients(); }}
          onCreated={() => { /* wizard shows its own done screen; loadClients fires on close */ }}
        />
      )}

      {importOpen && (
        <ImportFromVercelModal
          onClose={() => setImportOpen(false)}
          onImported={(count) => {
            setImportOpen(false);
            loadClients();
            setToast({ kind: 'success', message: `${count} client${count === 1 ? '' : 's'} imported successfully.` });
          }}
        />
      )}

      {/* Confirmation modal */}
      {pendingConfirm ? (
        <div
          className="fixed inset-0 confirm-backdrop z-40 flex items-center justify-center p-6"
          style={{ animation: 'fade-in 0.2s ease-out both' }}
          onClick={() => setPendingConfirm(null)}
        >
          <div
            className="bento-card max-w-md w-full p-7"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(248,113,113,0.12)', color: 'var(--color-red)' }}
            >
              <Power size={18} />
            </div>
            <h3 className="text-xl font-bold mb-2 tracking-tight" style={{ color: 'var(--color-text)' }}>
              {activateLabel(pendingConfirm.status)} {pendingConfirm.name}?
            </h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text3)' }}>
              {pendingConfirm.status === 'active'
                ? `Their portal at ${pendingConfirm.domain ?? `${pendingConfirm.subdomain}.algolend.co.za`} will become unreachable.`
                : `Their account will be set to active. Billing will start on the next cycle.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmKill}
                className="btn-shine flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{
                  background: pendingConfirm.status === 'active'
                    ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                    : 'linear-gradient(135deg, #059669, #34d399)',
                  boxShadow: pendingConfirm.status === 'active'
                    ? '0 4px 20px rgba(248,113,113,0.35)'
                    : '0 4px 20px rgba(52,211,153,0.35)',
                }}
              >
                {pendingConfirm.status === 'active' ? 'Yes, suspend' : pendingConfirm.status === 'trial' ? 'Yes, activate' : 'Yes, reactivate'}
              </button>
              <button
                onClick={() => setPendingConfirm(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  border: '1px solid var(--color-border2)',
                  color: 'var(--color-text2)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation modal */}
      {pendingDelete ? (
        <div
          className="fixed inset-0 confirm-backdrop z-40 flex items-center justify-center p-6"
          style={{ animation: 'fade-in 0.2s ease-out both' }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bento-card max-w-md w-full p-7"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(248,113,113,0.12)', color: 'var(--color-red)' }}>
              <Trash2 size={18} />
            </div>
            <h3 className="text-xl font-bold mb-2 tracking-tight" style={{ color: 'var(--color-text)' }}>
              Delete {pendingDelete.name}?
            </h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text3)' }}>
              This permanently removes the client and all their data from the database. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="btn-shine flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 20px rgba(248,113,113,0.35)' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Clients</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Client Management</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Manage feature flags, suspensions, and platform access for every live AlgoLend deployment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={14} />
              Import from Vercel
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              className="btn-purple btn-shine inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              Onboard client
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total clients',
              value: clients.length,
              sub: `${clients.filter((c) => c.status === 'active').length} active · ${clients.filter((c) => c.status === 'trial').length} trial · ${clients.filter((c) => c.status === 'suspended').length} suspended`,
              subColor: 'var(--color-text3)',
            },
            {
              label: 'Combined MRR',
              value: fmt(clients.filter((c) => c.status === 'active').reduce((s, c) => s + c.monthly_fee_cents / 100, 0)),
              sub: 'From active deployments',
              subColor: 'var(--color-green)',
            },
            {
              label: 'Avg features enabled',
              value: clients.length === 0 ? '—' : Math.round(
                (clients.reduce((s, c) => s + Object.values(c.features).filter(Boolean).length, 0) / clients.length) * 10,
              ) / 10,
              sub: `of ${ALL_FEATURES.length} possible`,
              subColor: 'var(--color-text3)',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bento-card p-5">
              <p className="eyebrow mb-1">{kpi.label}</p>
              <p className="text-3xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{kpi.value}</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: kpi.subColor }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text3)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="field-input pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'active', 'trial', 'suspended'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150"
                style={statusFilter === f ? {
                  background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-text3)',
                  border: '1px solid var(--color-border2)',
                }}
                onMouseEnter={(e) => { if (statusFilter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                onMouseLeave={(e) => { if (statusFilter !== f) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                {f}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="ml-auto flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
            {(['card', 'table'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={`${mode} view`}
                className="px-2.5 py-1.5 transition-colors"
                style={viewMode === mode
                  ? { background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)' }
                  : { background: 'transparent', color: 'var(--color-text3)' }}
              >
                {mode === 'card' ? <LayoutGrid size={14} /> : <Table2 size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Clients list */}
        {loading ? (
          <div className="bento-card p-12 text-center">
            <Loader2 size={20} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-purple2)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading clients…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bento-card p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
              <Building2 size={18} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              {clients.length === 0 ? 'No clients yet' : 'No clients match'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              {clients.length === 0 ? 'Click "Onboard client" to add the first one.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (

          /* ── Table view ───────────────────────────────────── */
          <div className="bento-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  {['Client', 'Status', 'Tier', 'Domain', 'MRR', 'Features', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-semibold hover:underline"
                        style={{ color: 'var(--color-text)' }}>{c.name}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge[c.status]}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          background: c.status === 'active' ? 'var(--color-green)' :
                                      c.status === 'trial'  ? 'var(--color-sky)'   :
                                      c.status === 'suspended' ? 'var(--color-red)' : 'var(--color-text3)',
                        }} />{c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={tierBadge[c.tier]}>{c.tier}</span></td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text3)' }}>
                      {c.domain ?? `${c.subdomain}.algolend.co.za`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-text2)' }}>
                      {fmt(c.monthly_fee_cents / 100)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text3)' }}>
                      {Object.values(c.features).filter(Boolean).length} / {ALL_FEATURES.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openClient(c)} title="Manage features"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}>
                          <Settings2 size={13} />
                        </button>
                        <button onClick={() => toggleKillRequest(c)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                          style={c.status === 'active'
                            ? { background: 'rgba(248,113,113,0.1)', color: 'var(--color-red)', border: '1px solid rgba(248,113,113,0.2)' }
                            : { background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                          {activateLabel(c.status)}
                        </button>
                        <button onClick={() => setPendingDelete(c)} title="Delete client"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (

          /* ── Card view ────────────────────────────────────── */
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((c, i) => (
              <article
                key={c.id}
                className="bento-card p-6 relative"
                style={{ animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 60}ms` }}
              >
                <Link href={`/clients/${c.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`View ${c.name}`} />
                <div className="relative grid grid-cols-[1fr_auto] gap-6 items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{c.name}</h2>
                      <span className={statusBadge[c.status]}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          background: c.status === 'active' ? 'var(--color-green)' :
                                      c.status === 'trial'  ? 'var(--color-sky)'   :
                                      c.status === 'suspended' ? 'var(--color-red)' : 'var(--color-text3)',
                        }} />{c.status}
                      </span>
                      <span className={tierBadge[c.tier]}>{c.tier}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs mb-3 flex-wrap" style={{ color: 'var(--color-text3)' }}>
                      <span className="flex items-center gap-1.5 font-mono">
                        <ExternalLink size={11} />
                        {c.domain ?? `${c.subdomain}.algolend.co.za`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail size={11} />
                        {c.contact_email}
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--color-text2)' }}>
                        {fmt(c.monthly_fee_cents / 100)}
                        <span className="font-normal" style={{ color: 'var(--color-text3)' }}>/ mo</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_FEATURES.filter((f) => f in c.features).map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={c.features[f] ? {
                            background: 'rgba(52,211,153,0.1)',
                            color: 'var(--color-green)',
                            border: '1px solid rgba(52,211,153,0.2)',
                          } : {
                            background: 'var(--color-faint-bg)',
                            color: 'var(--color-text3)',
                            border: '1px solid var(--color-border2)',
                            textDecoration: 'line-through',
                          }}>
                          {FEATURE_LABELS[f]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 shrink-0">
                    <Link href={`/clients/${c.id}`}
                      className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}>
                      View details →
                    </Link>
                    <a href={`https://vercel.com/mint-platforms/${c.slug}`} target="_blank" rel="noreferrer" title="Vercel project"
                      className="p-2 rounded-xl transition-colors"
                      style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}>
                      <svg width="13" height="13" viewBox="0 0 76 65" fill="currentColor"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
                    </a>
                    <a href={`https://${c.domain ?? `${c.subdomain}.algolend.co.za`}`} target="_blank" rel="noreferrer"
                      title="Open portal in new tab"
                      className="p-2 rounded-xl transition-colors"
                      style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}>
                      <ExternalLink size={15} />
                    </a>
                    <button onClick={e => { e.preventDefault(); openClient(c); }} title="Manage features"
                      className="relative z-10 p-2 rounded-xl transition-colors"
                      style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}>
                      <Settings2 size={15} />
                    </button>
                    <button onClick={e => { e.preventDefault(); toggleKillRequest(c); }}
                      className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={c.status === 'active' ? {
                        background: 'rgba(248,113,113,0.1)', color: 'var(--color-red)', border: '1px solid rgba(248,113,113,0.2)',
                      } : {
                        background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = c.status === 'active' ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = c.status === 'active' ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)'; }}>
                      <Power size={13} />
                      {activateLabel(c.status)}
                    </button>
                    <button onClick={e => { e.preventDefault(); setPendingDelete(c); }} title="Delete client"
                      className="relative z-10 p-2 rounded-xl transition-colors"
                      style={{ border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Feature editor slide-over */}
      {selected ? (
        <>
          <div className="slideover-backdrop" onClick={() => setSelected(null)} />
          <div
            className="slideover-panel w-full max-w-md flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-7" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div>
                <p className="eyebrow mb-1">Feature Flags</p>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{selected.name}</h2>
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text3)' }}>
                  {selected.domain ?? `${selected.subdomain}.algolend.co.za`}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg transition-colors"
                aria-label="Close"
                style={{ color: 'var(--color-text3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-fill-subtle)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Toggles */}
            <div className="p-7 space-y-1">
              {ALL_FEATURES.map((flag) => {
                const enabled = editFeatures[flag] ?? false;
                const original = selected.features[flag] ?? false;
                const changed = enabled !== original;
                return (
                  <button
                    key={flag}
                    onClick={() => setEditFeatures((prev) => ({ ...prev, [flag]: !prev[flag] }))}
                    className="w-full flex items-center justify-between gap-4 py-3 px-3 rounded-xl transition-colors text-left"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm" style={{ color: 'var(--color-text2)' }}>{FEATURE_LABELS[flag]}</span>
                      {changed ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-amber)', border: '1px solid rgba(251,191,36,0.2)' }}>
                          pending
                        </span>
                      ) : null}
                    </div>
                    <div
                      role="switch"
                      aria-checked={enabled}
                      className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                      style={{ background: enabled ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* API Quota management */}
            <div className="px-7 pb-5" style={{ borderTop: '1px solid var(--color-border2)', paddingTop: '1.5rem' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">API Quota</p>
                <Link
                  href={`/clients/${selected.id}`}
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--color-violet)' }}
                  onClick={() => setSelected(null)}
                >
                  View usage →
                </Link>
              </div>
              <div className="space-y-3">
                {/* Quota summary — real data only; per-month usage is on the detail page */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)' }}>
                  <span style={{ color: 'var(--color-text3)' }}>Monthly call limit</span>
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                    {(selected.api_quota ?? 10000).toLocaleString()} calls
                  </span>
                </div>

                {/* Quota editor */}
                <div className="flex gap-2 items-end mt-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                      Change limit
                    </label>
                    <select
                      className="field-input cursor-pointer font-mono"
                      defaultValue={selected.api_quota ?? 10000}
                      onChange={async (e) => {
                        const quota = parseInt(e.target.value, 10);
                        await fetch(`/api/clients/${selected.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ api_quota: quota }),
                        });
                        setToast({ kind: 'success', message: `Quota updated to ${quota.toLocaleString()} calls/month.` });
                      }}
                    >
                      {[2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000].map(q => (
                        <option key={q} value={q}>{q.toLocaleString()} calls / mo</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                    onClick={() => setToast({ kind: 'info', message: `Upgrade notification sent to ${selected.contact_email}.` })}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    Notify client
                  </button>
                </div>

                {/* Tier quota guide */}
                <div className="rounded-xl px-3 py-2.5 text-[10px]" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                  <span style={{ color: 'var(--color-text3)' }}>
                    Tier defaults: <span style={{ color: 'var(--color-violet)' }}>Core 2k</span> · <span style={{ color: 'var(--color-violet)' }}>Growth 25k</span> · <span style={{ color: 'var(--color-violet)' }}>Enterprise 250k</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="p-7 sticky bottom-0 backdrop-blur"
              style={{
                borderTop: '1px solid var(--color-border2)',
                background: 'var(--color-footer-bg)',
              }}
            >
              <div
                className="rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
              >
                <Zap size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-amber)' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-amber)' }}>
                  Saving updates <code className="font-mono px-1 rounded" style={{ background: 'rgba(251,191,36,0.1)' }}>VITE_FEATURES</code> via the Vercel API and triggers a redeployment. Live within ~60 seconds.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveFeatures}
                  disabled={saving}
                  className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save & Deploy'}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </Shell>
  );
}
