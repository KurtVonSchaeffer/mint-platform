'use client';

import { useRef, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { PriceReveal } from '@/components/PriceReveal';
import {
  CHECK_CATALOG, VOLUME_TIERS, BRANCH_RATE, ADMIN_FEE,
  fmtR, fmtRc,
  type CheckId, type VolumeTierId,
} from '@/lib/quote-pricing';

export interface CustomItem { label: string; amount: number; recurring: boolean }

export interface QuoteEditState {
  client:         string;
  contact:        string;
  email:          string;
  setupFee:       string;
  monthlyFee:     string;
  selectedChecks: CheckId[];
  volumeTier:     VolumeTierId;
  branches:       string;
  customItems:    CustomItem[];
}

interface Props {
  state:         QuoteEditState;
  onChange:      (patch: Partial<QuoteEditState>) => void;
  isSuperAdmin?: boolean;
  email?:        string;
}

function Toggle({ active }: { active: boolean }) {
  return (
    <div style={{
      width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative',
      transition: 'background 0.22s ease',
      background: active ? 'var(--color-purple)' : 'rgba(255,255,255,0.08)',
      border: active ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid var(--color-border2)',
    }}>
      <div style={{
        position: 'absolute', top: 1, left: active ? 16 : 1,
        width: 14, height: 14, borderRadius: 7,
        background: active ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'left 0.22s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
      }} />
    </div>
  );
}

function MarginBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color,
        borderRadius: 99,
        transition: 'width 0.35s cubic-bezier(0.16,1,0.3,1), background 0.35s ease',
      }} />
    </div>
  );
}

const EYEBROW: React.CSSProperties = {
  fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--color-text3)',
};

export function QuoteEditPanel({ state, onChange, isSuperAdmin = false, email = '' }: Props) {
  const branches     = Math.max(1, parseInt(state.branches, 10) || 1);
  const flatFee      = Math.max(0, parseFloat(state.monthlyFee) || 0);
  const tier         = VOLUME_TIERS.find((t) => t.id === state.volumeTier) ?? VOLUME_TIERS[0];
  const tierIndex    = VOLUME_TIERS.findIndex((t) => t.id === state.volumeTier);
  const adjVolume    = tier.volume * 0.95;
  const customMo     = state.customItems.filter((c) => c.recurring).reduce((s, c) => s + c.amount, 0);
  const customOnce   = state.customItems.filter((c) => !c.recurring).reduce((s, c) => s + c.amount, 0);
  const setupFee     = parseInt(state.setupFee.replace(/\D/g, ''), 10) || 0;
  const branchExtra  = branches > 1 ? (branches - 1) * BRANCH_RATE : 0;
  const totalMonthly = flatFee + branchExtra + customMo;
  const annualTCV    = setupFee + customOnce + totalMonthly * 12;

  // Internal cost (what we pay at base rates)
  const rawChecksCost = state.selectedChecks.reduce((sum, id) => {
    const c = CHECK_CATALOG.find((x) => x.id === id);
    return sum + (c ? c.baseRate * adjVolume : 0);
  }, 0);
  const ourMonthlyCost = rawChecksCost + ADMIN_FEE + branchExtra;
  const grossProfit    = totalMonthly - ourMonthlyCost;
  const grossMarginPct = totalMonthly > 0 ? (grossProfit / totalMonthly) * 100 : 0;

  // Baseline margin captured when panel first opens
  const baselineRef = useRef<number | null>(null);
  useEffect(() => {
    if (baselineRef.current === null) baselineRef.current = grossMarginPct;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const marginDelta  = grossMarginPct - (baselineRef.current ?? grossMarginPct);
  const showArrow    = Math.abs(marginDelta) >= 0.5;

  const marginColor = grossMarginPct >= 35 ? '#34d399' : grossMarginPct >= 20 ? '#fbbf24' : '#f87171';
  const marginLabel = grossMarginPct >= 35 ? 'Healthy' : grossMarginPct >= 20 ? 'Low margin' : 'Below cost';

  function toggleCheck(id: CheckId) {
    const next = state.selectedChecks.includes(id)
      ? state.selectedChecks.filter((c) => c !== id)
      : [...state.selectedChecks, id];
    onChange({ selectedChecks: next });
  }

  function addCustomItem() {
    onChange({ customItems: [...state.customItems, { label: '', amount: 0, recurring: false }] });
  }

  function updateCustomItem(i: number, patch: Partial<CustomItem>) {
    onChange({ customItems: state.customItems.map((c, idx) => idx === i ? { ...c, ...patch } : c) });
  }

  function removeCustomItem(i: number) {
    onChange({ customItems: state.customItems.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      {/* ── Sticky margin health banner ───────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '12px 28px 14px',
        background: 'rgba(15,18,40,0.92)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--color-border2)',
      }}>
        <PriceReveal isSuperAdmin={isSuperAdmin} email={email} block>
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={EYEBROW}>Gross margin</span>
                {showArrow && (
                  marginDelta > 0
                    ? <TrendingUp size={11} style={{ color: '#34d399' }} />
                    : <TrendingDown size={11} style={{ color: '#f87171' }} />
                )}
                {showArrow && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: marginDelta > 0 ? '#34d399' : '#f87171' }}>
                    {marginDelta > 0 ? '+' : ''}{marginDelta.toFixed(1)}pp
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: marginColor }}>{marginLabel}</span>
                <span style={{
                  fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
                  color: marginColor, fontVariantNumeric: 'tabular-nums',
                  transition: 'color 0.35s ease',
                }}>
                  {grossMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <MarginBar pct={grossMarginPct} color={marginColor} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--color-text3)' }}>Revenue {fmtR(totalMonthly)}/mo</span>
              <span style={{ fontSize: 9, color: 'var(--color-text3)' }}>Cost {fmtR(ourMonthlyCost)}/mo · Profit {fmtR(grossProfit)}/mo</span>
            </div>
          </>
        </PriceReveal>
      </div>

      {/* ── Scrollable content ────────────────────────────────────── */}
      <div style={{ padding: '28px 28px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Client details */}
        <section style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--color-border2)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={EYEBROW}>Client details</p>
          <input value={state.client}  onChange={(e) => onChange({ client:  e.target.value })} className="field-input w-full" placeholder="Company name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={state.contact} onChange={(e) => onChange({ contact: e.target.value })} className="field-input w-full" style={{ fontSize: 13 }} placeholder="Contact name" />
            <input value={state.email}   onChange={(e) => onChange({ email:   e.target.value })} className="field-input w-full" style={{ fontSize: 13 }} placeholder="email@co.za" type="email" />
          </div>
        </section>

        {/* Quote parameters — unified card */}
        <section style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--color-border2)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={EYEBROW}>Quote parameters</p>

          {/* Fee inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ ...EYEBROW, display: 'block', marginBottom: 6 }}>Monthly fee (R)</label>
              <input value={state.monthlyFee} onChange={(e) => onChange({ monthlyFee: e.target.value })} className="field-input w-full font-mono" placeholder="9500" inputMode="numeric" />
              <p style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text3)' }}>Client pays /mo</p>
            </div>
            <div>
              <label style={{ ...EYEBROW, display: 'block', marginBottom: 6 }}>Setup fee (R)</label>
              <input value={state.setupFee} onChange={(e) => onChange({ setupFee: e.target.value })} className="field-input w-full font-mono" placeholder="100000" inputMode="numeric" />
              <p style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text3)' }}>One-off</p>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border2)' }} />

          {/* Volume tier slider */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={EYEBROW}>Included quota / API type / month</label>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'var(--color-violet)',
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 8, padding: '2px 9px',
              }}>{tier.label} — {tier.volume.toLocaleString()} calls</span>
            </div>
            <input
              type="range" min="0" max={VOLUME_TIERS.length - 1} step="1"
              value={tierIndex}
              onChange={(e) => onChange({ volumeTier: VOLUME_TIERS[parseInt(e.target.value, 10)].id })}
              style={{ width: '100%', accentColor: '#7C3AED', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {VOLUME_TIERS.map((t, i) => (
                <span key={t.id} style={{
                  fontSize: 9, fontWeight: i === tierIndex ? 700 : 400,
                  color: i === tierIndex ? 'var(--color-violet)' : 'var(--color-text3)',
                  transition: 'color 0.2s',
                }}>{t.label}</span>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border2)' }} />

          {/* Branches slider */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={EYEBROW}>Additional branches</label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{branches}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text3)' }}>{branches === 1 ? 'branch' : 'branches'} · {fmtR(BRANCH_RATE)}/extra/mo</span>
              </div>
            </div>
            <input
              type="range" min="1" max="11" step="1"
              value={branches}
              onChange={(e) => onChange({ branches: e.target.value })}
              style={{ width: '100%', accentColor: '#7C3AED', cursor: 'pointer' }}
            />
            {branchExtra > 0 && (
              <p style={{ fontSize: 10, color: 'var(--color-text3)', marginTop: 5 }}>+{fmtR(branchExtra)}/mo for {branches - 1} additional branch{branches - 1 > 1 ? 'es' : ''}</p>
            )}
          </div>
        </section>

        {/* Services included — card-based */}
        <section>
          <p style={{ ...EYEBROW, marginBottom: 12 }}>Services included</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHECK_CATALOG.map((check) => {
              const active         = state.selectedChecks.includes(check.id);
              const pricePerUnit   = check.clientRate;              // published client-facing rate
              const monthlyContrib = Math.round(pricePerUnit * adjVolume);
              return (
                <button
                  key={check.id}
                  type="button"
                  onClick={() => toggleCheck(check.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 16px', borderRadius: 14, textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.2s ease', width: '100%',
                    background: active ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.025)',
                    border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--color-border2)',
                    boxShadow: active ? '0 2px 16px rgba(124,58,237,0.08)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                  }}
                >
                  <Toggle active={active} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, lineHeight: 1.35,
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--color-text)' : 'var(--color-text2)',
                    }}>{check.label}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text3)', marginTop: 2 }}>
                      {Math.round(adjVolume).toLocaleString()} calls included /mo
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {pricePerUnit === 0 ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)',
                        border: '1px solid rgba(52,211,153,0.25)',
                      }}>
                        Included
                      </span>
                    ) : (
                      <PriceReveal isSuperAdmin={isSuperAdmin} email={email}>
                        <>
                          <p style={{
                            fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                            color: active ? 'var(--color-violet)' : 'var(--color-text3)',
                          }}>{fmtRc(pricePerUnit)}/chk</p>
                          {check.firstFree > 0 && (
                            <p style={{ fontSize: 10, color: 'var(--color-amber)', marginTop: 1 }}>
                              first {check.firstFree.toLocaleString()} free
                            </p>
                          )}
                          <p style={{ fontSize: 10, color: 'var(--color-text3)', marginTop: 2 }}>
                            ≈ {fmtR(monthlyContrib)}/mo
                          </p>
                        </>
                      </PriceReveal>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom line items */}
        <section style={{ paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={EYEBROW}>Custom line items</p>
            <button
              type="button"
              onClick={addCustomItem}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', color: 'var(--color-violet)', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <Plus size={11} /> Add
            </button>
          </div>
          {state.customItems.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-text3)' }}>No custom items.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state.customItems.map((ci, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input value={ci.label} onChange={(e) => updateCustomItem(i, { label: e.target.value })} className="field-input flex-1" style={{ fontSize: 13 }} placeholder="Description" />
                  <input value={ci.amount || ''} onChange={(e) => updateCustomItem(i, { amount: parseInt(e.target.value.replace(/\D/g,''), 10) || 0 })} className="field-input font-mono" style={{ width: 88, fontSize: 13 }} placeholder="0" inputMode="numeric" />
                  <button type="button" onClick={() => updateCustomItem(i, { recurring: !ci.recurring })}
                    style={{ fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 8, flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s',
                      ...(ci.recurring ? { background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' } : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }) }}
                  >{ci.recurring ? '/mo' : 'once'}</button>
                  <button type="button" onClick={() => removeCustomItem(i)}
                    style={{ padding: 4, borderRadius: 6, cursor: 'pointer', color: 'var(--color-text3)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-red)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                  ><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* TCV summary */}
        <section className="tcv-card" style={{ borderRadius: 16, padding: '20px 22px', border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 0 30px rgba(124,58,237,0.1)', marginBottom: 28 }}>
          <p className="tcv-label" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Year-one TCV</p>
          <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--color-text)' }}>{fmtR(annualTCV)}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span className="tcv-sub" style={{ fontSize: 11 }}>{fmtR(setupFee)} setup</span>
            <span className="tcv-sub" style={{ fontSize: 11 }}>+{fmtR(totalMonthly * 12)} licence/yr</span>
          </div>
          <div style={{ height: 1, background: 'rgba(124,58,237,0.2)', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text3)' }}>Monthly revenue</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmtR(totalMonthly)}/mo</span>
          </div>
        </section>

      </div>
    </div>
  );
}
