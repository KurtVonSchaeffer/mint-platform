'use client';

import { useState, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { SERVICE_RATES, PRICING_CONFIG, sellingPrice } from '@/lib/pricing';
import { CheckCircle2, XCircle, FileText, ArrowRight, Download, Star, TrendingUp } from 'lucide-react';

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

// Published tiers
const TIERS = [
  { id: 'starter', label: 'Starter',     price: 550000,  quota: 100,  badge: null },
  { id: 'scale',   label: 'Scale',       price: 950000,  quota: 300,  badge: 'Most Popular' },
] as const;

export default function PricingPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(['bureau_enquiry', 'liveness_dha', 'watchlist_peps', 'address_verification']),
  );
  const [quotaPerType, setQuotaPerType] = useState(300);       // API calls per type per month
  const [flatFee, setFlatFee]           = useState(950000);    // What client pays (cents)
  const [branches, setBranches]         = useState(1);
  const [toast, setToast]               = useState<{ kind: ToastKind; message: string } | null>(null);

  const grouped = SERVICE_RATES.reduce<Record<string, typeof SERVICE_RATES>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const selected = SERVICE_RATES.filter(s => selectedIds.has(s.id));

  // Per-type quota model: each selected service gets quotaPerType calls
  const serviceBreakdown = useMemo(() => selected.map(s => {
    const sell     = sellingPrice(s);
    const provider = s.providerCents;
    return {
      ...s,
      sellCents:    sell,
      bundleSell:   sell * quotaPerType,         // what we'd charge at market rate
      bundleProvider: provider * quotaPerType,   // what it costs us
    };
  }), [selected, quotaPerType]);

  const totalProviderCost = serviceBreakdown.reduce((s, r) => s + r.bundleProvider, 0);
  const totalMarketValue  = serviceBreakdown.reduce((s, r) => s + r.bundleSell, 0);
  const grossMargin       = flatFee - totalProviderCost;
  const marginPct         = flatFee > 0 ? (grossMargin / flatFee) * 100 : 0;

  function toggleService(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyTier(price: number, quota: number) {
    setFlatFee(price);
    setQuotaPerType(quota);
  }

  // Map pricing.ts IDs → quote-pricing.ts CheckIds
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
    const checks = [...selectedIds].map(id => ID_MAP[id]).filter(Boolean);
    const tier = quotaPerType <= 50 ? '0-50'
      : quotaPerType <= 150 ? '50-150'
      : quotaPerType <= 300 ? '151-300'
      : quotaPerType <= 1000 ? '500-1000'
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

        {/* Published tiers quick-select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIERS.map(tier => (
            <button
              key={tier.id}
              onClick={() => applyTier(tier.price, tier.quota)}
              className="rounded-xl p-5 text-left transition-all cursor-pointer"
              style={{
                border: flatFee === tier.price && quotaPerType === tier.quota
                  ? '1px solid rgba(124,58,237,0.5)'
                  : '1px solid var(--color-border2)',
                background: flatFee === tier.price && quotaPerType === tier.quota
                  ? 'rgba(124,58,237,0.08)'
                  : 'transparent',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text3)' }}>{tier.label}</p>
                  <p className="text-xl font-bold" style={{ color: flatFee === tier.price && quotaPerType === tier.quota ? 'var(--color-violet)' : 'var(--color-text)' }}>
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
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                {tier.quota.toLocaleString()} API calls / type / month included
              </p>
            </button>
          ))}
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
                    Flat monthly fee (R)
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={flatFee / 100}
                    onChange={e => setFlatFee(Math.max(0, (parseFloat(e.target.value) || 0) * 100))}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>What the client pays /mo</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>
                    API calls / type / month
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={quotaPerType}
                    onChange={e => setQuotaPerType(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>Included quota per API type</p>
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
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>Number of branches</p>
                </div>
              </div>
            </div>

            {/* Service selection */}
            <div className="bento-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">Services included in flat fee</p>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                  {selectedIds.size} of {SERVICE_RATES.length} selected
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
                          const on   = selectedIds.has(s.id);
                          const sell = sellingPrice(s);
                          const zebraBase = si % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)';
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleService(s.id)}
                              className="w-full flex items-center gap-3 p-3 transition-all text-left cursor-pointer"
                              style={{
                                borderBottom: si < services.length - 1 ? '1px solid var(--color-row-border)' : 'none',
                                background: on ? cc.bg : zebraBase,
                                outline: on ? `1px solid rgba(${cc.rgb},0.3)` : 'none',
                              }}
                              onMouseEnter={e => { if (!on) (e.currentTarget as HTMLElement).style.background = `rgba(${cc.rgb},0.06)`; }}
                              onMouseLeave={e => { if (!on) (e.currentTarget as HTMLElement).style.background = zebraBase; }}
                            >
                              {on
                                ? <CheckCircle2 size={16} style={{ color: cc.color }} className="shrink-0" />
                                : <XCircle size={16} className="shrink-0" style={{ color: 'var(--color-text3)' }} />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                                <p className="text-[11px] truncate" style={{ color: 'var(--color-text3)' }}>{s.description}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono font-bold" style={{ color: on ? cc.color : 'var(--color-text3)' }}>
                                  {fmtDec(sell)}/call
                                </p>
                                {on && (
                                  <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                                    {fmt(sell * quotaPerType)} if fully used
                                  </p>
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
                Each selected service gets {quotaPerType.toLocaleString()} calls/month. Overage billed at per-call rate above.
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
                excl. VAT · {selectedIds.size} services · {quotaPerType.toLocaleString()} calls/type
              </p>
              <p className="text-[11px] mt-3 p-3 rounded-lg italic" style={{ background: 'rgba(124,58,237,0.07)', color: 'var(--color-text3)' }}>
                As shown on invoice: "Includes {quotaPerType.toLocaleString()} API calls/type/month"
              </p>
            </div>

            {/* Internal margin */}
            <div className="bento-card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} style={{ color: 'var(--color-violet)' }} />
                <p className="eyebrow">Internal margin</p>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Provider cost (at quota)</p>
                <p className="font-mono text-sm" style={{ color: 'var(--color-red)' }}>−{fmt(totalProviderCost)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Market value of bundle</p>
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
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Annual contract value</p>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--color-text)' }}>{fmt(flatFee * 12)}</p>
              </div>
            </div>

            {/* Per-service overage rates */}
            <div className="bento-card p-5">
              <p className="eyebrow mb-3">Overage rates (published)</p>
              <p className="text-[11px] mb-3 italic" style={{ color: 'var(--color-text3)' }}>
                Billed per call above the included quota
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                {serviceBreakdown.map((s, si) => {
                  const cc = CATEGORY_COLOR[s.category];
                  return (
                    <div key={s.id}
                      className="flex justify-between items-center py-2.5 px-3"
                      style={{ borderBottom: si < serviceBreakdown.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}>
                      <p className="text-xs truncate max-w-[60%]" style={{ color: 'var(--color-text2)' }}>{s.name}</p>
                      <p className="text-xs font-mono font-bold" style={{ color: cc.color }}>{fmtDec(s.sellCents)}/call</p>
                    </div>
                  );
                })}
                {serviceBreakdown.length === 0 && (
                  <p className="text-xs p-3 text-center" style={{ color: 'var(--color-text3)' }}>Select services to see overage rates</p>
                )}
              </div>
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
