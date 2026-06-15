'use client';

import { useState, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  SERVICE_RATES, VOLUME_TIERS, PRICING_CONFIG, calculateMonthlyBill,
  sellingPrice, type VolumeTierId,
} from '@/lib/pricing';
import { CheckCircle2, XCircle, TrendingUp, FileText, ArrowRight, Download } from 'lucide-react';

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtDec(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

const CATEGORY_LABELS: Record<string, string> = {
  kyc:         'KYC & Identity',
  credit:      'Credit Bureau',
  banking:     'Open Banking',
  compliance:  'Compliance',
  contracts:   'Contracts',
};

const CATEGORY_COLOR: Record<string, { bg: string; color: string; rgb: string }> = {
  kyc:        { bg: 'rgba(124,58,237,0.1)',  color: 'var(--color-violet)', rgb: '124,58,237' },
  credit:     { bg: 'rgba(96,165,250,0.1)',  color: 'var(--color-sky)',    rgb: '96,165,250' },
  banking:    { bg: 'rgba(52,211,153,0.1)',  color: 'var(--color-green)',  rgb: '52,211,153' },
  compliance: { bg: 'rgba(251,191,36,0.1)',  color: 'var(--color-amber)',  rgb: '251,191,36' },
  contracts:  { bg: 'rgba(248,113,113,0.1)', color: 'var(--color-red)',    rgb: '248,113,113' },
};

export default function PricingPage() {
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(
    new Set(['bureau_enquiry', 'bank_linking', 'liveness_dha', 'watchlist_peps', 'address_verification']),
  );
  const [tierId, setTierId]             = useState<VolumeTierId>('scale');
  const [customVolume, setCustomVolume] = useState<number | null>(null);
  const [branches, setBranches]         = useState(2);
  const [licence, setLicence]           = useState(800000); // R 8,000
  const [branchFee, setBranchFee]       = useState(95000);  // R 950
  const [toast, setToast]               = useState<{ kind: ToastKind; message: string } | null>(null);

  const tier   = VOLUME_TIERS.find(t => t.id === tierId)!;
  const volume = customVolume ?? tier.volume;

  const bill = useMemo(() => calculateMonthlyBill({
    selectedServiceIds:   [...selectedIds],
    monthlyVolume:        volume,
    numBranches:          branches,
    branchFeeCents:       branchFee,
    platformLicenceCents: licence,
  }), [selectedIds, volume, branches, licence, branchFee]);

  function toggleService(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function createQuote() {
    setToast({ kind: 'success', message: 'Quote created — opening Quotes page.' });
    setTimeout(() => { window.location.href = '/quotes'; }, 1200);
  }

  // Group services by category
  const grouped = SERVICE_RATES.reduce<Record<string, typeof SERVICE_RATES>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

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
              Configure services, volume tier, and overheads to calculate monthly billing for a new client.
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
            <button
              onClick={createQuote}
              className="btn-purple btn-shine inline-flex items-center gap-1.5"
            >
              <FileText size={14} /> Create quote
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left: configuration ────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Volume tier */}
            <div className="bento-card p-5">
              <p className="eyebrow mb-3">Volume Tier</p>
              <div className="grid grid-cols-5 gap-2">
                {VOLUME_TIERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTierId(t.id); setCustomVolume(null); }}
                    className="p-3 rounded-xl text-center transition-all cursor-pointer"
                    style={tierId === t.id ? {
                      background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                    } : {
                      border: '1px solid var(--color-border2)',
                      color: 'var(--color-text2)',
                    }}
                    onMouseEnter={e => { if (tierId !== t.id) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                    onMouseLeave={e => { if (tierId !== t.id) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}
                  >
                    <p className="font-bold text-sm">{t.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-70">{t.min}–{t.max ?? '∞'} checks</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                    Monthly check volume
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={customVolume ?? tier.volume}
                    onChange={e => setCustomVolume(parseInt(e.target.value, 10) || 0)}
                    min={0}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                    Branches
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={branches}
                    onChange={e => setBranches(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>
                    Platform licence (R/mo)
                  </label>
                  <input
                    type="number"
                    className="field-input font-mono"
                    value={licence / 100}
                    onChange={e => setLicence(Math.max(0, parseFloat(e.target.value) * 100))}
                  />
                </div>
              </div>
            </div>

            {/* Services selection */}
            <div className="bento-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">Services</p>
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
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cc.bg, color: cc.color, border: `1px solid rgba(${cc.rgb},0.2)` }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                        {services.map((s, si) => {
                          const on      = selectedIds.has(s.id);
                          const sell    = sellingPrice(s);
                          const monthly = sell * volume;
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
                              onMouseEnter={e => {
                                if (!on) (e.currentTarget as HTMLElement).style.background = `rgba(${cc.rgb},0.06)`;
                              }}
                              onMouseLeave={e => {
                                if (!on) (e.currentTarget as HTMLElement).style.background = zebraBase;
                              }}
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
                                  {fmtDec(sell)}/check
                                </p>
                                {on && (
                                  <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                                    {fmt(monthly)}/mo
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
            </div>
          </div>

          {/* Right: live summary ──────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Grand total */}
            <div
              className="tcv-card rounded-2xl p-6"
              style={{ border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 0 30px rgba(124,58,237,0.1)' }}
            >
              <p className="tcv-label text-[10px] font-bold uppercase tracking-wider mb-1">Monthly billing total</p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                {fmt(bill.grandTotal)}
              </p>
              <p className="tcv-sub text-xs mt-1">
                excl. VAT · {volume.toLocaleString()} checks · {branches} branch{branches > 1 ? 'es' : ''}
              </p>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="space-y-2">
                  {bill.checkCosts.filter(c => c.monthly > 0).map(c => (
                    <div key={c.serviceId} className="flex justify-between text-xs">
                      <span className="truncate" style={{ color: 'var(--color-text2)', maxWidth: '65%' }}>{c.name}</span>
                      <span className="font-mono shrink-0" style={{ color: 'var(--color-text)' }}>{fmt(c.monthly)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pt-2" style={{ borderTop: '1px solid rgba(124,58,237,0.15)' }}>
                    <span style={{ color: 'var(--color-text2)' }}>Platform licence</span>
                    <span className="font-mono" style={{ color: 'var(--color-text)' }}>{fmt(licence)}</span>
                  </div>
                  {branches > 0 && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text2)' }}>Branch fees (×{branches})</span>
                      <span className="font-mono" style={{ color: 'var(--color-text)' }}>{fmt(bill.breakdown.branchFees)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ARR & per-check */}
            <div className="bento-card p-5 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Annual contract value</p>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--color-text)' }}>{fmt(bill.grandTotal * 12)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Blended cost per check</p>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--color-violet)' }}>{fmtDec(bill.perCheckBlended)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Provider markup</p>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--color-green)' }}>{(PRICING_CONFIG.markupPct * 100).toFixed(0)}%</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Package discount</p>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--color-amber)' }}>{(PRICING_CONFIG.packageDiscountPct * 100).toFixed(0)}%</p>
              </div>
            </div>

            {/* Rate card reference */}
            <div className="bento-card p-5">
              <p className="eyebrow mb-3">Rate card — all tiers</p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                {VOLUME_TIERS.map((t, ti) => {
                  const total = calculateMonthlyBill({
                    selectedServiceIds:   [...selectedIds],
                    monthlyVolume:        t.volume,
                    numBranches:          branches,
                    platformLicenceCents: licence,
                    branchFeeCents:       branchFee,
                  }).grandTotal;
                  const isActive = t.id === tierId;
                  const zebraBase = ti % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)';
                  return (
                    <div
                      key={t.id}
                      className="flex justify-between items-center py-2.5 px-3 transition-colors cursor-pointer"
                      style={{
                        borderBottom: ti < VOLUME_TIERS.length - 1 ? '1px solid var(--color-row-border)' : 'none',
                        background: isActive ? 'rgba(124,58,237,0.1)' : zebraBase,
                        boxShadow: isActive ? 'inset 2px 0 0 var(--color-purple)' : 'none',
                      }}
                      onClick={() => { setTierId(t.id); setCustomVolume(null); }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = zebraBase; }}
                    >
                      <div>
                        <p className="text-xs font-semibold" style={{ color: isActive ? 'var(--color-violet)' : 'var(--color-text2)' }}>{t.label}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{t.min}–{t.max ?? '∞'} checks · avg {t.volume}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold" style={{ color: isActive ? 'var(--color-violet)' : 'var(--color-text)' }}>{fmt(total)}/mo</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>{fmt(total * 12)}/yr</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={createQuote}
              className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2"
            >
              Convert to Quote <ArrowRight size={14} />
            </button>

            <p className="text-[10px] text-center" style={{ color: 'var(--color-text3)' }}>
              Prices excl. VAT. Setup / implementation fee calculated separately on Setup Costs tab.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
