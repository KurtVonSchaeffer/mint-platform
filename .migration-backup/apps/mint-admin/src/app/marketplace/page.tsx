'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  Store, Plus, X, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, Zap, Save,
} from 'lucide-react';

interface RateBand {
  minScore:       number;
  rateAdjustment: number | null;  // null = decline
}

interface LenderPolicy {
  id:                    string;
  client_id:             string;
  display_name:          string;
  tagline:               string | null;
  avg_turnaround_days:   number;
  min_credit_score:      number;
  max_dsr_pct:           number;
  min_amount:            number;
  max_amount:            number;
  min_years_in_operation: number;
  require_id_verified:   boolean;
  max_open_defaults:     number;
  base_rate_pct:         number;
  initiation_fee_pct:    number;
  monthly_service_fee:   number;
  rate_bands:            RateBand[];
  active:                boolean;
  clients: { id: string; name: string; slug: string; tier: string; status: string } | null;
}

interface ClientOption { id: string; name: string; slug: string; tier: string; }

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

const EMPTY_POLICY = {
  display_name: '', tagline: '', avg_turnaround_days: 2,
  min_credit_score: 580, max_dsr_pct: 45,
  min_amount: 10000, max_amount: 500000,
  min_years_in_operation: 1, require_id_verified: true, max_open_defaults: 0,
  base_rate_pct: 28, initiation_fee_pct: 3, monthly_service_fee: 69,
  rate_bands: [
    { minScore: 700, rateAdjustment: -3 },
    { minScore: 650, rateAdjustment: -1 },
    { minScore: 580, rateAdjustment:  0 },
  ] as RateBand[],
  active: false,
};

export default function MarketplacePage() {
  const [policies, setPolicies]       = useState<LenderPolicy[]>([]);
  const [clients, setClients]         = useState<ClientOption[]>([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState<{ kind: ToastKind; message: string } | null>(null);
  const [editing, setEditing]         = useState<LenderPolicy | null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [draft, setDraft]             = useState<typeof EMPTY_POLICY & { client_id?: string }>(EMPTY_POLICY);
  const [saving, setSaving]           = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [polRes, cliRes] = await Promise.all([
      fetch('/api/lender-policies'),
      fetch('/api/clients'),
    ]);
    if (polRes.ok)  { const d = await polRes.json(); setPolicies(d.policies ?? []); }
    if (cliRes.ok)  { const d = await cliRes.json(); setClients((d.clients ?? []).map((c: ClientOption) => ({ id: c.id, name: c.name, slug: c.slug, tier: c.tier }))); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setIsNew(true);
    setEditing(null);
    setDraft(EMPTY_POLICY);
    setNewClientId('');
  }

  function openEdit(p: LenderPolicy) {
    setEditing(p);
    setIsNew(false);
    setDraft({
      display_name:          p.display_name,
      tagline:               p.tagline ?? '',
      avg_turnaround_days:   p.avg_turnaround_days,
      min_credit_score:      p.min_credit_score,
      max_dsr_pct:           p.max_dsr_pct,
      min_amount:            p.min_amount,
      max_amount:            p.max_amount,
      min_years_in_operation: p.min_years_in_operation,
      require_id_verified:   p.require_id_verified,
      max_open_defaults:     p.max_open_defaults,
      base_rate_pct:         p.base_rate_pct,
      initiation_fee_pct:    p.initiation_fee_pct,
      monthly_service_fee:   p.monthly_service_fee,
      rate_bands:            p.rate_bands.length ? p.rate_bands : EMPTY_POLICY.rate_bands,
      active:                p.active,
    });
  }

  function closePanel() { setEditing(null); setIsNew(false); }

  async function save() {
    setSaving(true);
    const body = isNew
      ? { ...draft, client_id: newClientId, display_name: draft.display_name || clients.find(c => c.id === newClientId)?.name || 'Lender' }
      : { ...draft };

    const url    = isNew ? '/api/lender-policies' : `/api/lender-policies/${editing!.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();

    if (!res.ok) {
      setToast({ kind: 'error', message: json.error ?? 'Save failed' });
    } else {
      setToast({ kind: 'success', message: `Policy ${isNew ? 'created' : 'updated'} — ${draft.active ? 'now live in the Mint marketplace' : 'saved as inactive'}.` });
      closePanel();
      load();
    }
    setSaving(false);
  }

  async function toggleActive(p: LenderPolicy) {
    const next = !p.active;
    setPolicies(prev => prev.map(x => x.id === p.id ? { ...x, active: next } : x));
    await fetch(`/api/lender-policies/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    });
    setToast({ kind: next ? 'success' : 'info', message: `${p.display_name} is now ${next ? 'live in' : 'paused from'} the Mint marketplace.` });
  }

  function updateBand(i: number, field: 'minScore' | 'rateAdjustment', val: string) {
    const bands = [...draft.rate_bands];
    if (field === 'rateAdjustment') {
      bands[i] = { ...bands[i], rateAdjustment: val === 'decline' ? null : parseFloat(val) || 0 };
    } else {
      bands[i] = { ...bands[i], minScore: parseInt(val, 10) || 0 };
    }
    setDraft(d => ({ ...d, rate_bands: bands }));
  }

  function addBand()        { setDraft(d => ({ ...d, rate_bands: [...d.rate_bands, { minScore: 0, rateAdjustment: 0 }] })); }
  function removeBand(i: number) { setDraft(d => ({ ...d, rate_bands: d.rate_bands.filter((_, j) => j !== i) })); }

  const clientsWithoutPolicy = clients.filter(c => !policies.find(p => p.client_id === c.id));
  const panelOpen = isNew || !!editing;

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      {/* Slide-over */}
      {panelOpen && (
        <>
          <div className="slideover-backdrop" onClick={closePanel} />
          <div className="slideover-panel w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 shrink-0" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div>
                <p className="eyebrow mb-1">{isNew ? 'New policy' : 'Edit policy'}</p>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  {isNew ? 'Configure Lender Policy' : editing?.display_name}
                </h3>
                {!isNew && editing?.clients && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{editing.clients.name}</p>
                )}
              </div>
              <button onClick={closePanel} className="cursor-pointer p-1.5 rounded-lg" style={{ color: 'var(--color-text3)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Product type notice */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--color-violet)' }}>
                <span className="font-bold">Product type:</span> Unsecured personal loan — this marketplace only supports unsecured credit.
              </div>

              {/* Client selector (new only) */}
              {isNew && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Client</label>
                  <select className="field-input cursor-pointer" value={newClientId} onChange={e => setNewClientId(e.target.value)}>
                    <option value="">Select a client…</option>
                    {clientsWithoutPolicy.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>
                    ))}
                  </select>
                  {clientsWithoutPolicy.length === 0 && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-amber)' }}>All clients already have a policy configured.</p>
                  )}
                </div>
              )}

              {/* Display */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Display name (shown to consumers)</label>
                  <input className="field-input" value={draft.display_name} onChange={e => setDraft(d => ({ ...d, display_name: e.target.value }))} placeholder="e.g. BridgeCapital Finance" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Tagline</label>
                  <input className="field-input" value={draft.tagline ?? ''} onChange={e => setDraft(d => ({ ...d, tagline: e.target.value }))} placeholder="e.g. Fast decisions for established businesses" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Avg turnaround (days)</label>
                  <input type="number" className="field-input" value={draft.avg_turnaround_days} onChange={e => setDraft(d => ({ ...d, avg_turnaround_days: +e.target.value }))} min={1} />
                </div>
              </div>

              {/* Eligibility */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Eligibility gates</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'min_credit_score',       label: 'Min credit score',         min: 0,   max: 999, step: 1  },
                    { key: 'max_dsr_pct',             label: 'Max DSR (%)',              min: 0,   max: 100, step: 0.5 },
                    { key: 'min_amount',              label: 'Min loan amount (R)',      min: 0,   max: undefined, step: 1000 },
                    { key: 'max_amount',              label: 'Max loan amount (R)',      min: 0,   max: undefined, step: 10000 },
                    { key: 'min_years_in_operation',  label: 'Min years operating',      min: 0,   max: 20,  step: 1  },
                    { key: 'max_open_defaults',       label: 'Max open defaults',        min: 0,   max: 10,  step: 1  },
                  ].map(({ key, label, min, max, step }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>{label}</label>
                      <input
                        type="number" className="field-input font-mono"
                        value={draft[key as keyof typeof draft] as number}
                        min={min} max={max} step={step}
                        onChange={e => setDraft(d => ({ ...d, [key]: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  ))}
                  <div className="col-span-2 flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                    <span className="text-sm" style={{ color: 'var(--color-text2)' }}>Require ID verified</span>
                    <button
                      role="switch" aria-checked={draft.require_id_verified}
                      onClick={() => setDraft(d => ({ ...d, require_id_verified: !d.require_id_verified }))}
                      className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                      style={{ background: draft.require_id_verified ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.require_id_verified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text3)' }}>Pricing</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'base_rate_pct',       label: 'Base rate (% p.a.)', step: 0.5 },
                    { key: 'initiation_fee_pct',  label: 'Initiation fee (%)', step: 0.5 },
                    { key: 'monthly_service_fee', label: 'Monthly fee (R)',    step: 10  },
                  ].map(({ key, label, step }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>{label}</label>
                      <input type="number" className="field-input font-mono" value={draft[key as keyof typeof draft] as number} step={step} min={0}
                        onChange={e => setDraft(d => ({ ...d, [key]: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate bands */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Rate bands (by credit score)</p>
                  <button onClick={addBand} className="inline-flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--color-violet)' }}>
                    <Plus size={11} /> Add band
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 mb-1">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--color-text3)' }}>Min score</span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--color-text3)' }}>Rate adjustment</span>
                    <span />
                  </div>
                  {draft.rate_bands.map((band, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <input type="number" className="field-input font-mono text-sm" value={band.minScore} min={0} max={999}
                        onChange={e => updateBand(i, 'minScore', e.target.value)} />
                      <select className="field-input cursor-pointer text-sm"
                        value={band.rateAdjustment === null ? 'decline' : String(band.rateAdjustment)}
                        onChange={e => updateBand(i, 'rateAdjustment', e.target.value)}
                      >
                        <option value="decline">Decline</option>
                        {[-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8].map(v => (
                          <option key={v} value={v}>{v > 0 ? `+${v}%` : v === 0 ? 'Base rate' : `${v}%`}</option>
                        ))}
                      </select>
                      <button onClick={() => removeBand(i)} className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors"
                        style={{ color: 'var(--color-text3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-red)'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>
                    Bands evaluated top-to-bottom. First match where score ≥ minScore wins.
                  </p>
                </div>
              </div>

              {/* Active toggle */}
              <div
                className="flex items-center justify-between py-3 px-4 rounded-xl"
                style={{ background: draft.active ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${draft.active ? 'rgba(52,211,153,0.2)' : 'var(--color-border2)'}` }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: draft.active ? 'var(--color-green)' : 'var(--color-text)' }}>
                    {draft.active ? 'Live in Mint marketplace' : 'Inactive — not in marketplace'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                    {draft.active ? 'This lender appears in all new consumer quote results.' : 'Toggle on to include in consumer quote evaluations.'}
                  </p>
                </div>
                <button
                  role="switch" aria-checked={draft.active}
                  onClick={() => setDraft(d => ({ ...d, active: !d.active }))}
                  className="relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0"
                  style={{ background: draft.active ? 'var(--color-green)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 shrink-0 flex gap-2" style={{ borderTop: '1px solid var(--color-border2)', background: 'var(--color-footer-bg)' }}>
              <button onClick={closePanel} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
              <button
                onClick={save}
                disabled={saving || (isNew && !newClientId)}
                className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save policy'}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Mint Marketplace</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Lender Policies</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Each active policy is automatically included in every consumer quote evaluation — plug and play.
            </p>
          </div>
          <button onClick={openNew} className="btn-purple btn-shine inline-flex items-center gap-1.5">
            <Plus size={15} /> Add lender policy
          </button>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { n: '1', label: 'Consumer applies',    desc: 'Fills form on mint.algolend.co.za',       color: 'var(--color-violet)' },
            { n: '2', label: 'One credit check',    desc: 'Experian + SureSystems pulled once',      color: 'var(--color-sky)'    },
            { n: '3', label: 'Parallel evaluation', desc: 'Every active policy evaluated instantly', color: 'var(--color-amber)'  },
            { n: '4', label: 'Best offers shown',   desc: 'Ranked by monthly installment',           color: 'var(--color-green)'  },
          ].map(step => (
            <div key={step.n} className="bento-card p-4 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0" style={{ background: `rgba(${step.color === 'var(--color-violet)' ? '124,58,237' : step.color === 'var(--color-sky)' ? '96,165,250' : step.color === 'var(--color-amber)' ? '251,191,36' : '52,211,153'},0.15)`, color: step.color }}>
                {step.n}
              </span>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{step.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Policies table */}
        <div className="bento-card overflow-hidden p-0">
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),rgba(167,139,250,0.3),transparent)' }} />

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} /></div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
                <Store size={20} />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>No lender policies yet</p>
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Add a policy for each client to include them in the Mint marketplace.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {['Lender', 'Status', 'Amount range', 'Base rate', 'Min score', 'Max DSR', ''].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {policies.map(p => (
                  <>
                    <tr key={p.id} style={{ animation: 'fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                      <td>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{p.display_name}</p>
                          {p.tagline && <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{p.tagline}</p>}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleActive(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all"
                          style={p.active ? {
                            background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)',
                          } : {
                            background: 'rgba(75,80,128,0.15)', color: 'var(--color-text3)', border: '1px solid rgba(75,80,128,0.25)',
                          }}
                        >
                          {p.active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {p.active ? 'Live' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-text2)' }}>
                          {fmt(p.min_amount)} – {fmt(p.max_amount)}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text)' }}>{p.base_rate_pct}%</span>
                      </td>
                      <td>
                        <span className="font-mono text-sm" style={{ color: 'var(--color-text2)' }}>{p.min_credit_score}</span>
                      </td>
                      <td>
                        <span className="font-mono text-sm" style={{ color: 'var(--color-text2)' }}>{p.max_dsr_pct}%</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                            className="p-1.5 rounded-lg cursor-pointer transition-colors"
                            style={{ color: 'var(--color-text3)' }}
                            title="View rate bands"
                          >
                            {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                            style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                          >
                            <Zap size={11} /> Edit policy
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-bands`} style={{ background: 'rgba(124,58,237,0.02)' }}>
                        <td colSpan={7} style={{ padding: '12px 20px' }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text3)' }}>Rate bands</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {p.rate_bands.sort((a, b) => b.minScore - a.minScore).map((band, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                                <span style={{ color: 'var(--color-text3)' }}>≥{band.minScore}</span>
                                <span style={{ color: band.rateAdjustment === null ? 'var(--color-red)' : band.rateAdjustment < 0 ? 'var(--color-green)' : 'var(--color-text)' }}>
                                  {band.rateAdjustment === null ? 'DECLINE' : band.rateAdjustment > 0 ? `+${band.rateAdjustment}%` : band.rateAdjustment === 0 ? 'Base' : `${band.rateAdjustment}%`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Clients without a policy */}
        {!loading && clientsWithoutPolicy.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-xs" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', color: 'var(--color-amber)' }}>
            <Zap size={13} className="mt-0.5 shrink-0" />
            <span>
              {clientsWithoutPolicy.length} client{clientsWithoutPolicy.length > 1 ? 's' : ''} without a marketplace policy:{' '}
              <strong>{clientsWithoutPolicy.map(c => c.name).join(', ')}</strong>.
              They won't appear in consumer quote results until a policy is configured and activated.
            </span>
          </div>
        )}
      </div>
    </Shell>
  );
}
