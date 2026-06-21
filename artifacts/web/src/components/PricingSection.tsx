

import { Link } from 'wouter';
import { Check, ArrowRight, Zap } from 'lucide-react';
import { Reveal } from '@/components/Reveal';

const STARTER_FEATURES = [
  'Credit scoring engine',
  'Borrower application portal',
  'Term loans & working capital',
  'Bureau enquiry (Experian)',
  'Liveness + Home Affairs verification',
  'Watchlist — PEPs & sanctions',
  'Address verification',
  'NCA-compliant quotations',
  'NCR audit trail',
  'Up to 2 branches',
  '100 checks / month included',
];

const SCALE_FEATURES = [
  'Everything in Starter',
  'Open banking — TruID affordability',
  'E-contracts',
  'CIPC employment data',
  'Phone verification',
  'SACRRA bureau reporting',
  'Loan book & repayment tracking',
  'EFT integration',
  'Unlimited branches',
  '300 checks / month included',
  'Priority onboarding support',
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
              fully configured to your spec — branding, scorecards, and integrations.
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
                  R 5,500
                </p>
                <p className="text-sm text-[var(--color-ink-muted)] mb-4">
                  /month excl. VAT · implementation quoted separately
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-ink-soft)',
                    border: '1px solid var(--color-border)',
                  }}>
                  <Zap size={10} style={{ color: 'var(--color-brand)' }} />
                  100 checks / month included
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
                      SCALE
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}>
                      MOST POPULAR
                    </span>
                  </div>
                  <p className="text-5xl font-bold tracking-tight mb-1 text-white">
                    R 9,500
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    /month excl. VAT · implementation quoted separately
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <Zap size={10} style={{ color: '#A78BFA' }} />
                    300 checks / month included
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-8 relative">
                  {SCALE_FEATURES.map(f => (
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
          <div className="mt-10 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
            {[
              {
                label: 'i. Implementation',
                title: 'Quoted on scope',
                desc: 'Branding, scorecard configuration, integrations, UAT, and go-live support. One-off fee.',
              },
              {
                label: 'ii. Extra checks',
                title: 'Pay as you go',
                desc: 'Checks above your monthly quota billed at published per-service rates. No surprises.',
              },
              {
                label: 'iii. API costs',
                title: 'Transparent billing',
                desc: 'Experian, TruID, SACRRA, and e-contract charges are passed through at provider cost.',
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
