'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { Zap, Save, RotateCcw, Loader2 } from 'lucide-react';

const ALL_FEATURES = [
  { key: 'open_banking',       label: 'Open Banking (TruID)',      description: 'Bank statement retrieval + affordability metrics' },
  { key: 'e_contracts',        label: 'E-Contracts',                description: 'Digital agreement signing + certificates' },
  { key: 'credit_scoring',     label: 'Credit Scoring (Experian)',  description: 'Automated credit bureau pulls' },
  { key: 'sacrra_bureau',      label: 'SACRRA Bureau Reporting',    description: 'Monthly NCA-compliant submissions' },
  { key: 'multi_branch',       label: 'Multi-Branch Support',       description: 'Branch manager role with scoped application views' },
  { key: 'working_capital',    label: 'Working Capital Product',    description: 'Short-term revolving credit' },
  { key: 'term_loans',         label: 'Term Loans Product',         description: 'Fixed-term instalment loans' },
  { key: 'invoice_finance',    label: 'Invoice Finance',            description: 'Debtor book and invoice discounting' },
  { key: 'whatsapp_notify',    label: 'WhatsApp Notifications',     description: 'Status updates via WhatsApp Business API' },
  { key: 'advanced_analytics', label: 'Advanced Analytics',         description: 'Portfolio performance + cohort analysis' },
] as const;

type FeatureKey = (typeof ALL_FEATURES)[number]['key'];

interface ClientFeatures {
  id:       string;
  name:     string;
  slug:     string;
  tier:     'core' | 'growth' | 'enterprise';
  features: Record<string, boolean>;
}

function featureMap(featureArr: Array<{ flag: string; enabled: boolean }>): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const f of ALL_FEATURES) map[f.key] = false;
  for (const f of featureArr) map[f.flag] = f.enabled;
  return map;
}

type PendingChanges = Record<string, Record<FeatureKey, boolean>>;

const tierBadge: Record<string, string> = {
  core:       'badge badge-core',
  growth:     'badge badge-growth',
  enterprise: 'badge badge-enterprise',
};

export default function FeaturesPage() {
  const [saved,        setSaved]        = useState<ClientFeatures[]>([]);
  const [pending,      setPending]      = useState<PendingChanges>({});
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ kind: ToastKind; message: string } | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('fetch failed');
      const { clients } = await res.json();
      if (Array.isArray(clients)) {
        const mapped = clients.map((c: Record<string, unknown>) => {
          const featureArr = (c.client_features as Array<{ flag: string; enabled: boolean }> | undefined) ?? [];
          const tier = (['core', 'growth', 'enterprise'] as const).find(t => t === c.tier) ?? 'core';
          return {
            id:       String(c.id),
            name:     String(c.name),
            slug:     String(c.slug),
            tier,
            features: featureMap(featureArr),
          };
        });
        setSaved(mapped);
        setSelectedSlug(prev => prev ?? mapped[0]?.slug ?? null);
      }
    } catch {
      setToast({ kind: 'error', message: 'Could not load clients — check Supabase env vars.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  function effectiveValue(slug: string, key: FeatureKey): boolean {
    if (pending[slug] && key in pending[slug]) return pending[slug][key];
    return saved.find((c) => c.slug === slug)?.features[key] ?? false;
  }

  function toggle(slug: string, key: FeatureKey) {
    const current  = effectiveValue(slug, key);
    const original = saved.find((c) => c.slug === slug)?.features[key] ?? false;
    const newValue = !current;

    setPending((prev) => {
      const next = { ...prev };
      const slugPending = { ...(next[slug] ?? {}) } as Record<FeatureKey, boolean>;
      if (newValue === original) {
        delete slugPending[key];
        if (Object.keys(slugPending).length === 0) delete next[slug];
        else next[slug] = slugPending;
      } else {
        slugPending[key] = newValue;
        next[slug] = slugPending;
      }
      return next;
    });
  }

  const pendingCount = Object.values(pending).reduce((sum, m) => sum + Object.keys(m).length, 0);

  async function saveAll() {
    if (pendingCount === 0 || saving) return;
    setSaving(true);
    const errors: string[] = [];

    await Promise.allSettled(
      Object.entries(pending).map(async ([slug, changes]) => {
        const client = saved.find((c) => c.slug === slug);
        if (!client) return;

        // Build merged feature map: current saved + pending changes
        const merged: Record<string, boolean> = { ...client.features, ...changes };

        const res = await fetch(`/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: merged }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          errors.push(body.error ?? `Save failed for ${client.name}`);
        }
      }),
    );

    if (errors.length > 0) {
      setToast({ kind: 'error', message: errors[0] });
    } else {
      // Commit pending into saved
      setSaved((prev) =>
        prev.map((c) => {
          if (!(c.slug in pending)) return c;
          return { ...c, features: { ...c.features, ...pending[c.slug] } };
        }),
      );
      setToast({ kind: 'success', message: `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} saved. Vercel env updated — live in ~60s.` });
      setPending({});
    }
    setSaving(false);
  }

  function discardAll() {
    if (pendingCount === 0) return;
    setPending({});
    setToast({ kind: 'info', message: `${pendingCount} pending ${pendingCount === 1 ? 'change' : 'changes'} discarded.` });
  }

  function isPending(slug: string, key: FeatureKey): boolean {
    return slug in pending && key in pending[slug];
  }

  return (
    <Shell>
      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Per-client feature flags</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Features</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Toggle features per client. Changes deploy via the Vercel API as{' '}
              <code
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}
              >
                MINT_ENABLED_FEATURES
              </code>{' '}
              env var updates.
            </p>
          </div>
        </div>

        {/* Sticky save bar */}
        {pendingCount > 0 && (
          <div
            className="amber-banner bento-card p-4 flex items-center justify-between gap-4"
            style={{
              borderColor: 'rgba(251,191,36,0.25)',
              animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-amber)' }}
              >
                <Zap size={15} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                  Across {Object.keys(pending).length} {Object.keys(pending).length === 1 ? 'client' : 'clients'} — not yet saved.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={discardAll}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-text3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <RotateCcw size={12} />
                Discard
              </button>
              <button
                onClick={saveAll}
                disabled={saving}
                className="btn-purple btn-shine inline-flex items-center gap-1.5 !py-2 !text-xs disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : `Save & deploy (${pendingCount})`}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bento-card p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-purple2)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading clients…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && saved.length === 0 && (
          <div className="bento-card p-12 flex flex-col items-center justify-center gap-3 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: 'rgba(124,58,237,0.08)' }}
            >
              <Zap size={20} style={{ color: 'var(--color-violet)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No clients yet</p>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              Add your first client to start managing feature flags.
            </p>
          </div>
        )}

        {/* Client selector */}
        {!loading && saved.length > 0 && (() => {
          const selected = saved.find(c => c.slug === selectedSlug) ?? null;
          return (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium shrink-0" style={{ color: 'var(--color-text2)' }}>Client</label>
                <select
                  className="field-input max-w-xs"
                  value={selectedSlug ?? ''}
                  onChange={e => setSelectedSlug(e.target.value || null)}
                >
                  {saved.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                {selected && <span className={tierBadge[selected.tier]}>{selected.tier}</span>}
                {selected && pending[selected.slug] && Object.keys(pending[selected.slug]).length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-amber)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    {Object.keys(pending[selected.slug]).length} unsaved
                  </span>
                )}
              </div>

              {/* Feature list */}
              {selected && (
                <div className="bento-card p-0 overflow-hidden">
                  {ALL_FEATURES.map((feat, i) => {
                    const enabled = effectiveValue(selected.slug, feat.key);
                    const changed = isPending(selected.slug, feat.key);
                    return (
                      <div
                        key={feat.key}
                        className="flex items-center justify-between gap-4 px-6 py-4 transition-colors"
                        style={{
                          borderBottom: i < ALL_FEATURES.length - 1 ? '1px solid var(--color-row-border)' : 'none',
                          background: changed ? 'rgba(251,191,36,0.03)' : 'transparent',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = changed ? 'rgba(251,191,36,0.05)' : 'var(--color-card-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = changed ? 'rgba(251,191,36,0.03)' : 'transparent'; }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{feat.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{feat.description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {changed && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-amber)', border: '1px solid rgba(251,191,36,0.2)' }}>
                              pending
                            </span>
                          )}
                          <button
                            onClick={() => toggle(selected.slug, feat.key)}
                            role="switch"
                            aria-checked={enabled}
                            aria-label={`${enabled ? 'Disable' : 'Enable'} ${feat.label}`}
                            className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                            style={{ background: enabled ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)' }}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        {/* Info note */}
        {!loading && saved.length > 0 && (
          <div
            className="rounded-2xl px-5 py-4 flex items-start gap-3"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}
          >
            <Zap size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-amber)' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-amber)' }}>
              Saving changes upserts each client's feature flags in Supabase and, if a{' '}
              <code className="font-mono px-1 rounded" style={{ background: 'rgba(251,191,36,0.12)' }}>vercel_project_id</code>{' '}
              is set, pushes{' '}
              <code className="font-mono px-1 rounded" style={{ background: 'rgba(251,191,36,0.12)' }}>MINT_ENABLED_FEATURES</code>{' '}
              via the Vercel API and triggers a redeployment. Live within ~60 seconds.
              Toggles with an <span className="font-bold">amber ring</span> are pending.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}
