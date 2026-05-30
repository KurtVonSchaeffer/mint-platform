'use client';

import { useState } from 'react';
import { X, Building2, Layers, Palette, Zap, CheckCircle2, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { ALL_FEATURES, FEATURE_LABELS } from '@/lib/features';
import type { CreateClientInput } from '@/app/api/clients/route';

const TIERS = [
  { id: 'core',       label: 'Core',       price: 8500,  desc: 'Essential lending ops — up to 3 branches, basic reporting.' },
  { id: 'growth',     label: 'Growth',     price: 22000, desc: 'Full bureau + open banking + multi-branch + WhatsApp.' },
  { id: 'enterprise', label: 'Enterprise', price: 45000, desc: 'Everything + biometric KYC + dedicated SLA + custom integrations.' },
] as const;

const DEFAULT_FEATURES_BY_TIER: Record<string, string[]> = {
  core:       ['credit_scoring', 'e_contracts', 'term_loans'],
  growth:     ['credit_scoring', 'e_contracts', 'open_banking', 'sacrra_bureau', 'multi_branch', 'term_loans', 'whatsapp_notify'],
  enterprise: ALL_FEATURES as unknown as string[],
};

type Step = 'details' | 'tier' | 'branding' | 'features' | 'review' | 'done';

const STEPS: { id: Step; label: string; icon: typeof Building2 }[] = [
  { id: 'details',  label: 'Details',  icon: Building2 },
  { id: 'tier',     label: 'Tier',     icon: Layers    },
  { id: 'branding', label: 'Branding', icon: Palette   },
  { id: 'features', label: 'Features', icon: Zap       },
  { id: 'review',   label: 'Review',   icon: CheckCircle2 },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}

interface Props {
  onClose:   () => void;
  onCreated: () => void;
}

export function OnboardingWizard({ onClose, onCreated }: Props) {
  const [step, setStep]               = useState<Step>('details');
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<{ tenantUrl: string; clientName: string } | null>(null);

  const [name, setName]               = useState('');
  const [slug, setSlug]               = useState('');
  const [slugEdited, setSlugEdited]   = useState(false);
  const [legalName, setLegalName]     = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [ncrNumber, setNcrNumber]     = useState('');
  const [tier, setTier]               = useState<'core' | 'growth' | 'enterprise'>('growth');
  const [monthlyFeeCents, setMonthlyFeeCents] = useState(22000 * 100);
  const [primaryColor, setPrimaryColor]   = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#1A1F36');
  const [supportEmail, setSupportEmail]   = useState('');
  const [features, setFeatures] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_FEATURES.map((f) => [f, DEFAULT_FEATURES_BY_TIER.growth.includes(f)])),
  );

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  }

  function handleTierChange(t: typeof tier) {
    setTier(t);
    const defaults = DEFAULT_FEATURES_BY_TIER[t];
    setFeatures(Object.fromEntries(ALL_FEATURES.map((f) => [f, defaults.includes(f)])));
    setMonthlyFeeCents(TIERS.find((x) => x.id === t)!.price * 100);
  }

  function toggleFeature(flag: string) {
    setFeatures((prev) => ({ ...prev, [flag]: !prev[flag] }));
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function submit() {
    setError(null); setSubmitting(true);
    const payload: CreateClientInput = {
      name: name.trim(), slug: slug.trim(), legal_name: legalName.trim() || undefined,
      contact_email: contactEmail.trim(), contact_name: contactName.trim() || undefined,
      ncr_number: ncrNumber.trim() || undefined, tier, monthly_fee_cents: monthlyFeeCents,
      primary_color: primaryColor, secondary_color: secondaryColor,
      support_email: supportEmail.trim() || undefined, features,
    };
    try {
      const res  = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setSubmitting(false); return; }
      setResult({ tenantUrl: data.tenantUrl, clientName: name }); setStep('done'); onCreated();
    } catch { setError('Network error — please try again.'); }
    finally  { setSubmitting(false); }
  }

  return (
    <div
      className="fixed inset-0 confirm-backdrop z-50 flex items-center justify-center p-4"
      style={{ animation: 'fade-in 0.2s ease-out both' }}
      onClick={step === 'done' ? onClose : undefined}
    >
      <div
        className="bento-card w-full max-w-xl overflow-hidden"
        style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid var(--color-border2)' }}
        >
          <div>
            <p className="eyebrow mb-0.5">New client</p>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Onboarding wizard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'done' && (
          <div
            className="flex items-center gap-0 px-7 py-4 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--color-border2)' }}
          >
            {STEPS.map((s, i) => {
              const Icon  = s.icon;
              const active = s.id === step;
              const done   = i < stepIndex;
              return (
                <div key={s.id} className="flex items-center gap-0 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                      style={active ? {
                        background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                      } : done ? {
                        background: 'rgba(52,211,153,0.15)',
                        color: 'var(--color-green)',
                      } : {
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--color-text3)',
                      }}
                    >
                      {done ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: active ? 'var(--color-text)' : done ? 'var(--color-green)' : 'var(--color-text3)' }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={13} className="mx-2 shrink-0" style={{ color: 'var(--color-text3)' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="p-7 max-h-[60vh] overflow-y-auto">

          {/* ── Step 1: Details ── */}
          {step === 'details' && (
            <div className="space-y-4">
              <Field label="Company name *">
                <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. BridgeCapital Finance" className="field-input" />
              </Field>
              <Field label="URL slug *" hint={slug ? `→ https://${slug}.algolend.co.za` : undefined}>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true); }}
                  placeholder="e.g. bridgecapital"
                  className="field-input font-mono"
                />
              </Field>
              <Field label="Legal name">
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="BridgeCapital Finance (Pty) Ltd" className="field-input" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact email *">
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="ops@bridgecap.co.za" className="field-input" />
                </Field>
                <Field label="Contact name">
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" className="field-input" />
                </Field>
              </div>
              <Field label="NCR registration number">
                <input value={ncrNumber} onChange={(e) => setNcrNumber(e.target.value)} placeholder="NCRCP22892" className="field-input font-mono" />
              </Field>
            </div>
          )}

          {/* ── Step 2: Tier ── */}
          {step === 'tier' && (
            <div className="space-y-3">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTierChange(t.id)}
                  className="w-full text-left p-4 rounded-xl border-2 transition-all"
                  style={tier === t.id ? {
                    borderColor: 'rgba(124,58,237,0.5)',
                    background: 'rgba(124,58,237,0.08)',
                    boxShadow: '0 0 20px rgba(124,58,237,0.1)',
                  } : {
                    borderColor: 'var(--color-border2)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => { if (tier !== t.id) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
                  onMouseLeave={(e) => { if (tier !== t.id) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm capitalize" style={{ color: 'var(--color-text)' }}>{t.label}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>{fmt(t.price * 100)}/mo</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{t.desc}</p>
                </button>
              ))}
              <Field label="Custom monthly fee (ZAR)" hint="Override the tier default if negotiated differently">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text3)' }}>R</span>
                  <input
                    type="number"
                    value={monthlyFeeCents / 100}
                    onChange={(e) => setMonthlyFeeCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="field-input pl-7"
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 3: Branding ── */}
          {step === 'branding' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
                These colours populate the client's portal theme. They can be changed later from the client settings panel.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary colour">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer p-0.5"
                      style={{ border: '1px solid var(--color-border2)', background: 'var(--color-surface2)' }}
                    />
                    <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="field-input font-mono flex-1" placeholder="#7C3AED" />
                  </div>
                </Field>
                <Field label="Secondary colour">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer p-0.5"
                      style={{ border: '1px solid var(--color-border2)', background: 'var(--color-surface2)' }}
                    />
                    <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="field-input font-mono flex-1" placeholder="#1A1F36" />
                  </div>
                </Field>
              </div>
              <Field label="Support email">
                <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@bridgecap.co.za" className="field-input" />
              </Field>
              {/* Live preview */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                <div className="p-4 text-white text-sm font-semibold" style={{ backgroundColor: secondaryColor }}>
                  Portal preview
                </div>
                <div className="p-4 bg-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: primaryColor }} />
                  <div>
                    <div className="text-sm font-bold text-slate-900">{name || 'Client name'}</div>
                    <div className="text-xs text-slate-400">{slug ? `${slug}.algolend.co.za` : 'subdomain.algolend.co.za'}</div>
                  </div>
                  <button className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Features ── */}
          {step === 'features' && (
            <div className="space-y-1">
              <p className="text-xs mb-3" style={{ color: 'var(--color-text3)' }}>
                Pre-populated from the {tier} tier. Toggle to customise.
              </p>
              {ALL_FEATURES.map((flag) => {
                const enabled = features[flag] ?? false;
                return (
                  <button
                    key={flag}
                    onClick={() => toggleFeature(flag)}
                    className="w-full flex items-center justify-between gap-4 py-3 px-3 rounded-xl transition-colors text-left"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-text2)' }}>{FEATURE_LABELS[flag]}</span>
                    <div
                      role="switch"
                      aria-checked={enabled}
                      className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                      style={{ background: enabled ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <ReviewRow label="Company"  value={name} />
              <ReviewRow label="Slug / URL" value={`${slug}.algolend.co.za`} mono />
              {legalName && <ReviewRow label="Legal name" value={legalName} />}
              <ReviewRow label="Contact"  value={`${contactName || '—'} · ${contactEmail}`} />
              {ncrNumber && <ReviewRow label="NCR number" value={ncrNumber} mono />}
              <ReviewRow label="Tier"     value={`${tier.charAt(0).toUpperCase() + tier.slice(1)} — ${fmt(monthlyFeeCents)}/mo`} />
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium w-28 shrink-0" style={{ color: 'var(--color-text3)' }}>Brand colours</span>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md" style={{ backgroundColor: primaryColor, border: '1px solid var(--color-border2)' }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{primaryColor}</span>
                  <span className="w-5 h-5 rounded-md" style={{ backgroundColor: secondaryColor, border: '1px solid var(--color-border2)' }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{secondaryColor}</span>
                </div>
              </div>
              <div className="pt-1">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text3)' }}>
                  Features enabled ({ALL_FEATURES.filter((f) => features[f]).length}/{ALL_FEATURES.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_FEATURES.filter((f) => features[f]).map((f) => (
                    <span
                      key={f}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }}
                    >
                      {FEATURE_LABELS[f]}
                    </span>
                  ))}
                </div>
              </div>
              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && result && (
            <div className="text-center py-4">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)' }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>
                {result.clientName} is live
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text3)' }}>
                Tenant created, feature flags seeded, and portal URL ready. Share the link with the client to begin onboarding.
              </p>
              <a
                href={result.tenantUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 btn-purple btn-shine"
              >
                <ExternalLink size={14} />
                {result.tenantUrl}
              </a>
              <p className="text-xs mt-4" style={{ color: 'var(--color-text3)' }}>
                Status: Trial · DNS propagation may take up to 5 minutes.
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step !== 'done' && (
          <div
            className="px-7 py-5 flex justify-between items-center"
            style={{ borderTop: '1px solid var(--color-border2)' }}
          >
            <button
              onClick={() => {
                const prev = STEPS[stepIndex - 1];
                if (prev) setStep(prev.id); else onClose();
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </button>

            {step === 'review' ? (
              <button
                onClick={submit}
                disabled={submitting}
                className="btn-purple btn-shine inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {submitting ? 'Creating…' : 'Create client'}
              </button>
            ) : (
              <button
                onClick={() => { setError(null); const next = STEPS[stepIndex + 1]; if (next) setStep(next.id); }}
                disabled={
                  (step === 'details' && (!name.trim() || !slug.trim() || !contactEmail.trim())) ||
                  (step === 'tier' && !tier)
                }
                className="btn-purple btn-shine inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="px-7 py-5 flex justify-end" style={{ borderTop: '1px solid var(--color-border2)' }}>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>{label}</label>
      {children}
      {hint && <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--color-text3)' }}>{hint}</p>}
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium w-28 shrink-0 pt-0.5" style={{ color: 'var(--color-text3)' }}>{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : 'font-medium'}`} style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
