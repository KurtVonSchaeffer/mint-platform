'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  CHECK_CATALOG, VOLUME_TIERS, BRANCH_RATE,
  fmtR, fmtRc, rateWithMargin,
  type CheckId, type VolumeTierId,
} from '@/lib/quote-pricing';

export interface CustomItem { label: string; amount: number; recurring: boolean }

export interface QuoteEditState {
  client:         string;
  contact:        string;
  email:          string;
  setupFee:       string;
  monthlyFee:     string;   // flat fee the client pays — drives all totals
  selectedChecks: CheckId[];
  volumeTier:     VolumeTierId;
  branches:       string;
  customItems:    CustomItem[];
}

interface Props {
  state:    QuoteEditState;
  onChange: (patch: Partial<QuoteEditState>) => void;
}

export function QuoteEditPanel({ state, onChange }: Props) {
  const branches    = Math.max(1, parseInt(state.branches, 10) || 1);
  const flatFee     = Math.max(0, parseFloat(state.monthlyFee) || 0);
  const tier        = VOLUME_TIERS.find((t) => t.id === state.volumeTier) ?? VOLUME_TIERS[0];
  const adjVolume   = tier.volume * 0.95;
  const customMo    = state.customItems.filter((c) => c.recurring).reduce((s, c) => s + c.amount, 0);
  const customOnce  = state.customItems.filter((c) => !c.recurring).reduce((s, c) => s + c.amount, 0);
  const setupFee    = parseInt(state.setupFee.replace(/\D/g, ''), 10) || 0;
  const branchExtra = branches > 1 ? (branches - 1) * BRANCH_RATE : 0;
  const totalMonthly = flatFee + branchExtra + customMo;

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
    <div className="p-7 space-y-6">

      {/* Client */}
      <div className="space-y-2">
        <p className="eyebrow">Client details</p>
        <input value={state.client}  onChange={(e) => onChange({ client:  e.target.value })} className="field-input w-full" placeholder="Company name" />
        <input value={state.contact} onChange={(e) => onChange({ contact: e.target.value })} className="field-input w-full text-sm" placeholder="Contact name" />
        <input value={state.email}   onChange={(e) => onChange({ email:   e.target.value })} className="field-input w-full text-sm" placeholder="email@example.co.za" type="email" />
      </div>

      {/* Fees */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eyebrow block mb-1.5">Flat monthly fee (R)</label>
          <input
            value={state.monthlyFee}
            onChange={(e) => onChange({ monthlyFee: e.target.value })}
            className="field-input w-full font-mono"
            placeholder="9500"
            inputMode="numeric"
          />
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>What the client pays /mo</p>
        </div>
        <div>
          <label className="eyebrow block mb-1.5">Setup / implementation fee (R)</label>
          <input
            value={state.setupFee}
            onChange={(e) => onChange({ setupFee: e.target.value })}
            className="field-input w-full font-mono"
            placeholder="100000"
            inputMode="numeric"
          />
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>One-off, invoiced separately</p>
        </div>
      </div>

      {/* Volume tier */}
      <div>
        <p className="eyebrow mb-3">Included quota (calls / type / month)</p>
        <div className="grid grid-cols-5 gap-1.5">
          {VOLUME_TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ volumeTier: t.id })}
              className="flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-all"
              style={state.volumeTier === t.id ? {
                background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border2)',
                color: 'var(--color-text3)',
              }}
            >
              <span className="text-[10px] font-bold">{t.label}</span>
              <span className="text-[9px] opacity-70 mt-0.5">{t.id}/mo</span>
            </button>
          ))}
        </div>
      </div>

      {/* API checks */}
      <div>
        <p className="eyebrow mb-3">API checks included</p>
        <div className="space-y-1.5">
          {CHECK_CATALOG.map((check) => {
            const active       = state.selectedChecks.includes(check.id);
            const pricePerUnit = rateWithMargin(check.baseRate);
            const contribution = Math.round(pricePerUnit * adjVolume);
            return (
              <button
                key={check.id}
                type="button"
                onClick={() => toggleCheck(check.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all"
                style={active ? {
                  background: 'rgba(124,58,237,0.10)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  color: 'var(--color-violet)',
                } : {
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--color-border2)',
                  color: 'var(--color-text2)',
                }}
              >
                <span className="flex items-center gap-2 text-left">
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={active ? { background: 'var(--color-violet)' } : { border: '1.5px solid var(--color-border2)' }}
                  >
                    {active ? <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5 5 4 7.5 8.5 2.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg> : null}
                  </span>
                  <span className="text-[12px] leading-tight">{check.label}</span>
                </span>
                <span className="text-[11px] font-mono shrink-0 ml-3 text-right" style={{ color: active ? 'var(--color-violet)' : 'var(--color-text3)' }}>
                  <span className="block">{fmtRc(pricePerUnit)}/chk</span>
                  <span className="block opacity-60 text-[10px]">{adjVolume} incl.</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Branches */}
      <div>
        <label className="eyebrow block mb-1.5">Additional branches</label>
        <div className="flex items-center gap-3">
          <input
            value={state.branches}
            onChange={(e) => onChange({ branches: e.target.value })}
            className="field-input w-24 font-mono"
            placeholder="1"
            inputMode="numeric"
          />
          <span className="text-xs" style={{ color: 'var(--color-text3)' }}>× {fmtR(BRANCH_RATE)}/branch/mo</span>
        </div>
      </div>

      {/* Custom items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Custom line items</p>
          <button
            type="button"
            onClick={addCustomItem}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
            style={{ color: 'var(--color-violet)', background: 'rgba(124,58,237,0.08)' }}
          >
            <Plus size={11} /> Add
          </button>
        </div>
        {state.customItems.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>No custom items.</p>
        ) : (
          <div className="space-y-2">
            {state.customItems.map((ci, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={ci.label} onChange={(e) => updateCustomItem(i, { label: e.target.value })} className="field-input flex-1 text-sm" placeholder="Description" />
                <input value={ci.amount || ''} onChange={(e) => updateCustomItem(i, { amount: parseInt(e.target.value.replace(/\D/g,''), 10) || 0 })} className="field-input w-24 font-mono text-sm" placeholder="0" inputMode="numeric" />
                <button type="button" onClick={() => updateCustomItem(i, { recurring: !ci.recurring })} className="text-[10px] px-2 py-1 rounded-lg font-semibold shrink-0 transition-colors"
                  style={ci.recurring ? { background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' } : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
                >{ci.recurring ? '/mo' : 'once'}</button>
                <button type="button" onClick={() => removeCustomItem(i)} className="p-1 rounded transition-colors" style={{ color: 'var(--color-text3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-red)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                ><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live cost breakdown */}
      <div className="tcv-card rounded-2xl p-5" style={{ border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 0 30px rgba(124,58,237,0.1)' }}>
        <p className="tcv-label text-[10px] font-bold uppercase tracking-wider mb-3">Cost breakdown preview</p>
        <div className="space-y-1 mb-3 text-xs" style={{ color: 'var(--color-text3)' }}>
          <div className="flex justify-between">
            <span>Platform fee ({tier.label}, {Math.round(adjVolume)} calls/type)</span>
            <span className="font-mono">{fmtR(flatFee)}/mo</span>
          </div>
          {branchExtra > 0 && (
            <div className="flex justify-between">
              <span>{branches - 1} additional branch{branches - 1 > 1 ? 'es' : ''}</span>
              <span className="font-mono">{fmtR(branchExtra)}/mo</span>
            </div>
          )}
          {customMo > 0 && (
            <div className="flex justify-between">
              <span>Custom recurring</span>
              <span className="font-mono">{fmtR(customMo)}/mo</span>
            </div>
          )}
          {customOnce > 0 && (
            <div className="flex justify-between">
              <span>Custom once-off</span>
              <span className="font-mono">{fmtR(customOnce)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between pt-3" style={{ borderTop: '1px solid rgba(124,58,237,0.2)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Total monthly</span>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{fmtR(totalMonthly)}/mo</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Year-one TCV</span>
          <span className="text-sm font-bold" style={{ color: 'var(--color-violet)' }}>{fmtR(setupFee + customOnce + totalMonthly * 12)}</span>
        </div>
      </div>

    </div>
  );
}
