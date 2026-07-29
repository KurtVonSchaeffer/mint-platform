'use client';

import { useState } from 'react';
import {
  X, Fingerprint, BadgeDollarSign, Paintbrush2, Puzzle, Globe2,
  FolderOpen, ClipboardCheck, ChevronRight, Loader2, ExternalLink,
  Check, ArrowRight, CircleDollarSign, Upload, AlertCircle,
} from 'lucide-react';
import { ALL_FEATURES, FEATURE_LABELS } from '@/lib/features';
import type { CreateClientInput } from '@/app/api/clients/route';

const TIERS = [
  {
    id: 'core',
    label: 'Starter',
    price: 1999,
    desc: 'Up to 2 branches · All API checks billed pay-as-you-use.',
    badge: null,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 14999,
    desc: 'Unlimited branches · 2,000 API checks/month included.',
    badge: 'Most popular',
  },
] as const;

const DEFAULT_FEATURES_BY_TIER: Record<string, string[]> = {
  core:       ['credit_scoring', 'e_contracts', 'term_loans'],
  enterprise: ALL_FEATURES as unknown as string[],
};

type Step = 'details' | 'tier' | 'branding' | 'features' | 'marketplace' | 'documents' | 'review' | 'done';

const STEPS: { id: Step; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'details',     label: 'Company details', desc: 'Name, contact, and portal URL',      icon: Fingerprint      },
  { id: 'tier',        label: 'Pricing tier',    desc: 'Choose a subscription plan',         icon: BadgeDollarSign  },
  { id: 'branding',    label: 'Branding',         desc: 'Colours and support address',        icon: Paintbrush2      },
  { id: 'features',    label: 'Features',         desc: 'Enable platform modules',            icon: Puzzle           },
  { id: 'marketplace', label: 'Marketplace',      desc: 'MINT lending-partner opt-in',        icon: Globe2           },
  { id: 'documents',   label: 'Documents',        desc: 'Compliance file uploads',            icon: FolderOpen       },
  { id: 'review',      label: 'Review',           desc: 'Confirm and create the client',      icon: ClipboardCheck   },
];

const REQUIRED_DOCS: { id: string; label: string; hint: string; required: boolean }[] = [
  { id: 'cipc_cert',      label: 'CIPC registration certificate', hint: 'Company registration document from CIPC',             required: true  },
  { id: 'director_id',    label: 'Director ID copy',              hint: "Clear copy of director's South African ID",            required: true  },
  { id: 'ncr_cert',       label: 'NCR lending licence',           hint: 'NCR registration certificate for credit providers',   required: true  },
  { id: 'bank_statement', label: '3 months bank statements',      hint: 'Business account statements — last 3 months',         required: true  },
  { id: 'signed_sla',     label: 'Signed service agreement',      hint: "We'll email a copy to sign — upload if already done", required: false },
];

const LOAN_TYPES = ['Personal', 'Payday', 'Business', 'Vehicle'];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}

interface Props {
  onClose:       () => void;
  onCreated:     () => void;
  initialValues?: { name?: string; contactEmail?: string; contactName?: string; legalName?: string };
  leadId?:       string;
}

export function OnboardingWizard({ onClose, onCreated, initialValues, leadId }: Props) {
  const [step, setStep]             = useState<Step>('details');
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ tenantUrl: string; clientName: string; marketplaceOptIn: boolean } | null>(null);

  const [name, setName]               = useState(initialValues?.name ?? '');
  const [slug, setSlug]               = useState(initialValues?.name ? slugify(initialValues.name) : '');
  const [slugEdited, setSlugEdited]   = useState(false);
  const [domain, setDomain]           = useState('');
  const [legalName, setLegalName]     = useState(initialValues?.legalName ?? '');
  const [contactEmail, setContactEmail] = useState(initialValues?.contactEmail ?? '');
  const [contactName, setContactName] = useState(initialValues?.contactName ?? '');
  const [ncrNumber, setNcrNumber]     = useState('');
  const [tier, setTier]               = useState<'core' | 'enterprise'>('core');
  const [monthlyFeeCents, setMonthlyFeeCents] = useState(1999 * 100);
  const [primaryColor, setPrimaryColor]     = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#1A1F36');
  const [supportEmail, setSupportEmail]     = useState('');
  const [features, setFeatures] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_FEATURES.map((f) => [f, DEFAULT_FEATURES_BY_TIER.core.includes(f)])),
  );
  const [docFiles, setDocFiles]           = useState<Record<string, File | null>>({});
  const [ncrOcrState, setNcrOcrState]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [ncrOcrExtracted, setNcrOcrExtracted] = useState<string | null>(null);
  const [mpOptIn, setMpOptIn]             = useState(false);
  const [mpLoanTypes, setMpLoanTypes]     = useState<string[]>([]);
  const [mpMaxAmount, setMpMaxAmount]     = useState('50000');
  const [lenderApiBaseUrl, setLenderApiBaseUrl] = useState('');
  const [lenderApiKey, setLenderApiKey]         = useState('');
  const [dbUrl, setDbUrl]                 = useState('');
  const [dbServiceKey, setDbServiceKey]   = useState('');
  const [vercelProjectId, setVercelProjectId] = useState('');

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

  async function runNcrOcr(file: File) {
    setNcrOcrState('loading');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/ocr/ncr', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.ncr_number) {
        setNcrOcrExtracted(data.ncr_number);
        if (!ncrNumber.trim()) setNcrNumber(data.ncr_number);
        setNcrOcrState('done');
      } else {
        setNcrOcrState('error');
      }
    } catch {
      setNcrOcrState('error');
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function submit() {
    setError(null); setSubmitting(true);
    const payload: CreateClientInput = {
      name: name.trim(), slug: slug.trim(), domain: domain.trim() || undefined,
      legal_name: legalName.trim() || undefined,
      contact_email: contactEmail.trim(), contact_name: contactName.trim() || undefined,
      ncr_number: ncrNumber.trim() || undefined, tier, monthly_fee_cents: monthlyFeeCents,
      primary_color: primaryColor, secondary_color: secondaryColor,
      support_email: supportEmail.trim() || undefined, features,
      marketplace_opt_in: mpOptIn,
      marketplace_config: mpOptIn ? { loan_types: mpLoanTypes, max_amount_cents: parseInt(mpMaxAmount || '0', 10) * 100 } : undefined,
      lender_api_base_url: lenderApiBaseUrl.trim() || undefined,
      lender_api_key: lenderApiKey.trim() || undefined,
      supabase_url: dbUrl.trim() || undefined,
      supabase_service_key: dbServiceKey.trim() || undefined,
      vercel_project_id: vercelProjectId.trim() || undefined,
    };
    try {
      const res  = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setSubmitting(false); return; }

      const clientId = data.client?.id;
      if (clientId) {
        const uploads = Object.entries(docFiles).filter(([, f]) => f != null);
        await Promise.allSettled(uploads.map(([docType, file]) => {
          const fd = new FormData();
          fd.append('client_id', clientId);
          fd.append('doc_type', docType);
          fd.append('file', file!);
          return fetch('/api/documents/upload', { method: 'POST', body: fd });
        }));
      }

      setResult({ tenantUrl: data.tenantUrl, clientName: name, marketplaceOptIn: mpOptIn });
      setStep('done');

      // Close the loop: mark the originating lead as won + converted so the
      // auto-commission fires and the TM's status reflects reality.
      if (leadId) {
        const commissionAmount = parseFloat((monthlyFeeCents * 0.25 / 100).toFixed(2));
        await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'won', tm_status: 'Converted', commission_amount: commissionAmount }),
        }).catch(() => {/* non-blocking */});
      }

      onCreated();
    } catch { setError('Network error — please try again.'); }
    finally  { setSubmitting(false); }
  }

  const nextDisabled =
    (step === 'details' && (!name.trim() || !slug.trim() || !contactEmail.trim())) ||
    (step === 'tier'    && !tier);

  const currentStep = STEPS.find((s) => s.id === step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', animation: 'fade-in 0.2s ease-out both' }}
      onClick={step === 'done' ? onClose : undefined}
    >
      <div
        className="w-full flex overflow-hidden rounded-2xl"
        style={{
          maxWidth: 860,
          maxHeight: '90vh',
          background: 'var(--color-surface)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
          animation: 'scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left rail ──────────────────────────────── */}
        <div
          className="flex flex-col shrink-0 p-6"
          style={{
            width: 220,
            background: 'rgba(0,0,0,0.25)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo / brand */}
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(167,139,250,0.5)' }}>
              AlgoLend
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>New client</p>
          </div>

          {/* Step list */}
          {step !== 'done' ? (
            <nav className="flex-1 space-y-0.5">
              {STEPS.map((s, i) => {
                const Icon   = s.icon;
                const active = s.id === step;
                const done   = i < stepIndex;

                return (
                  <div key={s.id} className="relative">
                    {/* Connecting line */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute left-[15px] top-[32px] w-px h-[calc(100%-4px)]"
                        style={{ background: done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)' }} />
                    )}
                    <button
                      className="relative w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-all"
                      style={active
                        ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }
                        : { border: '1px solid transparent' }}
                      onClick={() => done && setStep(s.id)}
                      disabled={!done && !active}
                    >
                      {/* Step circle */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                        style={
                          active ? { background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', boxShadow: '0 0 12px rgba(124,58,237,0.5)', color: '#fff' }
                        : done  ? { background: 'rgba(52,211,153,0.15)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.3)' }
                                : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text3)', border: '1px solid rgba(255,255,255,0.07)' }
                        }
                      >
                        {done
                          ? <Check size={12} strokeWidth={3} />
                          : <Icon size={12} />}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight" style={{
                          color: active ? 'var(--color-text)' : done ? 'var(--color-text2)' : 'var(--color-text3)',
                        }}>
                          {s.label}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </nav>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <Check size={22} strokeWidth={2.5} />
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-green)' }}>Client created</p>
            </div>
          )}

          {/* Company preview at bottom */}
          {name && step !== 'done' && (
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold mb-2"
                style={{ background: primaryColor, color: '#fff' }}>
                {name[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--color-text2)' }}>{name}</p>
              {slug && <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: 'var(--color-text3)' }}>{slug}</p>}
            </div>
          )}
        </div>

        {/* ── Right panel ─────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between px-8 pt-7 pb-5 shrink-0">
            {step !== 'done' && currentStep ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
                <h2 className="text-xl font-bold tracking-tight mb-0.5" style={{ color: 'var(--color-text)' }}>
                  {currentStep.label}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>{currentStep.desc}</p>
              </div>
            ) : step === 'done' ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'rgba(52,211,153,0.6)' }}>
                  All done
                </p>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {result?.clientName} is live
                </h2>
              </div>
            ) : null}

            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ml-4"
              style={{ color: 'var(--color-text3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Thin progress bar */}
          {step !== 'done' && (
            <div className="mx-8 mb-5 h-px rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-px rounded-full transition-all duration-500"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%`, background: 'linear-gradient(90deg,#7C3AED,#A78BFA)' }}
              />
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-8 pb-4" style={{ minHeight: 0 }}>

            {/* ── Step 1: Details ── */}
            {step === 'details' && (
              <div className="space-y-5">
                <F label="Company name *">
                  <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Zwane Financial Services" className="field-input" autoFocus />
                </F>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Contact email *">
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="ops@zwanefin.co.za" className="field-input" />
                  </F>
                  <F label="Contact name">
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Thembalethu Zwane" className="field-input" />
                  </F>
                </div>
                <F label="Legal name">
                  <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Zwane Financial Services (Pty) Ltd" className="field-input" />
                </F>
                <F label="NCR registration number">
                  <input value={ncrNumber} onChange={(e) => setNcrNumber(e.target.value)} placeholder="NCRCP22892" className="field-input font-mono" />
                </F>

                <Divider label="Portal & Domain" />

                <F label="Portal URL slug *" hint={slug ? `→ https://${slug}.algolend.co.za  ·  share with client to set up their custom domain` : undefined}>
                  <input
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true); }}
                    placeholder="e.g. zwane-financial"
                    className="field-input font-mono"
                  />
                </F>
                <F label="Custom domain (optional)" hint={domain ? `→ https://${domain}` : 'Add once the client has CNAMEd their domain to the portal'}>
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.\-]/g, ''))}
                    placeholder="e.g. zwanefin.co.za"
                    className="field-input font-mono"
                  />
                </F>

                <Divider label="Lender integration API" note="required for marketplace — ask the client's dev team to expose a scoped loan-intake endpoint" />

                <F label="Lender API base URL" hint="e.g. https://clientapp.vercel.app — must expose POST /api/integrations/loans">
                  <input className="field-input font-mono" value={lenderApiBaseUrl} onChange={(e) => setLenderApiBaseUrl(e.target.value)} placeholder="https://clientapp.vercel.app" />
                </F>
                <F label="Lender API key" hint="Scoped key the client issues for this integration — NOT their Supabase key. Stored server-side only.">
                  <input type="password" className="field-input font-mono" value={lenderApiKey} onChange={(e) => setLenderApiKey(e.target.value)} placeholder="the client's INTEGRATION_API_KEY" />
                </F>
                <F label="Vercel project ID" hint="prj_xxx — used for API usage tracking">
                  <input className="field-input font-mono" value={vercelProjectId} onChange={(e) => setVercelProjectId(e.target.value)} placeholder="prj_xxxxxxxxxxxxxxxxxxxx" />
                </F>

                <Divider
                  label="Legacy direct database access"
                  note="deprecated — only fill these in if the client hasn't built a Lender API endpoint yet. Grants MINT full read/write access to their database; avoid for new clients."
                />
                <F label="Supabase URL (legacy)">
                  <input className="field-input font-mono" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} placeholder="https://xxxxxxxxxxxx.supabase.co" />
                </F>
                <F label="Service role key (legacy)" hint="Full database access — prefer the Lender API key above instead">
                  <input type="password" className="field-input font-mono" value={dbServiceKey} onChange={(e) => setDbServiceKey(e.target.value)} placeholder="eyJhbGci…" />
                </F>
              </div>
            )}

            {/* ── Step 2: Tier ── */}
            {step === 'tier' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {TIERS.map((t) => {
                    const selected = tier === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTierChange(t.id)}
                        className="w-full text-left rounded-xl transition-all"
                        style={selected ? {
                          background: 'rgba(124,58,237,0.1)',
                          border: '1.5px solid rgba(124,58,237,0.45)',
                          boxShadow: '0 0 24px rgba(124,58,237,0.08)',
                          padding: '16px 18px',
                        } : {
                          background: 'rgba(255,255,255,0.02)',
                          border: '1.5px solid rgba(255,255,255,0.07)',
                          padding: '16px 18px',
                        }}
                        onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.25)'; }}
                        onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                              style={selected ? { borderColor: 'var(--color-purple)', background: 'var(--color-purple)' } : { borderColor: 'var(--color-border)' }}>
                              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t.label}</span>
                            {t.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>
                                {t.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-base" style={{ color: selected ? '#A78BFA' : 'var(--color-text2)' }}>
                              {fmt(t.price * 100)}
                            </span>
                            <span className="text-xs ml-0.5" style={{ color: 'var(--color-text3)' }}>/mo</span>
                          </div>
                        </div>
                        <p className="text-xs ml-6.5" style={{ color: 'var(--color-text3)', marginLeft: 26 }}>{t.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <F label="Custom monthly fee (ZAR)" hint="Override the tier default if negotiated differently">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none" style={{ color: 'var(--color-text3)' }}>R</span>
                    <input
                      type="number" min={0} step={500}
                      value={monthlyFeeCents === 0 ? '' : monthlyFeeCents / 100}
                      placeholder="0"
                      onFocus={e => e.target.select()}
                      onChange={(e) => setMonthlyFeeCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                      className="field-input pl-8"
                    />
                  </div>
                </F>
              </div>
            )}

            {/* ── Step 3: Branding ── */}
            {step === 'branding' && (
              <div className="space-y-5">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text2)' }}>
                  These colours populate the client's portal theme and can be updated later from client settings.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <F label="Primary colour">
                    <div className="flex items-center gap-3">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer p-0.5 shrink-0"
                        style={{ border: '1px solid var(--color-border)', background: 'transparent' }} />
                      <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="field-input font-mono flex-1" placeholder="#7C3AED" />
                    </div>
                  </F>
                  <F label="Secondary colour">
                    <div className="flex items-center gap-3">
                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer p-0.5 shrink-0"
                        style={{ border: '1px solid var(--color-border)', background: 'transparent' }} />
                      <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="field-input font-mono flex-1" placeholder="#1A1F36" />
                    </div>
                  </F>
                </div>

                <F label="Support email">
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@zwanefin.co.za" className="field-input" />
                </F>

                {/* Brand preview */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ background: secondaryColor }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: primaryColor }}>
                        {name[0]?.toUpperCase() || 'C'}
                      </div>
                      <span className="text-xs font-bold text-white opacity-90">{name || 'Client Name'}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-40 text-white">{domain || `${slug || 'client'}.algolend.co.za`}</span>
                  </div>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div>
                      <p className="text-xs font-semibold text-white mb-0.5">Portal preview</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Brand colours applied to client portal</p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: primaryColor }}>
                      Sign in
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Features ── */}
            {step === 'features' && (
              <div className="space-y-1">
                <p className="text-xs mb-4 pb-4" style={{ color: 'var(--color-text3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Pre-populated from the {tier === 'core' ? 'Starter' : 'Enterprise'} tier. Toggle to customise.
                  <span className="ml-2 font-semibold" style={{ color: 'var(--color-violet)' }}>
                    {ALL_FEATURES.filter((f) => features[f]).length}/{ALL_FEATURES.length} enabled
                  </span>
                </p>
                {ALL_FEATURES.map((flag) => {
                  const enabled = features[flag] ?? false;
                  return (
                    <button key={flag} onClick={() => toggleFeature(flag)}
                      className="w-full flex items-center justify-between gap-4 py-2.5 px-3 rounded-xl transition-all text-left"
                      style={{ border: '1px solid transparent' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
                    >
                      <span className="text-sm" style={{ color: enabled ? 'var(--color-text)' : 'var(--color-text3)' }}>
                        {FEATURE_LABELS[flag]}
                      </span>
                      <div className="relative w-9 h-5 rounded-full transition-colors shrink-0" style={{ background: enabled ? 'var(--color-purple)' : 'var(--color-border)' }}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Step 5: Marketplace ── */}
            {step === 'marketplace' && (
              <div className="space-y-5">
                <div className="rounded-xl p-5" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                  <p className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text)' }}>AlgoLend Marketplace</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text2)' }}>
                    Mint originates and underwrites personal loans through its consumer app. By joining the marketplace,
                    you become a lending partner — your capital is deployed to pre-qualified Mint borrowers and you earn
                    the interest. Mint handles origination, collections, and compliance.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {([true, false] as const).map((opt) => (
                    <button key={String(opt)} onClick={() => setMpOptIn(opt)}
                      className="p-4 rounded-xl text-left transition-all"
                      style={mpOptIn === opt
                        ? (opt
                          ? { background: 'rgba(124,58,237,0.1)', border: '1.5px solid rgba(124,58,237,0.4)' }
                          : { background: 'var(--color-card-hover)', border: '1.5px solid var(--color-border)' })
                        : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.06)' }}
                      onMouseEnter={(e) => { if (mpOptIn !== opt) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.2)'; }}
                      onMouseLeave={(e) => { if (mpOptIn !== opt) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                          style={mpOptIn === opt
                            ? (opt ? { borderColor: 'var(--color-purple)', background: 'var(--color-purple)' } : { borderColor: 'var(--color-border)', background: 'var(--color-card-hover)' })
                            : { borderColor: 'var(--color-border)' }}>
                          {mpOptIn === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <p className="font-semibold text-sm" style={{ color: opt ? 'var(--color-violet)' : 'var(--color-text2)' }}>
                          {opt ? 'Join the marketplace' : 'Skip for now'}
                        </p>
                      </div>
                      <p className="text-xs ml-6" style={{ color: 'var(--color-text3)' }}>
                        {opt ? 'Deploy capital to MINT-originated loans.' : 'Can be enabled later from client settings.'}
                      </p>
                    </button>
                  ))}
                </div>

                {mpOptIn && (
                  <div className="space-y-4 rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.1)' }}>
                    <F label="Maximum loan amount per borrower (R)">
                      <input type="number" value={mpMaxAmount} onChange={(e) => setMpMaxAmount(e.target.value)} placeholder="50000" className="field-input font-mono" />
                    </F>
                    <F label="Loan types you will fund">
                      <div className="flex flex-wrap gap-2 mt-1">
                        {LOAN_TYPES.map((lt) => {
                          const on = mpLoanTypes.includes(lt);
                          return (
                            <button key={lt} onClick={() => setMpLoanTypes((p) => on ? p.filter((x) => x !== lt) : [...p, lt])}
                              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                              style={on ? { background: 'var(--color-purple)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {lt}
                            </button>
                          );
                        })}
                      </div>
                    </F>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 6: Documents ── */}
            {step === 'documents' && (
              <div className="space-y-3">
                <p className="text-xs pb-4 leading-relaxed" style={{ color: 'var(--color-text3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Required documents must be uploaded before the client can be activated. All files are stored securely.
                </p>
                {REQUIRED_DOCS.map((doc) => {
                  const file = docFiles[doc.id] ?? null;
                  return (
                    <label key={doc.id} className="block cursor-pointer group">
                      <div
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all"
                        style={file
                          ? { borderColor: 'rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.04)' }
                          : { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                          style={file
                            ? { background: 'rgba(52,211,153,0.12)', color: 'var(--color-green)' }
                            : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text3)' }}>
                          {file ? <Check size={14} strokeWidth={2.5} /> : <Upload size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                            {doc.label}
                            {doc.required && (
                              <span className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.12)', color: 'var(--color-red)' }}>
                                required
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: file ? 'var(--color-green)' : 'var(--color-text3)' }}>
                            {file ? file.name : doc.hint}
                          </p>
                        </div>
                        {file ? (
                          <button type="button"
                            onClick={(e) => { e.preventDefault(); setDocFiles((p) => ({ ...p, [doc.id]: null })); }}
                            className="shrink-0 text-xs px-2.5 py-1 rounded-lg transition-all"
                            style={{ color: 'var(--color-text3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            Remove
                          </button>
                        ) : (
                          <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text3)' }} />
                        )}
                      </div>
                      <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setDocFiles((p) => ({ ...p, [doc.id]: f }));
                          if (doc.id === 'ncr_cert' && f) {
                            setNcrOcrState('idle');
                            setNcrOcrExtracted(null);
                            runNcrOcr(f);
                          }
                          if (doc.id === 'ncr_cert' && !f) {
                            setNcrOcrState('idle');
                            setNcrOcrExtracted(null);
                          }
                          e.target.value = '';
                        }} />
                    </label>
                  );
                })}
                {ncrOcrState === 'loading' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--color-violet)' }}>
                    <Loader2 size={12} className="animate-spin shrink-0" />
                    Reading NCR certificate — NCR number will auto-fill…
                  </div>
                )}
                {ncrOcrState === 'done' && ncrOcrExtracted && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--color-green)' }}>
                    <Check size={12} className="shrink-0" strokeWidth={2.5} />
                    NCR number extracted: <span className="font-mono font-bold ml-1">{ncrOcrExtracted}</span>
                    <span className="ml-1" style={{ color: 'var(--color-text3)' }}>— pre-filled in Details step</span>
                  </div>
                )}
                {ncrOcrState === 'error' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}>
                    <AlertCircle size={12} className="shrink-0" />
                    Couldn&apos;t read NCR number automatically — please enter it manually in the Details step.
                  </div>
                )}
                <p className="text-[11px] pt-1" style={{ color: 'var(--color-text3)' }}>
                  Accepted: PDF, JPG, PNG, Word. Missing documents can be uploaded later from the client profile.
                </p>
              </div>
            )}

            {/* ── Step 7: Review ── */}
            {step === 'review' && (
              <div className="space-y-0">
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  {[
                    { label: 'Company',      value: name },
                    { label: 'Portal URL',   value: `${slug}.algolend.co.za`, mono: true },
                    ...(domain   ? [{ label: 'Custom domain', value: domain,   mono: true }] : []),
                    ...(legalName ? [{ label: 'Legal name',   value: legalName }] : []),
                    { label: 'Contact',      value: `${contactName || '—'} · ${contactEmail}` },
                    ...(ncrNumber ? [{ label: 'NCR number', value: ncrNumber, mono: true }] : []),
                    { label: 'Tier',         value: `${tier === 'core' ? 'Starter' : 'Enterprise'} · ${fmt(monthlyFeeCents)}/mo` },
                    { label: 'Marketplace',  value: mpOptIn ? `Opted in · ${mpLoanTypes.length > 0 ? mpLoanTypes.join(', ') : 'all loan types'} · max R${parseInt(mpMaxAmount || '0', 10).toLocaleString()}` : 'Not participating' },
                    { label: 'Lender API',   value: lenderApiBaseUrl ? `${lenderApiBaseUrl.replace(/^https?:\/\//, '')} · key set` : (dbUrl ? 'Legacy direct DB access only' : 'Not configured'), mono: !!lenderApiBaseUrl },
                  ].map(({ label, value, mono }, i, arr) => (
                    <div key={label} className="flex items-start gap-3 px-4 py-3"
                      style={i < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : undefined}>
                      <span className="text-xs font-medium w-28 shrink-0 pt-0.5" style={{ color: 'var(--color-text3)' }}>{label}</span>
                      <span className={`text-sm flex-1 ${mono ? 'font-mono' : 'font-medium'}`} style={{ color: 'var(--color-text)' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Feature chips */}
                <div className="pt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text3)' }}>
                    Features ({ALL_FEATURES.filter((f) => features[f]).length}/{ALL_FEATURES.length} enabled)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_FEATURES.filter((f) => features[f]).map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(52,211,153,0.08)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.15)' }}>
                        {FEATURE_LABELS[f]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Brand colours */}
                <div className="pt-3 flex items-center gap-2">
                  <span className="text-xs font-medium w-28 shrink-0" style={{ color: 'var(--color-text3)' }}>Brand colours</span>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded" style={{ backgroundColor: primaryColor, border: '1px solid var(--color-border)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{primaryColor}</span>
                    <span className="w-5 h-5 rounded" style={{ backgroundColor: secondaryColor, border: '1px solid var(--color-border)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text2)' }}>{secondaryColor}</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 mt-4 rounded-xl px-4 py-3 text-sm"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}>
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Done ── */}
            {step === 'done' && result && (
              <div className="py-4 space-y-5">
                <p className="text-sm" style={{ color: 'var(--color-text2)' }}>
                  Tenant created, feature flags seeded, and portal URL is ready to share.
                </p>
                <a href={result.tenantUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 btn-purple btn-shine">
                  <ExternalLink size={13} />
                  {result.tenantUrl}
                </a>
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                  Status: Trial · DNS propagation may take up to 5 minutes.
                </p>
                {result.marketplaceOptIn && (
                  <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--color-violet)' }}>
                    <p className="font-bold mb-0.5">Marketplace policy drafted</p>
                    <p style={{ color: 'var(--color-text3)' }}>
                      Default credit rules created. Review rates in <strong style={{ color: 'var(--color-violet)' }}>Marketplace → Lender Policies</strong>, then toggle active to go live.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-5 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
            {step !== 'done' ? (
              <>
                <button
                  onClick={() => { const prev = STEPS[stepIndex - 1]; if (prev) setStep(prev.id); else onClose(); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                >
                  {stepIndex === 0 ? 'Cancel' : '← Back'}
                </button>

                {step === 'review' ? (
                  <button onClick={submit} disabled={submitting}
                    className="btn-purple btn-shine inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
                    {submitting ? 'Creating…' : 'Create client'}
                  </button>
                ) : (
                  <button
                    onClick={() => { setError(null); const next = STEPS[stepIndex + 1]; if (next) setStep(next.id); }}
                    disabled={nextDisabled}
                    className="btn-purple btn-shine inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue <ChevronRight size={14} />
                  </button>
                )}
              </>
            ) : (
              <div className="w-full flex justify-end">
                <button onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function F({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--color-text2)' }}>{label}</label>}
      {children}
      {hint && <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text3)' }}>{hint}</p>}
    </div>
  );
}

function Divider({ label: _label, note: _note }: { label?: string; note?: string }) {
  return <div className="h-px" style={{ background: 'var(--color-border2)' }} />;
}
