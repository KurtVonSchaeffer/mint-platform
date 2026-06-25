'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { SERVICE_RATES, PRICING_CONFIG, sellingPrice } from '@/lib/pricing';
import { CheckCircle2, XCircle, FileText, ArrowRight, Download, Star, TrendingUp, Lock, Pencil, Save, X, Eye, EyeOff } from 'lucide-react';
import { PriceReveal } from '@/components/PriceReveal';
import { useRole } from '@/hooks/useRole';
import { createBrowserClient } from '@supabase/ssr';

const RATE_STORAGE_KEY = 'algolend_rate_overrides';

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtDec(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

const CATEGORY_LABELS: Record<string, string> = {
  kyc:        'KYC & Identity',
  credit:     'Credit Bureau',
  banking:    'Open Banking',
  compliance: 'Compliance',
  contracts:  'Contracts',
};

const CATEGORY_COLOR: Record<string, { bg: string; color: string; rgb: string }> = {
  kyc:        { bg: 'rgba(124,58,237,0.1)',  color: 'var(--color-violet)', rgb: '124,58,237' },
  credit:     { bg: 'rgba(96,165,250,0.1)',  color: 'var(--color-sky)',    rgb: '96,165,250' },
  banking:    { bg: 'rgba(52,211,153,0.1)',  color: 'var(--color-green)',  rgb: '52,211,153' },
  compliance: { bg: 'rgba(251,191,36,0.1)',  color: 'var(--color-amber)',  rgb: '251,191,36' },
  contracts:  { bg: 'rgba(248,113,113,0.1)', color: 'var(--color-red)',    rgb: '248,113,113' },
};

// Published tiers — must match algolend.co.za/pricing
// Enterprise: R14,999/mo platform licence + 2,000 checks included, then PAYG
// Starter:    R1,999/mo platform licence, all checks PAYG from check 1
const TIERS = [
  { id: 'starter',    label: 'Starter',    price: 199900,  includedChecks: 0,    badge: null,           branches: 'Up to 2 branches' },
  { id: 'enterprise', label: 'Enterprise', price: 1499900, includedChecks: 2000, badge: 'Most Popular', branches: 'Unlimited branches' },
] as const;

type TierId = typeof TIERS[number]['id'];

export default function PricingPage() {
  const { isSuperAdmin, email } = useRole();
  const [activeTierId, setActiveTierId]   = useState<TierId>('enterprise');
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(
    new Set(['bureau_enquiry', 'watchlist_peps', 'address_verification', 'liveness_id_phone']),
  );
  const [estVolume, setEstVolume]         = useState(300);       // Estimated monthly calls per type (for margin modelling)
  const [flatFee, setFlatFee]             = useState(1499900);   // Platform licence in cents
  const [branches, setBranches]           = useState(1);
  const [toast, setToast]               = useState<{ kind: ToastKind; message: string } | null>(null);
  const [rateOverrides, setRateOverrides]   = useState<Record<string, number>>({});
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [draftRates, setDraftRates]         = useState<Record<string, number>>({});
  const [showAuthModal, setShowAuthModal]   = useState(false);
  const [authPassword, setAuthPassword]     = useState('');
  const [authError, setAuthError]           = useState('');
  const [authLoading, setAuthLoading]       = useState(false);
  const [showPw, setShowPw]                 = useState(false);
  const pwInputRef                          = useRef<HTMLInputElement>(null);

  // Load saved overrides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RATE_STORAGE_KEY);
      if (stored) setRateOverrides(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function requestEditRates() {
    setAuthPassword('');
    setAuthError('');
    setShowPw(false);
    setShowAuthModal(true);
    setTimeout(() => pwInputRef.current?.focus(), 80);
  }

  async function confirmEditRates() {
    if (!authPassword) { setAuthError('Enter your password'); return; }
    setAuthLoading(true);
    setAuthError('');
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
    setAuthLoading(false);
    if (error) { setAuthError('Incorrect password'); return; }
    setShowAuthModal(false);
    const draft: Record<string, number> = {};
    SERVICE_RATES.forEach(s => { draft[s.id] = rateOverrides[s.id] ?? s.publishedCents; });
    setDraftRates(draft);
    setIsEditingRates(true);
  }

  function saveRates() {
    const overrides: Record<string, number> = {};
    SERVICE_RATES.forEach(s => {
      if (draftRates[s.id] !== s.publishedCents) overrides[s.id] = draftRates[s.id];
    });
    setRateOverrides(overrides);
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(overrides));
    setIsEditingRates(false);
    setToast({ kind: 'success', message: 'Rate card saved' });
  }

  function cancelEditRates() { setIsEditingRates(false); }

  function effectiveRate(s: typeof SERVICE_RATES[number]): number {
    return rateOverrides[s.id] ?? s.publishedCents;
  }

  const isStarter      = activeTierId === 'starter';
  const activeTier     = TIERS.find(t => t.id === activeTierId)!;
  const includedChecks = activeTier.includedChecks;

  const grouped = SERVICE_RATES.reduce<Record<string, typeof SERVICE_RATES>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  // Enterprise-only services are excluded on Starter tier
  const effectiveSelectedIds = useMemo(() => {
    if (!isStarter) return selectedIds;
    const next = new Set(selectedIds);
    SERVICE_RATES.filter(s => s.enterpriseOnly).forEach(s => next.delete(s.id));
    return next;
  }, [selectedIds, isStarter]);

  const selected = SERVICE_RATES.filter(s => effectiveSelectedIds.has(s.id));

  // Margin model: uses estVolume per service type
  // For Enterprise, first `includedChecks` total calls are absorbed into the platform fee
  const perTypeIncluded = selected.length > 0 ? Math.round(includedChecks / selected.length) : 0;
  const billableVolume  = (v: number) => Math.max(0, v - perTypeIncluded);

  const serviceBreakdown = useMemo(() => selected.map(s => {
    const sell     = effectiveRate(s);  // published rate, respecting overrides
    const provider = s.providerCents;
    const bVol     = Math.max(0, estVolume - Math.round(includedChecks / Math.max(selected.length, 1)));
    return {
      ...s,
      sellCents:      sell,
      bundleSell:     sell * bVol,
      bundleProvider: provider * estVolume,
    };
  }), [selected, estVolume, includedChecks]);

  const totalProviderCost = serviceBreakdown.reduce((s, r) => s + r.bundleProvider, 0);
  const totalMarketValue  = serviceBreakdown.reduce((s, r) => s + r.bundleSell, 0);
  const grossMargin       = flatFee - totalProviderCost;
  const marginPct         = flatFee > 0 ? (grossMargin / flatFee) * 100 : 0;

  function toggleService(id: string) {
    const svc = SERVICE_RATES.find(s => s.id === id);
    if (svc?.enterpriseOnly && isStarter) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyTier(tier: typeof TIERS[number]) {
    setActiveTierId(tier.id);
    setFlatFee(tier.price);
    if (tier.id === 'starter') {
      setSelectedIds(prev => {
        const next = new Set(prev);
        SERVICE_RATES.filter(s => s.enterpriseOnly).forEach(s => next.delete(s.id));
        return next;
      });
    }
  }

  const ID_MAP: Record<string, string> = {
    bureau_enquiry:      'bureau',
    bank_linking:        'banking',
    liveness_dha:        'homeaff',
    liveness_id_phone:   'liveness',
    watchlist_peps:      'watchlist',
    address_verification:'address',
    cipc_employment:     'cipc',
    automated_contracts: 'contracts',
  };

  function createQuote() {
    const checks = [...effectiveSelectedIds].map(id => ID_MAP[id]).filter(Boolean);
    const tier = estVolume <= 50 ? '0-50'
      : estVolume <= 150 ? '50-150'
      : estVolume <= 300 ? '151-300'
      : estVolume <= 1000 ? '500-1000'
      : '1000-5000';
    sessionStorage.setItem('new_quote_prefill', JSON.stringify({
      monthlyFee: Math.round(flatFee / 100),
      selectedChecks: checks,
      volumeTier: tier,
      branches,
    }));
    window.location.href = '/quotes?new=1';
  }

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      {/* Password confirmation modal for rate editing */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border2)' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <Lock size={15} style={{ color: 'var(--color-violet)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Confirm to edit rates</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text3)' }}>{email}</p>
              </div>
            </div>
            <p className="text-xs mb-4 mt-3" style={{ color: 'var(--color-text3)' }}>
              Re-enter your password to unlock rate editing.
            </p>
            <div className="relative mb-3">
              <input
                ref={pwInputRef}
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={authPassword}
                onChange={e => { setAuthPassword(e.target.value); setAuthError(''); }}
                onKeyDown={e => e.key === 'Enter' && confirmEditRates()}
                className="field-input w-full pr-9"
                style={authError ? { borderColor: 'var(--color-red)' } : {}}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text3)] hover:text-[var(--color-text)]">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {authError && <p className="text-xs mb-3" style={{ color: 'var(--color-red)' }}>{authError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowAuthModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}>
                Cancel
              </button>
              <button onClick={confirmEditRates} disabled={authLoading}
                className="flex-1 py-2 rounded-xl text-sm font-semibold btn-purple"
                style={{ opacity: authLoading ? 0.7 : 1 }}>
                {authLoading ? 'Checking…' : 'Unlock editing'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Sales Tools</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Pricing Calculator
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Set the flat monthly fee and API calls per type — model matches the invoice sent to clients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/downloads/AlgoLend_Pricing_Calculator.xlsx"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={14} /> Excel model
            </a>
            <button onClick={createQuote} className="btn-purple btn-shine inline-flex items-center gap-1.5">
              <FileText size={14} /> Create quote
            </button>
          </div>
        </div>

        {/* Published tiers quick-select — must match algolend.co.za/pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIERS.map(tier => {
            const active = activeTierId === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => applyTier(tier)}
                className="rounded-xl p-5 text-left transition-all cursor-pointer"
                style={{
                  border: active ? '1px solid rgba(124,58,237,0.5)' : '1px solid var(--color-border2)',
                  background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text3)' }}>{tier.label}</p>
                    <p className="text-xl font-bold" style={{ color: active ? 'var(--color-violet)' : 'var(--color-text)' }}>
                      {fmt(tier.price)}/mo
                    </p>
                  </div>
                  {tier.badge && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.3)' }}>
                      <Star size={9} style={{ fill: 'var(--color-violet)' }} />
                      {tier.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{tier.branches} · pay-as-you-use checks</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left: configuration */}
          <div className="xl:col-span-2 space-y-5">

            {/* Inputs */}
            <div className="bento-card p-5">
              <p className="eyebrow mb-4">Quote Parameters</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>
                    Platform licence (R/mo)
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={flatFee / 100}
                    onChange={e => setFlatFee(Math.max(0, (parseFloat(e.target.value) || 0) * 100))}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>Flat licence fee excl. VAT</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>
                    Est. volume / type / month
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={estVolume}
                    onChange={e => setEstVolume(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>Used for margin modelling only</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>
                    Branches
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={branches}
                    onChange={e => setBranches(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min={1}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>
                    {isStarter ? 'Max 2 on Starter' : 'Unlimited on Enterprise'}
                  </p>
                </div>
              </div>
            </div>

            {/* Service selection */}
            <div className="bento-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">API checks — pay-as-you-use rates</p>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                  {effectiveSelectedIds.size} selected
                </span>
              </div>

              <div className="space-y-5">
                {Object.entries(grouped).map(([cat, services]) => {
                  const cc = CATEGORY_COLOR[cat];
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cc.bg, color: cc.color, border: `1px solid rgba(${cc.rgb},0.2)` }}>
                          {CATEGORY_LABELS[cat]}
                        </span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                        {services.map((s, si) => {
                          const locked    = s.enterpriseOnly && isStarter;
                          const on        = !locked && effectiveSelectedIds.has(s.id);
                          const sell      = effectiveRate(s);
                          const zebraBase = si % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)';
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleService(s.id)}
                              disabled={locked}
                              className="w-full flex items-center gap-3 p-3 transition-all text-left"
                              style={{
                                borderBottom: si < services.length - 1 ? '1px solid var(--color-row-border)' : 'none',
                                background: locked ? 'rgba(255,255,255,0.01)' : on ? cc.bg : zebraBase,
                                outline: on ? `1px solid rgba(${cc.rgb},0.3)` : 'none',
                                cursor: locked ? 'not-allowed' : 'pointer',
                                opacity: locked ? 0.5 : 1,
                              }}
                              onMouseEnter={e => { if (!on && !locked) (e.currentTarget as HTMLElement).style.background = `rgba(${cc.rgb},0.06)`; }}
                              onMouseLeave={e => { if (!on && !locked) (e.currentTarget as HTMLElement).style.background = zebraBase; }}
                            >
                              {locked
                                ? <Lock size={15} className="shrink-0" style={{ color: 'var(--color-text3)' }} />
                                : on
                                  ? <CheckCircle2 size={16} style={{ color: cc.color }} className="shrink-0" />
                                  : <XCircle size={16} className="shrink-0" style={{ color: 'var(--color-text3)' }} />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                                  {s.enterpriseOnly && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                                      style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' }}>
                                      Enterprise
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] truncate" style={{ color: 'var(--color-text3)' }}>{s.description}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {locked ? (
                                  <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Enterprise only</p>
                                ) : sell === 0 ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.25)' }}>
                                    Included free
                                  </span>
                                ) : (
                                  <>
                                    <p className="text-xs font-mono font-bold" style={{ color: on ? cc.color : 'var(--color-text3)' }}>
                                      {fmtDec(sell)}/call
                                    </p>
                                    {s.firstFree > 0 && (
                                      <p className="text-[10px]" style={{ color: 'var(--color-amber)' }}>
                                        first {s.firstFree.toLocaleString()} free
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] mt-4 italic" style={{ color: 'var(--color-text3)' }}>
                {isStarter
                  ? 'Starter: platform licence covers access only. All API checks billed pay-as-you-use at rates above.'
                  : `Enterprise: ${includedChecks.toLocaleString()} checks/month included in platform licence. Additional checks billed at rates above.`}
              </p>
            </div>
          </div>

          {/* Right: margin summary */}
          <div className="space-y-4">

            {/* Client invoice view */}
            <div className="rounded-2xl p-6" style={{ border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 0 30px rgba(124,58,237,0.1)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>
                Client pays / month
              </p>
              <p className="text-4xl font-bold tracking-tight font-mono" style={{ color: 'var(--color-text)' }}>
                {fmt(flatFee)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
                {activeTier.branches} · excl. VAT · {effectiveSelectedIds.size} services · pay-as-you-use checks
              </p>
              <p className="text-[11px] mt-3 p-3 rounded-lg italic" style={{ background: 'rgba(124,58,237,0.07)', color: 'var(--color-text3)' }}>
                {isStarter
                  ? 'Platform licence — API checks billed pay-as-you-use'
                  : `Includes ${includedChecks.toLocaleString()} API checks/month · additional checks at published rates`}
              </p>
            </div>

            {/* Internal margin — super admin only */}
            <div className="bento-card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} style={{ color: 'var(--color-violet)' }} />
                <p className="eyebrow">Internal margin</p>
              </div>

              <PriceReveal isSuperAdmin={isSuperAdmin} email={email} block>
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Provider cost (est. {estVolume.toLocaleString()} calls/type)</p>
                    <p className="font-mono text-sm" style={{ color: 'var(--color-red)' }}>−{fmt(totalProviderCost)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Client revenue (est. billable)</p>
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text2)' }}>{fmt(totalMarketValue)}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--color-border2)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Gross margin</p>
                    <p className="font-mono font-bold text-sm" style={{ color: grossMargin >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {fmt(grossMargin)}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Margin %</p>
                    <p className="font-mono font-bold text-sm" style={{ color: marginPct >= 30 ? 'var(--color-green)' : 'var(--color-amber)' }}>
                      {marginPct.toFixed(1)}%
                    </p>
                  </div>
                </>
              </PriceReveal>
              <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--color-border2)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Annual contract value</p>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--color-text)' }}>{fmt(flatFee * 12)}</p>
              </div>
            </div>

            {/* Published per-check rates — editable by super_admin */}
            <div className="bento-card p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="eyebrow">Pay-as-you-use rates</p>
                {isSuperAdmin && !isEditingRates && (
                  <button
                    onClick={requestEditRates}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--color-violet)', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    <Pencil size={10} /> Edit rates
                  </button>
                )}
                {isSuperAdmin && isEditingRates && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={saveRates}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ color: 'var(--color-green)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <Save size={10} /> Save
                    </button>
                    <button onClick={cancelEditRates}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ color: 'var(--color-text3)', background: 'transparent', border: '1px solid var(--color-border2)' }}>
                      <X size={10} /> Cancel
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] mb-3 italic" style={{ color: 'var(--color-text3)' }}>
                {isStarter ? 'Billed from check 1' : `First ${includedChecks.toLocaleString()} checks/mo included · then billed per call`}
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                {SERVICE_RATES.filter(s => !s.enterpriseOnly || !isStarter).map((s, si, arr) => {
                  const cc   = CATEGORY_COLOR[s.category];
                  const rate = isEditingRates ? (draftRates[s.id] ?? 0) : effectiveRate(s);
                  const isIncluded = rate === 0 && !isEditingRates;
                  return (
                    <div key={s.id}
                      className="flex justify-between items-center py-2.5 px-3"
                      style={{ borderBottom: si < arr.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}>
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs truncate" style={{ color: 'var(--color-text2)' }}>{s.name}</p>
                        {s.firstFree > 0 && (
                          <p className="text-[10px]" style={{ color: 'var(--color-amber)' }}>first {s.firstFree.toLocaleString()} free</p>
                        )}
                      </div>
                      {isEditingRates ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px]" style={{ color: 'var(--color-text3)' }}>R</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={(draftRates[s.id] ?? 0) / 100}
                            onChange={e => setDraftRates(prev => ({
                              ...prev,
                              [s.id]: Math.round((parseFloat(e.target.value) || 0) * 100),
                            }))}
                            className="field-input font-mono text-right"
                            style={{ width: 72, padding: '2px 6px', fontSize: 12 }}
                          />
                          <span className="text-[11px]" style={{ color: 'var(--color-text3)' }}>/call</span>
                        </div>
                      ) : isIncluded ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.25)' }}>
                          Included
                        </span>
                      ) : (
                        <p className="text-xs font-mono font-bold shrink-0" style={{ color: cc.color }}>
                          {fmtDec(rate)}/call
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {isEditingRates && (
                <p className="text-[10px] mt-2 italic" style={{ color: 'var(--color-text3)' }}>
                  Rates saved to this browser · super admin only
                </p>
              )}
            </div>

            <button onClick={createQuote} className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2">
              Convert to Quote <ArrowRight size={14} />
            </button>

            <p className="text-[10px] text-center" style={{ color: 'var(--color-text3)' }}>
              Prices excl. VAT · Setup / implementation fee added separately on quote
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
