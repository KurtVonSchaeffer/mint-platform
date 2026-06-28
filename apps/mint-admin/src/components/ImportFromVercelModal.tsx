'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2, CheckCircle2, AlertCircle, Search, Download, KeyRound } from 'lucide-react';

interface VercelProject {
  id:    string;
  name:  string;
  alias: string[];
  slug:  string | null;
}

interface ImportRow {
  project:       VercelProject;
  clientName:    string;
  slug:          string;
  contactEmail:  string;
  tier:          'core' | 'enterprise';
  monthlyFee:    string;
  selected:      boolean;
  state:         'idle' | 'saving' | 'done' | 'error';
  error?:        string;
}

interface Props {
  onClose:    () => void;
  onImported: (count: number) => void;
}

const TIER_OPTIONS: { id: 'core' | 'enterprise'; label: string; fee: string }[] = [
  { id: 'core',       label: 'Starter',    fee: '1999'  },
  { id: 'enterprise', label: 'Enterprise', fee: '14999' },
];

export function ImportFromVercelModal({ onClose, onImported }: Props) {
  const [loading, setLoading]   = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [rows, setRows]         = useState<ImportRow[]>([]);
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);

  // ── Load Vercel projects ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/vercel/projects');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Unknown error');

        const initialRows: ImportRow[] = (json.projects as VercelProject[]).map((p) => ({
          project:      p,
          clientName:   p.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          slug:         p.slug ?? p.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          contactEmail: '',
          tier:         'core',
          monthlyFee:   '1999',
          selected:     !!p.slug,   // auto-select known client projects
          state:        'idle',
        }));

        setRows(initialRows);
      } catch (e: unknown) {
        setFetchErr(e instanceof Error ? e.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update(id: string, patch: Partial<ImportRow>) {
    setRows((prev) => prev.map((r) => r.project.id === id ? { ...r, ...patch } : r));
  }

  const filtered    = rows.filter((r) =>
    r.clientName.toLowerCase().includes(search.toLowerCase()) ||
    r.slug.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedRows = rows.filter((r) => r.selected && r.state !== 'done');

  async function importSelected() {
    if (selectedRows.length === 0) return;
    setSaving(true);

    let imported = 0;

    for (const row of selectedRows) {
      update(row.project.id, { state: 'saving' });

      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:                row.clientName,
            slug:                row.slug,
            contact_email:       row.contactEmail || `admin@${row.slug}.co.za`,
            tier:                row.tier,
            monthly_fee_cents:   Math.round(parseFloat(row.monthlyFee || '0') * 100),
            primary_color:       '#7C3AED',
            secondary_color:     '#1A1F36',
            features:            {},
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

        update(row.project.id, { state: 'done' });
        imported++;
      } catch (e: unknown) {
        update(row.project.id, {
          state: 'error',
          error: e instanceof Error ? e.message : 'Import failed',
        });
      }
    }

    setSaving(false);
    if (imported > 0) onImported(imported);
  }

  const allDone = selectedRows.length > 0 && selectedRows.every((r) => r.state === 'done');

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,7,13,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bento-card w-full max-w-3xl max-h-[90vh] flex flex-col"
        style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border2)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              Import from Vercel
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text3)' }}>
              Discover existing deployments and register them as managed clients.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors cursor-pointer"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Querying Vercel API…</p>
            </div>
          )}

          {/* Fetch error */}
          {fetchErr && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.2)' }}>
              <div className="flex items-start gap-3 p-4" style={{ background: 'rgba(248,113,113,0.07)' }}>
                <AlertCircle size={16} style={{ color: 'var(--color-red)', marginTop: 1 }} className="shrink-0" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-red)' }}>Could not load Vercel projects</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text2)' }}>{fetchErr}</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(248,113,113,0.12)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>Fix it in 2 steps</p>
                <div className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--color-text3)' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5" style={{ background: 'rgba(124,58,237,0.3)', color: '#A78BFA' }}>1</span>
                  <span>
                    Create a token at{' '}
                    <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer"
                      className="font-semibold underline" style={{ color: 'var(--color-violet)' }}>
                      vercel.com/account/tokens
                    </a>
                    {' '}with full scope on the AlgoLend team
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--color-text3)' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5" style={{ background: 'rgba(124,58,237,0.3)', color: '#A78BFA' }}>2</span>
                  <span>
                    Add <code className="font-mono px-1 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: '#C4B5FD' }}>VERCEL_API_TOKEN</code> and{' '}
                    <code className="font-mono px-1 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: '#C4B5FD' }}>VERCEL_TEAM_ID</code>{' '}
                    to{' '}
                    <a href="https://vercel.com/kurtvonschaeffers-projects/admin/settings/environment-variables" target="_blank" rel="noreferrer"
                      className="font-semibold underline" style={{ color: 'var(--color-violet)' }}>
                      project env vars
                    </a>
                    {' '}for Production, Preview & Development, then redeploy
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <KeyRound size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <code className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    VERCEL_TEAM_ID = team_ujhTvHHfrPHhAwn1nKbjVgck
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          {!loading && !fetchErr && rows.length > 0 && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
                <input
                  className="field-input pl-9"
                  placeholder="Filter projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Project list */}
              <div className="space-y-3">
                {filtered.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--color-text3)' }}>No projects match.</p>
                )}
                {filtered.map((row) => (
                  <div
                    key={row.project.id}
                    className="rounded-xl p-4 transition-all"
                    style={{
                      border: row.selected
                        ? '1px solid rgba(124,58,237,0.35)'
                        : '1px solid var(--color-border2)',
                      background: row.selected ? 'rgba(124,58,237,0.04)' : 'transparent',
                    }}
                  >
                    {/* Top row: checkbox + project info + status */}
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => update(row.project.id, { selected: !row.selected })}
                        disabled={row.state === 'done'}
                        className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 cursor-pointer transition-all"
                        style={row.selected ? {
                          background: 'var(--color-purple)',
                          borderColor: 'var(--color-purple)',
                        } : {
                          background: 'transparent',
                          borderColor: 'var(--color-border3)',
                        }}
                      >
                        {row.selected && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            {row.project.name}
                          </p>
                          {row.project.slug && (
                            <span
                              className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
                            >
                              {row.project.slug}.algolend.co.za
                            </span>
                          )}
                          {row.project.alias.slice(0, 2).filter(a => !a.includes('algolend')).map(a => (
                            <span key={a} className="font-mono text-[10px]" style={{ color: 'var(--color-text3)' }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* State indicator */}
                      <div className="shrink-0">
                        {row.state === 'saving' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-violet)' }} />}
                        {row.state === 'done'   && <CheckCircle2 size={16} style={{ color: 'var(--color-green)' }} />}
                        {row.state === 'error'  && (
                          <span title={row.error}>
                            <AlertCircle size={16} style={{ color: 'var(--color-red)' }} />
                          </span>
                        )}
                        {row.project.alias.some(a => a.includes('algolend')) && (
                          <a
                            href={`https://${row.project.slug ?? row.project.name}.algolend.co.za`}
                            target="_blank" rel="noreferrer"
                            className="p-1 rounded-lg ml-1 inline-flex transition-colors"
                            style={{ color: 'var(--color-text3)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Error */}
                    {row.state === 'error' && (
                      <p className="text-xs mt-2 ml-8" style={{ color: 'var(--color-red)' }}>{row.error}</p>
                    )}

                    {/* Done */}
                    {row.state === 'done' && (
                      <p className="text-xs mt-2 ml-8 font-semibold" style={{ color: 'var(--color-green)' }}>
                        Registered as a managed client ✓
                      </p>
                    )}

                    {/* Editable fields (only when selected + not done) */}
                    {row.selected && row.state !== 'done' && (
                      <div className="mt-3 ml-8 grid grid-cols-2 gap-2">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                            Display name
                          </label>
                          <input
                            className="field-input"
                            value={row.clientName}
                            onChange={(e) => update(row.project.id, { clientName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                            Slug
                          </label>
                          <input
                            className="field-input font-mono"
                            value={row.slug}
                            onChange={(e) => update(row.project.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                            Contact email
                          </label>
                          <input
                            type="email"
                            className="field-input"
                            placeholder={`admin@${row.slug}.co.za`}
                            value={row.contactEmail}
                            onChange={(e) => update(row.project.id, { contactEmail: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                            Tier
                          </label>
                          <select
                            className="field-input cursor-pointer"
                            value={row.tier}
                            onChange={(e) => {
                              const t = e.target.value as ImportRow['tier'];
                              const fee = TIER_OPTIONS.find(o => o.id === t)?.fee ?? '1999';
                              update(row.project.id, { tier: t, monthlyFee: fee });
                            }}
                          >
                            {TIER_OPTIONS.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                            Monthly fee (ZAR)
                          </label>
                          <input
                            type="number"
                            className="field-input font-mono"
                            value={row.monthlyFee}
                            onChange={(e) => update(row.project.id, { monthlyFee: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Info box about separate DBs */}
              <div
                className="rounded-xl px-4 py-3 text-xs leading-relaxed"
                style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', color: 'var(--color-sky)' }}
              >
                <strong>Note on separate databases:</strong> Each client's Supabase database stays exactly where it is — mint-admin only stores metadata (name, slug, tier, billing, feature flags). To pull historical loan data for reporting, use the{' '}
                <a href="/migration" className="underline font-semibold">Migration tool</a> after registering.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !fetchErr && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              {selectedRows.filter(r => r.state !== 'done').length} selected
              {' · '}
              {rows.filter(r => r.project.slug).length} client project{rows.filter(r => r.project.slug).length !== 1 ? 's' : ''} detected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {allDone ? 'Close' : 'Cancel'}
              </button>
              {!allDone && (
                <button
                  onClick={importSelected}
                  disabled={saving || selectedRows.filter(r => r.state !== 'done').length === 0}
                  className="btn-purple btn-shine inline-flex items-center gap-1.5"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Importing…</>
                  ) : (
                    <><Download size={14} /> Import {selectedRows.filter(r => r.state !== 'done').length} client{selectedRows.filter(r => r.state !== 'done').length !== 1 ? 's' : ''}</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
