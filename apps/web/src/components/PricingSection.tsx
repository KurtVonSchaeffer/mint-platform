'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Zap, Star } from 'lucide-react';
import { Reveal } from '@/components/Reveal';

/* ─── Tier data ─────────────────────────────────────────────────── */
const tiers = [
  {
    id: 'core',
    eyebrow: 'Core',
    headline: 'Get started',
    desc: 'Everything a registered credit provider needs to start lending digitally.',
    from: 'From R 8,000 /mo',
    recommended: false,
    features: [
      'Credit scoring engine',
      'Borrower application portal',
      'Term loans & working capital',
      'SACRRA bureau reporting',
      'NCA-compliant quotations',
      'Loan book & repayment tracking',
      'NCR audit trail',
      '1 branch',
    ],
  },
  {
    id: 'growth',
    eyebrow: 'Growth',
    headline: 'Scale your operation',
    desc: 'Multi-branch operations, open banking, e-contracts, and automated compliance.',
    from: 'From R 18,000 /mo',
    recommended: true,
    features: [
      'Everything in Core',
      'Open banking — TruID affordability',
      'E-contracts via DocuSeal',
      'Multi-branch management',
      'WhatsApp loan notifications',
      'Invoice finance product',
      'Sure Systems EFT integration',
      'Unlimited branches',
    ],
  },
  {
    id: 'enterprise',
    eyebrow: 'Enterprise',
    headline: 'Full platform',
    desc: 'The complete suite for high-volume lenders with complex risk frameworks.',
    from: 'Custom pricing',
    recommended: false,
    features: [
      'Everything in Growth',
      'Biometric KYC (liveness + DHA)',
      'Advanced analytics dashboard',
      'Custom credit scorecard builder',
      'PEPs & sanctions screening',
      'Dedicated implementation team',
      'SLA-backed support',
      'White-glove onboarding',
    ],
  },
] as const;

/* ─── Tier card ─────────────────────────────────────────────────── */
function TierCard({ tier, index }: { tier: typeof tiers[number]; index: number }) {
  const [hovered, setHovered] = useState(false);

  if (tier.recommended) {
    return (
      <Reveal delay={index * 80}>
        <div
          className="relative flex flex-col h-full"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Spinning gradient border */}
          <div
            className="absolute -inset-[2px] rounded-[22px] pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
            aria-hidden
          >
            <div
              style={{
                position: 'absolute',
                inset: '-100%',
                background: 'conic-gradient(from 0deg, #7C3AED, #A78BFA, #C4B5FD, #7C3AED)',
                animation: 'border-spin 4s linear infinite',
                opacity: hovered ? 1 : 0.8,
              }}
            />
          </div>
          {/* Ambient glow */}
          <div
            className="absolute -inset-4 rounded-3xl pointer-events-none transition-opacity duration-500"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.35) 0%, transparent 70%)',
              opacity: hovered ? 1 : 0.5,
              filter: 'blur(20px)',
              animation: 'glow-pulse 3s ease-in-out infinite',
            }}
            aria-hidden
          />

          <div
            className="relative bento-card bento-card-dark p-8 flex flex-col h-full overflow-hidden transition-transform duration-300"
            style={{ transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }}
          >
            {/* Top ambient glow */}
            <div
              className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)' }}
              aria-hidden
            />

            <div className="relative mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow" style={{ color: '#A78BFA' }}>{tier.eyebrow}</p>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}
                >
                  <Star size={9} style={{ fill: '#A78BFA' }} />
                  Recommended
                </span>
              </div>
              <p className="text-2xl font-semibold tracking-tight mb-1 text-white">{tier.headline}</p>
              <p className="text-sm text-white/60 leading-relaxed mb-3">{tier.desc}</p>
              <div
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}
              >
                <Zap size={10} style={{ color: '#A78BFA' }} />
                {tier.from}
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-8 relative">
              {tier.features.map((f, i) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                  <Check size={13} className="mt-0.5 shrink-0" style={{ color: '#A78BFA' }} />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="#enquire"
              className="relative inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3.5 rounded-full text-white transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)',
                boxShadow: hovered
                  ? '0 12px 32px rgba(124,58,237,0.6)'
                  : '0 8px 24px rgba(124,58,237,0.4)',
              }}
            >
              Get a quote
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={index * 80}>
      <div
        className="bento-card p-8 flex flex-col h-full transition-all duration-300"
        style={{
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hovered
            ? '0 20px 60px -16px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)'
            : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="mb-6">
          <p className="eyebrow mb-2">{tier.eyebrow}</p>
          <p className="text-2xl font-semibold tracking-tight mb-1">{tier.headline}</p>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-3">{tier.desc}</p>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-ink-soft)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Zap size={10} style={{ color: 'var(--color-brand)' }} />
            {tier.from}
          </div>
        </div>

        <ul className="space-y-2.5 flex-1 mb-8">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
              <Check size={13} className="text-[var(--color-brand)] mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <Link
          href="#enquire"
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          Get a quote <ArrowRight size={13} />
        </Link>
      </div>
    </Reveal>
  );
}

/* ─── Exported section ──────────────────────────────────────────── */
export function PricingSection() {
  return (
    <section id="pricing" className="bg-[var(--color-bg)] py-24">
      <div className="max-w-[1200px] mx-auto px-6">

        <Reveal>
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="eyebrow mb-4">Pricing</p>
            <h2 className="headline text-5xl lg:text-6xl font-semibold mb-5">
              Three tiers.<br />
              One platform.
            </h2>
            <p className="text-lg text-[var(--color-ink-soft)]">
              Every deployment is quoted on scope — choose the tier that fits your credit operation,
              then we build it to spec.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-3 gap-5 max-w-5xl mx-auto items-stretch">
          {tiers.map((tier, i) => (
            <TierCard key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        <Reveal delay={200}>
          <div className="mt-10 max-w-5xl mx-auto grid sm:grid-cols-2 gap-4">
            <div className="bento-card p-6">
              <p className="eyebrow mb-2">i. One-off implementation</p>
              <p className="text-base font-semibold mb-2 tracking-tight">Quoted on scope</p>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Branding, scorecard configuration, integrations, UAT, and go-live support. Priced on
                what we build.
              </p>
            </div>
            <div className="bento-card p-6">
              <p className="eyebrow mb-2">ii. Pass-through API costs</p>
              <p className="text-base font-semibold mb-2 tracking-tight">At cost, no markup</p>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Experian, TruID, DocuSeal, and SACRRA charges are passed through at provider cost.
                Transparent billing.
              </p>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
