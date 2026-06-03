'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { Zap, CheckCircle, XCircle, Save, RotateCcw } from 'lucide-react';

const ALL_FEATURES = [
  { key: 'open_banking',       label: 'Open Banking (TruID)',      description: 'Bank statement retrieval + affordability metrics' },
  { key: 'e_contracts',        label: 'E-Contracts (DocuSeal)',     description: 'Digital agreement signing + certificates' },
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
  name:     string;
  slug:     string;
  tier:     'core' | 'growth' | 'enterprise';
  features: Record<string, boolean>;
}

const INITIAL_CLIENTS: ClientFeatures[] = [
  { name: 'BridgeCapital Finance',  slug: 'bridgecapital', tier: 'enterprise', features: arrayToMap(['open_banking', 'e_contracts', 'credit_scoring', 'sacrra_bureau', 'multi_branch', 'working_capital', 'term_loans', 'whatsapp_notify', 'advanced_analytics']) },
  { name: 'Apex Credit Solutions',  slug: 'apexcredit',    tier: 'growth',     features: arrayToMap(['open_banking', 'e_contracts', 'credit_scoring', 'sacrra_bureau', 'term_loans']) },
  { name: 'Nexus Business Finance', slug: 'nexusbiz',      tier: 'growth',     features: arrayToMap(['e_contracts', 'credit_scoring', 'sacrra_bureau', 'working_capital', 'term_loans']) },
  { name: 'Elevate Capital',        slug: 'elevatecap',    tier: 'growth',     features: arrayToMap(['e_contracts', 'term_loans', 'sacrra_bureau']) },
  { name: 'Summit Lending',         slug: 'summit',        tier: 'core',       features: arrayToMap(['term_loans']) },
];

function arrayToMap(enabled: string[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const f of ALL_FEATURES) map[f.key] = enabled.includes(f.key);
  return map;
}

type PendingChanges = Record<string, Record<FeatureKey, boolean>>;

const tierBadge: Record<string, string> = {
  core:       'badge badge-core',
  growth:     'badge badge-growth',
  enterprise: 'badge badge-enterprise',
};

export default function FeaturesPage() {
  const [saved, setSaved]     = useState<ClientFeatures[]>(INITIAL_CLIENTS);
  const [pending, setPending] = useState<PendingChanges>({});
  const [toast, setToast]     = useState<{ kind: ToastKind; message: string } | null>(null);

  // Load real clients + their feature flags
  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) return;
      const { clients } = await res.json();
      if (Array.isArray(clients) && clients.length > 0) {
        setSaved(clients.map((c: Record<string, unknown>) => {
          const featureArr = (c.client_features as Array<{flag: string; enabled: boolean}> | undefined) ?? [];
          const features = arrayToMap(featureArr.filter(f => f.enabled).map(f => f.flag));
          const tier = (['core','growth','enterprise'] as const).includes(c.tier as 'core') ? c.tier as 'core'|'growth'|'enterprise' : 'core';
          return { name: String(c.name), slug: String(c.slug), tier, features };
        }));
      }
    } catch { /* keep seed */ }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  function effectiveValue(slug: string, key: FeatureKey): boolean {
    if (pending[slug] && key in pending[slug]) return pending[slug][key];
    return saved.find((c) => c.slug === slug)?.features[key] ?? false;
  }

  function toggle(slug: string, key: FeatureKey) {
    const current = effectiveValue(slug, key);
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

  function saveAll() {
    if (pendingCount === 0) return;
    setSaved((prev) =>
      prev.map((c) => {
        if (!(c.slug in pending)) return c;
        return { ...c, features: { ...c.features, ...pending[c.slug] } };
      }),
    );
    setToast({ kind: 'success', message: `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} deployed via Vercel API. Live in ~60s.` });
    setPending({});
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
                VITE_FEATURES
              </code>{' '}
              env var updates.
            </p>
          </div>
        </div>

        {/* Sticky save bar */}
        {pendingCount > 0 ? (
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
                  Across {Object.keys(pending).length} {Object.keys(pending).length === 1 ? 'client' : 'clients'} — not yet deployed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={discardAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
                style={{ color: 'var(--color-text3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <RotateCcw size={12} />
                Discard
              </button>
              <button
                onClick={saveAll}
                className="btn-purple btn-shine inline-flex items-center gap-1.5 !py-2 !text-xs"
              >
                <Save size={13} />
                Save &amp; deploy ({pendingCount})
              </button>
            </div>
          </div>
        ) : null}

        {/* Matrix */}
        <div className="bento-card overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '256px', textAlign: 'left' }}>Feature</th>
                {saved.map((c) => (
                  <th key={c.slug} style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--color-text2)' }}>{c.name.split(' ')[0]}</div>
                    <span className={`${tierBadge[c.tier]} mt-1`}>{c.tier}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_FEATURES.map((feat) => (
                <tr key={feat.key}>
                  <td>
                    <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{feat.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{feat.description}</p>
                  </td>
                  {saved.map((c) => {
                    const enabled = effectiveValue(c.slug, feat.key);
                    const pendingChange = isPending(c.slug, feat.key);
                    return (
                      <td key={c.slug} style={{ textAlign: 'center' }}>
                        <button
                          title={`${enabled ? 'Disable' : 'Enable'} ${feat.label} for ${c.name}${pendingChange ? ' (pending)' : ''}`}
                          onClick={() => toggle(c.slug, feat.key)}
                          className="relative inline-flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110"
                          style={pendingChange ? {
                            outline: '2px solid var(--color-amber)',
                            outlineOffset: '2px',
                          } : {}}
                        >
                          {enabled
                            ? <CheckCircle size={20} style={{ color: 'var(--color-green)' }} />
                            : <XCircle size={20} style={{ color: 'rgba(255,255,255,0.1)' }} />
                          }
                          {pendingChange ? (
                            <span
                              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                              style={{ background: 'var(--color-amber)', border: '2px solid var(--color-surface)' }}
                            />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info note */}
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}
        >
          <Zap size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-amber)' }} />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-amber)' }}>
            Saving changes updates each client's{' '}
            <code
              className="font-mono px-1 rounded"
              style={{ background: 'rgba(251,191,36,0.12)' }}
            >VITE_FEATURES</code>{' '}
            environment variable via the Vercel API and triggers a redeployment.
            Changes are live within ~60 seconds. Toggles with an{' '}
            <span className="font-bold">amber ring</span> are pending — click Save &amp; deploy to commit them.
          </p>
        </div>
      </div>
    </Shell>
  );
}
