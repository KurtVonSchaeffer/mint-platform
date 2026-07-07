'use client';

import Link from 'next/link';
import { Check, ArrowRight, Zap, Minus } from 'lucide-react';
import { Reveal } from '@/components/Reveal';

const STARTER_FEATURES = [
  'SACRRA bureau reporting (auto-28th)',
  'Credit scoring engine',
  'Borrower application portal',
  'Term loans',
  'Working capital applications',
  'NCA-compliant quotations & audit trail',
  'Bureau enquiry (Experian)',
  'AML / Watchlist: PEPs & sanctions (included)',
  'Address verification',
  'AI bank statement analysis for affordability',
  'Built-in e-signing & digital contracts',
  'Full KYC: liveness, ID & phone verification',
  'Automated emails: onboarding stages & repayment reminders',
  'Loan book & repayment tracking',
  'DebiCheck integration',
  'Up to 2 branches',
  'Pay-as-you-use API checks',
];

const ENTERPRISE_FEATURES = [
  'Everything in Starter',
  '2,000 API checks / month included',
  'Liveness + Home Affairs (DHA) verification',
  'Unlimited branches',
  'Priority onboarding & dedicated support',
  'Custom scorecard configuration',
  'White-label branding',
  '99% platform uptime',
];



export function PricingSection() {
  return (
    <section id="pricing" className="bg-[var(--color-bg)] py-24">
      <div className="max-w-[1200px] mx-auto px-6">

        <Reveal>
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="eyebrow mb-4">Pricing</p>
            <h2 className="headline text-4xl md:text-5xl lg:text-6xl font-semibold mb-5">
              Two tiers.<br />One platform.
            </h2>
            <p className="text-lg text-[var(--color-ink-soft)]">
              Choose the tier that fits your credit operation. Every deployment is
              fully configured to your spec: branding, scorecards, and integrations.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-5 max-w-3xl mx-auto items-stretch">

          {/* ── Starter (light) ─────────────────────────────────────── */}
          <Reveal delay={0}>
            <div className="bento-card p-8 flex flex-col h-full">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-ink-muted)' }}>
                  STARTER
                </p>
                <p className="text-5xl font-bold tracking-tight mb-1"
                  style={{ color: 'var(--color-brand)' }}>
                  R 1,999
                </p>
                <p className="text-sm text-[var(--color-ink-muted)] mb-4">
                  /month excl. VAT · up to 2 branches
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-ink-soft)',
                    border: '1px solid var(--color-border)',
                  }}>
                  Pay-as-you-use API checks
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {STARTER_FEATURES.map(f => (
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

          {/* ── Scale (dark, Most Popular) ───────────────────────────── */}
          <Reveal delay={80}>
            <div className="relative flex flex-col h-full">
              {/* Spinning gradient border */}
              <div className="absolute -inset-[2px] rounded-[22px] pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
                <div style={{
                  position: 'absolute', inset: '-100%',
                  background: 'conic-gradient(from 0deg, #7C3AED, #A78BFA, #C4B5FD, #7C3AED)',
                  animation: 'border-spin 4s linear infinite',
                }} />
              </div>
              {/* Ambient glow */}
              <div className="absolute -inset-4 rounded-3xl pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.3) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                  animation: 'glow-pulse 3s ease-in-out infinite',
                }} aria-hidden />

              <div className="relative bento-card bento-card-dark p-8 flex flex-col h-full overflow-hidden">
                {/* Top ambient */}
                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} aria-hidden />

                <div className="relative mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>
                      ENTERPRISE
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}>
                      MOST POPULAR
                    </span>
                  </div>
                  <p className="text-5xl font-bold tracking-tight mb-1 text-white">
                    R 14,999
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    /month excl. VAT · unlimited branches · custom implementation quoted separately
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <Zap size={10} style={{ color: '#A78BFA' }} />
                    2,000 checks / month included · then pay-as-you-use
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-8 relative">
                  {ENTERPRISE_FEATURES.map((f, i) => (
                    <li key={f} className="flex items-start gap-2 text-sm"
                      style={{ color: i === 0 ? 'rgba(255,255,255,0.50)' : '#C4B5FD' }}>
                      <Check size={13} className="mt-0.5 shrink-0"
                        style={{ color: i === 0 ? 'rgba(255,255,255,0.30)' : '#A78BFA' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="#enquire"
                  className="relative inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3.5 rounded-full text-white transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)',
                    boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
                  }}
                >
                  Get a quote <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>


        {/* Bottom notes */}
        <Reveal delay={160}>
          <div className="mt-6 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
            {[
              {
                label: 'i. Implementation',
                title: 'Quoted on scope',
                desc: 'Branding, scorecard configuration, integrations, UAT, and go-live support. One-off fee.',
              },
              {
                label: 'ii. API checks',
                title: 'Pay-as-you-use',
                desc: 'Starter is billed from check one. Enterprise includes 2,000 checks/month. Additional checks at published rates.',
              },
              {
                label: 'iii. Pass-through costs',
                title: 'Transparent billing',
                desc: 'Experian, SACRRA, and DHA charges are passed through at provider cost.',
              },
            ].map(n => (
              <div key={n.label} className="bento-card p-5">
                <p className="eyebrow mb-2">{n.label}</p>
                <p className="text-sm font-semibold mb-1.5 tracking-tight">{n.title}</p>
                <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">{n.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

      </div>
    </section>
  );
}
