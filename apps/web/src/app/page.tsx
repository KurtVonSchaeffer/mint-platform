import Link from 'next/link';
import {
  ArrowUpRight, ArrowRight, Sparkles, Check,
  TrendingUp, Activity, Lock, Zap, Cpu, BarChart3,
} from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { EnquireForm } from '@/components/EnquireForm';
import { IntegrationLogo } from '@/components/IntegrationLogos';
import {
  CreditEngineCard, KycCard, OpenBankingCard,
  EContractsCard, PortfolioCard, PortalCard,
} from '@/components/PlatformCards';
import { AnimatedHeadline } from '@/components/AnimatedHeadline';
import { HeroVisual } from '@/components/HeroVisual';
import { DualViewShowcase } from '@/components/DualViewShowcase';
import { ContainerScroll } from '@/components/ContainerScroll';
import { HeroDashboard } from '@/components/HeroDashboard';
import { MobileNav } from '@/components/MobileNav';
import { AnimatedStat } from '@/components/AnimatedStat';

/* ─── Content ─────────────────────────────────────────────────────── */

const stats = [
  { value: 'R 2.4bn+', label: 'in applications processed' },
  { value: '14',        label: 'lender deployments live' },
  { value: '99.9%',     label: 'platform uptime SLA' },
  { value: '< 48hr',    label: 'avg credit decision' },
];

const integrations = [
  { name: 'TruID',        sub: 'Open Banking' },
  { name: 'Experian',     sub: 'Credit Bureau' },
  { name: 'SACRRA',       sub: 'Bureau Reporting' },
  { name: 'DocuSeal',     sub: 'E-Signatures' },
  { name: 'Sure Systems', sub: 'EFT & Payments' },
  { name: 'Resend',       sub: 'Transactional Mail' },
  { name: 'OpenPGP',      sub: 'Bureau Encryption' },
  { name: 'Supabase',     sub: 'Data Platform' },
  { name: 'Vercel',       sub: 'Infrastructure' },
];

const lenders = [
  'BridgeCapital', 'Apex Credit', 'Nexus Business', 'Summit Lending', 'Elevate Capital',
  'Velocity Trading', 'Phakisa Microfinance', 'Horizon Credit',
];

const testimonials = [
  {
    quote: 'We replaced three separate vendors with AlgoLend. Our credit decisions are down from five days to under twenty-four hours.',
    name: 'Thabo Mokoena',
    role: 'Head of Credit',
    company: 'BridgeCapital Finance',
    initials: 'TM',
    accent: '#7C3AED',
  },
  {
    quote: 'The TruID integration alone paid for the platform inside the first quarter. Affordability checks that used to take a day are now instant.',
    name: 'Lerato Dlamini',
    role: 'COO',
    company: 'Apex Credit Solutions',
    initials: 'LD',
    accent: '#059669',
  },
  {
    quote: 'SACRRA submissions used to be a two-day exercise. Now they run themselves on the 28th of every month with full reconciliation.',
    name: 'Sipho Nkosi',
    role: 'Compliance Director',
    company: 'Nexus Business Finance',
    initials: 'SN',
    accent: '#0284C7',
  },
];

const process = [
  { n: '01', icon: Sparkles,  title: 'Discovery',       desc: 'We map your credit policy, products, compliance posture, and team workflows in detail.' },
  { n: '02', icon: Cpu,       title: 'Configuration',   desc: 'Platform built to your specifications — branding, scorecards, integrations, and user roles.' },
  { n: '03', icon: Activity,  title: 'UAT & Training',  desc: 'End-to-end user acceptance testing with your team, plus full staff onboarding training.' },
  { n: '04', icon: Lock,      title: 'Go Live',         desc: 'Launch with dedicated implementation support and ongoing platform management by Mint.' },
];

const compliance = [
  { code: 'NCA',    title: 'National Credit Act',  desc: 'Affordability, disclosure, and quotation rules architected into the credit engine.' },
  { code: 'SACRRA', title: 'Bureau Reporting',     desc: 'Monthly submissions in SACRRA layout 700, with full acceptance reconciliation.' },
  { code: 'POPIA',  title: 'Data Protection',      desc: 'Tenant-isolated databases, encrypted at rest, with documented retention policies.' },
  { code: 'NCR',    title: 'Audit Trail',          desc: 'Every credit decision logged immutably. NCR-grade audit reports available on demand.' },
];

/* ─── Helpers ─────────────────────────────────────────────────────── */

/**
 * AlgoLend brand mark — purple gateway arch with dark filled circle nested inside.
 * Matches the official logo: arched purple stroke with a near-black circle in its centre.
 */
function Logo({ size = 32, variant = 'light' }: { size?: number; variant?: 'light' | 'dark' }) {
  const circleColor = variant === 'dark' ? '#FAFAF9' : '#0F1629';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="AlgoLend">
      <path
        d="M 6 30 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 30"
        stroke="#7C3AED"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="15" r="5.5" fill={circleColor} />
    </svg>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="relative overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border-soft)] backdrop-blur-xl bg-[var(--color-bg)]/80">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold tracking-tight text-[15px]">AlgoLend</span>
          </Link>

          <nav className="hidden md:flex items-center gap-9 text-[13px] text-[var(--color-ink-soft)] font-medium">
            <Link href="#platform"   className="hover:text-[var(--color-ink)] transition-colors">Platform</Link>
            <Link href="#process"    className="hover:text-[var(--color-ink)] transition-colors">How it works</Link>
            <Link href="#compliance" className="hover:text-[var(--color-ink)] transition-colors">Compliance</Link>
            <Link href="#pricing"    className="hover:text-[var(--color-ink)] transition-colors">Pricing</Link>
            <Link href="#faq"        className="hover:text-[var(--color-ink)] transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="#enquire"
              className="btn-shine hidden md:inline-flex items-center gap-1.5 bg-[var(--color-ink)] text-[var(--color-bg)] text-[13px] font-semibold px-4 py-2 rounded-full transition-transform hover:-translate-y-px"
            >
              Book a demo
              <ArrowRight size={13} />
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Ambient blobs */}
        <div className="blob top-0 left-1/4 w-[600px] h-[600px]" style={{ background: '#F3EEFF' }} aria-hidden />
        <div className="blob top-40 right-0 w-[400px] h-[400px]" style={{ background: '#FFFBEB' }} aria-hidden />
        {/* Grid backdrop */}
        <div className="absolute inset-0 grid-bg" aria-hidden />

        <ContainerScroll
          titleComponent={
            <div className="relative pt-24 text-center">
              {/* Eyebrow badge */}
              <div
                className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] mb-8"
                style={{ animation: 'var(--animate-fade-up)', animationDelay: '0ms' }}
              >
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                <span className="text-[var(--color-ink-soft)]">Trusted by <span className="text-[var(--color-ink)] font-semibold">14 South African</span> credit providers</span>
              </div>

              {/* Headline */}
              <AnimatedHeadline />

              {/* Sub */}
              <p
                className="text-lg md:text-xl text-[var(--color-ink-soft)] max-w-2xl mx-auto mb-10 leading-relaxed"
                style={{ animation: 'var(--animate-fade-up)', animationDelay: '160ms' }}
              >
                A fully branded, end-to-end credit management platform — configured to your credit
                policy, regulatory framework, and borrower journey.
              </p>

              {/* CTAs */}
              <div
                className="flex items-center justify-center gap-3"
                style={{ animation: 'var(--animate-fade-up)', animationDelay: '240ms' }}
              >
                <Link
                  href="#enquire"
                  className="btn-shine inline-flex items-center gap-2 bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold text-[14px] px-5 py-3 rounded-full transition-transform hover:-translate-y-0.5"
                  style={{ boxShadow: '0 12px 32px -8px rgba(9, 9, 11, 0.4)' }}
                >
                  Book a demo
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="#platform"
                  className="inline-flex items-center gap-2 text-[var(--color-ink)] font-medium text-[14px] px-5 py-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  See it work
                </Link>
              </div>
            </div>
          }
        >
          <HeroDashboard />
        </ContainerScroll>
      </section>

      {/* ── INTEGRATION MARQUEE ─────────────────────────────────────── */}
      <section className="py-10 border-y border-[var(--color-border-soft)] overflow-hidden bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-6 mb-6">
          <p className="eyebrow text-center">Certified integrations</p>
        </div>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-[var(--color-bg)] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-[var(--color-bg)] to-transparent pointer-events-none" />
          <div className="marquee-track">
            {[...integrations, ...integrations].map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center gap-3 shrink-0">
                <IntegrationLogo name={p.name} size={28} className="text-[var(--color-ink)]" />
                {p.name !== 'Sure Systems' && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">{p.name}</span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{p.sub}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-6 py-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <AnimatedStat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── DUAL-DEVICE SHOWCASE — "See it in action" ────────────────── */}
      <section className="relative bg-[var(--color-ink)] text-white py-28 overflow-hidden">
        {/* Ambient glow blobs */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', filter: 'blur(60px)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }}
          aria-hidden
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 90%)',
          }}
          aria-hidden
        />

        <div className="relative max-w-[1280px] mx-auto px-6">

          {/* Heading */}
          <Reveal>
            <div className="text-center mb-20 max-w-3xl mx-auto">
              <p className="eyebrow mb-4" style={{ color: '#A78BFA' }}>See it in action</p>
              <h2 className="headline text-5xl lg:text-6xl font-semibold mb-5">
                One platform.<br />
                <span style={{ background: 'linear-gradient(90deg, #C4B5FD, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Two experiences.
                </span>
              </h2>
              <p className="text-lg text-white/55 max-w-xl mx-auto">
                Your underwriters get a Bloomberg-grade admin console. Your borrowers get a branded mobile-first portal. Same data, same decisioning, two purpose-built surfaces.
              </p>
            </div>
          </Reveal>

          {/* The showcase */}
          <Reveal delay={150}>
            <div>
              <DualViewShowcase />
            </div>
          </Reveal>

          {/* Below the showcase — pull-in CTA */}
          <Reveal delay={300}>
            <div className="text-center mt-16">
              <p className="text-base text-white/55 mb-6 max-w-xl mx-auto">
                Want to see it for real? Book a 30-minute walk-through. We'll log into a live deployment and show you yours within the call.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="#enquire"
                  className="btn-shine inline-flex items-center gap-2 bg-white text-[var(--color-ink)] font-semibold text-[14px] px-6 py-3.5 rounded-full transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: '0 12px 32px -8px rgba(255, 255, 255, 0.25)' }}
                >
                  Book a live walk-through
                  <ArrowUpRight size={15} />
                </Link>
                <Link
                  href="/intro"
                  className="inline-flex items-center gap-2 text-white font-medium text-[14px] px-5 py-3.5 rounded-full border border-white/15 hover:bg-white/5 transition-colors"
                >
                  Or watch the intro
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Quiet lender list — was the customer logos band, now condensed */}
          <Reveal delay={400}>
            <div className="mt-20 pt-10 border-t border-white/10 text-center">
              <p className="text-[11px] mono uppercase tracking-[0.18em] text-white/40 mb-5">Used by 14 South African credit providers</p>
              <div className="flex items-center justify-center gap-x-8 gap-y-4 flex-wrap">
                {lenders.map((name) => (
                  <span key={name} className="text-sm font-semibold text-white/45 hover:text-white transition-colors cursor-default">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── §01 — PLATFORM BENTO ────────────────────────────────────── */}
      <section id="platform" className="bg-[var(--color-bg)] py-24">
        <div className="max-w-[1200px] mx-auto px-6">

          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="eyebrow mb-4">The Platform</p>
              <h2 className="headline text-5xl lg:text-6xl font-semibold mb-5">
                Six capabilities,<br />
                one platform.
              </h2>
              <p className="text-lg text-[var(--color-ink-soft)]">
                Every deployment includes the full platform. We enable the modules you need — you don't pay for the ones you don't.
              </p>
            </div>
          </Reveal>

          {/* Shader bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Row 1-2 left: Credit Engine tall hero */}
            <Reveal delay={0} className="lg:col-span-2 lg:row-span-2">
              <CreditEngineCard />
            </Reveal>

            {/* Row 1 right: KYC */}
            <Reveal delay={80}>
              <KycCard />
            </Reveal>

            {/* Row 2 right: Open Banking */}
            <Reveal delay={160}>
              <OpenBankingCard />
            </Reveal>

            {/* Row 3 left: E-contracts */}
            <Reveal delay={200} className="lg:col-span-2">
              <EContractsCard />
            </Reveal>

            {/* Row 3 right: Portal */}
            <Reveal delay={240}>
              <PortalCard />
            </Reveal>

            {/* Row 4: Portfolio full-width */}
            <Reveal delay={280} className="md:col-span-2 lg:col-span-3" threshold={0.05}>
              <PortfolioCard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── §02 — PROCESS ───────────────────────────────────────────── */}
      <section id="process" className="bg-[var(--color-ink)] text-[var(--color-bg)] py-24">
        <div className="max-w-[1200px] mx-auto px-6">

          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="eyebrow mb-4" style={{ color: '#A78BFA' }}>How it works</p>
              <h2 className="headline text-5xl lg:text-6xl font-semibold mb-5">
                Bespoke. Not a download.
              </h2>
              <p className="text-lg text-white/60">
                Every deployment is custom-built — you don't configure your way out of a generic SaaS template.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {process.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="bento-card bento-card-dark p-7 h-full group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#A78BFA]/20 group-hover:border-[#A78BFA]/30 transition-all">
                      <step.icon size={17} className="text-[#A78BFA]" />
                    </div>
                    <span className="text-3xl font-bold text-white/10 group-hover:text-[#A78BFA]/40 transition-colors">{step.n}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── §03 — COMPLIANCE ────────────────────────────────────────── */}
      <section id="compliance" className="bg-[var(--color-bg)] py-24">
        <div className="max-w-[1200px] mx-auto px-6">

          <Reveal>
            <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-end mb-16">
              <div>
                <p className="eyebrow mb-4">Compliance</p>
                <h2 className="headline text-5xl font-semibold">
                  Built for South African<br />
                  financial regulation.
                </h2>
              </div>
              <p className="text-lg text-[var(--color-ink-soft)]">
                We handle the regulatory plumbing so you can focus on lending. Architected to the National Credit Act, POPIA, and SACRRA reporting standards.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {compliance.map((c, i) => (
              <Reveal key={c.code} delay={i * 70}>
                <div className="bento-card p-7 h-full group">
                  <div className="flex items-center gap-2 mb-5">
                    <Zap size={14} className="text-[var(--color-brand)]" />
                    <span className="eyebrow" style={{ color: 'var(--color-brand)' }}>{c.code}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 tracking-tight group-hover:translate-x-0.5 transition-transform">{c.title}</h3>
                  <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg)] py-24 border-t border-[var(--color-border-soft)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="eyebrow mb-4">In their words</p>
              <h2 className="headline text-5xl lg:text-6xl font-semibold mb-5">
                What lenders are<br />
                <span className="italic font-serif" style={{ fontFamily: 'Georgia, serif' }}>actually saying</span>.
              </h2>
              <p className="text-lg text-[var(--color-ink-soft)]">
                Three quotes pulled directly from go-live feedback calls.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <article className="bento-card p-7 h-full flex flex-col group">
                  {/* Decorative quote mark */}
                  <span
                    aria-hidden
                    className="text-7xl leading-none mb-2 font-serif"
                    style={{ fontFamily: 'Georgia, serif', color: t.accent, opacity: 0.18 }}
                  >
                    “
                  </span>

                  <p className="text-[15px] leading-relaxed text-[var(--color-ink)] mb-6 flex-1">
                    {t.quote}
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border-soft)]">
                    {/* Initials avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accent}CC 100%)` }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{t.name}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {t.role} · {t.company}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── §04 — PRICING ───────────────────────────────────────────── */}
      <section id="pricing" className="bg-[var(--color-bg)] py-24">
        <div className="max-w-[1200px] mx-auto px-6">

          <Reveal>
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="eyebrow mb-4">Pricing</p>
              <h2 className="headline text-5xl lg:text-6xl font-semibold mb-5">
                Quoted to your scope.<br />
                Not a tier.
              </h2>
              <p className="text-lg text-[var(--color-ink-soft)]">
                Every credit provider operates differently. We price each deployment on what we build, not on a generic plan.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
              {/* Implementation */}
              <div className="bento-card p-8 group">
                <p className="eyebrow mb-3">i. One-off implementation</p>
                <p className="text-2xl font-semibold mb-3 tracking-tight">Quoted on scope</p>
                <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
                  Branding, scorecard configuration, integrations, training, and go-live support.
                </p>
                <ul className="space-y-2">
                  {['Discovery & policy mapping', 'Custom credit engine setup', 'Integration provisioning', 'UAT & training'].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                      <Check size={14} className="text-[var(--color-brand)] mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Monthly */}
              <div className="bento-card bento-card-dark p-8 group">
                <p className="eyebrow mb-3" style={{ color: '#A78BFA' }}>ii. Monthly platform licence</p>
                <p className="text-2xl font-semibold mb-3 tracking-tight">Flat monthly fee</p>
                <p className="text-sm text-white/60 mb-6 leading-relaxed">
                  Hosting, integrations, security patches, regulatory updates, and ongoing platform management by Mint.
                </p>
                <ul className="space-y-2">
                  {['Hosting & infrastructure', 'Security & regulatory updates', 'Platform feature releases', 'Priority support'].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-white/70">
                      <Check size={14} className="text-[#A78BFA] mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-center mt-10 text-sm text-[var(--color-ink-muted)]">
              <Sparkles size={12} className="inline mr-1" />
              Pass-through API costs (Experian, TruID, DocuSeal) billed at cost. No markup.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-[var(--color-bg)] py-24">
        <div className="max-w-[860px] mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="eyebrow mb-4">Common questions</p>
              <h2 className="headline text-5xl lg:text-6xl font-semibold">
                Everything you need<br />to know.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="space-y-3">
              {[
                {
                  q: 'How long does implementation take?',
                  a: 'Typically 4–8 weeks from signed agreement to go-live, depending on the complexity of your credit policy and the number of integrations required. Simple deployments have gone live in under three weeks.',
                },
                {
                  q: 'Do I own my data?',
                  a: 'Absolutely. Your data lives in a dedicated Supabase instance — entirely isolated from other AlgoLend clients. Mint Platforms has no access to your borrower data unless you explicitly grant it for support purposes.',
                },
                {
                  q: 'What happens if Experian or SureSystems goes down?',
                  a: 'The platform is built to degrade gracefully. If a bureau is unavailable, the credit engine continues with the data it has, flagging the missing component for manual review. You never lose an application.',
                },
                {
                  q: 'Can I configure my own credit scorecard?',
                  a: 'Yes — this is the core of what we do. Your scorecard, rate bands, product rules, and affordability parameters are all configured per your credit policy. Nothing is shared with other lenders on the platform.',
                },
                {
                  q: 'Is the platform NCA compliant?',
                  a: 'Yes. Affordability calculations, pre-agreement quotations, fee disclosure, and cooling-off rules are all architected into the credit engine. SACRRA bureau reporting runs automatically on the 28th of each month.',
                },
                {
                  q: 'What does the monthly fee cover?',
                  a: 'Hosting and infrastructure, all security patches, regulatory updates (including SACRRA layout changes), new platform features, and priority support. There are no surprise charges — pass-through API costs (Experian, TruID, DocuSeal) are billed at cost with no markup.',
                },
                {
                  q: 'Can we white-label it completely?',
                  a: 'Yes — your logo, your colours, your domain. Borrowers never see any AlgoLend or Mint Platforms branding. Even the transactional emails come from your domain.',
                },
                {
                  q: 'Do you support multi-branch lending?',
                  a: 'Yes. Branch management, consultant assignment, and branch-scoped portfolio views are available as an add-on feature. Each branch can have its own manager and team with appropriate access controls.',
                },
              ].map((item, i) => (
                <details key={i} className="group bento-card overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none">
                    <span className="font-semibold text-[15px] text-[var(--color-ink)]">{item.q}</span>
                    <span
                      className="shrink-0 w-6 h-6 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink-soft)] text-xs transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-[var(--color-ink-soft)] leading-relaxed text-[15px]">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA / ENQUIRE ──────────────────────────────────────────── */}
      <section id="enquire" className="bg-[var(--color-bg)] pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <div className="relative bento-card bento-card-dark p-12 lg:p-20 overflow-hidden">
              {/* Ambient glow */}
              <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.35) 0%, transparent 70%)' }} aria-hidden />

              <div className="relative grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
                <div>
                  <p className="eyebrow mb-4" style={{ color: '#A78BFA' }}>Start a conversation</p>
                  <h2 className="headline text-5xl lg:text-6xl font-semibold mb-6">
                    Ready to launch<br />
                    your lending platform?
                  </h2>
                  <p className="text-lg text-white/60 max-w-md mb-8">
                    Book a 30-minute discovery call with the Mint Platforms team. No commitment — just a conversation about your requirements.
                  </p>

                  <div className="space-y-3 max-w-md">
                    {[
                      { icon: TrendingUp, l: 'Implementation', v: '4–8 weeks from kick-off' },
                      { icon: Activity,   l: 'Uptime SLA',     v: '99.9% guaranteed' },
                      { icon: Lock,       l: 'Data isolation', v: 'Dedicated database per client' },
                    ].map((s) => (
                      <div key={s.l} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center shrink-0">
                          <s.icon size={16} className="text-[#A78BFA]" />
                        </div>
                        <div>
                          <p className="text-xs text-white/45">{s.l}</p>
                          <p className="text-sm font-semibold">{s.v}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live form */}
                <EnquireForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER (mymint-style, rich) ─────────────────────────────── */}
      <footer className="bg-[var(--color-ink)] text-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-12">

          <div className="grid lg:grid-cols-[1.4fr_1fr_1.2fr_1.3fr] gap-12">

            {/* Col 1 — brand + description + socials */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <Logo size={40} variant="dark" />
                <span className="text-3xl font-semibold tracking-[-0.02em]">AlgoLend</span>
              </div>
              <p className="text-sm text-white/55 max-w-xs leading-relaxed mb-6">
                The bespoke credit management platform for South African corporate lenders. A product of <a href="https://mymint.co.za" className="text-white hover:underline">Mint Platforms (Pty) Ltd</a>.
              </p>

              {/* Socials */}
              <div className="flex items-center gap-2.5">
                {[
                  { l: 'LinkedIn',  href: 'https://www.linkedin.com/company/mint-platforms', icon: 'M22 19a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5h9a5 5 0 0 1 5 5v11ZM8 10H5v9h3v-9Zm.4-3.1A1.7 1.7 0 1 1 5 6.9a1.7 1.7 0 0 1 3.4 0ZM19 19h-3v-4.7c0-1.1-.4-1.9-1.4-1.9-.8 0-1.2.5-1.4 1 0 .2-.1.5-.1.7V19h-3v-9h3v1.3c.4-.6 1.1-1.4 2.7-1.4 2 0 3.4 1.3 3.4 4V19Z' },
                  { l: 'X',         href: 'https://x.com/mintplatforms',                   icon: 'M18 3h3l-7 8 8 10h-6l-5-7-6 7H2l8-9L2 3h6l4 6 6-6Z' },
                  { l: 'Instagram', href: 'https://instagram.com/mintplatforms',           icon: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.5 1s.8.9 1 1.5c.1.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9 0 3.2 0 3.6-.1 4.9 0 1.2-.3 1.8-.4 2.2-.2.6-.5 1-1 1.5s-.9.8-1.5 1c-.4.1-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.3-2.2-.4-.6-.2-1-.5-1.5-1s-.8-.9-1-1.5c-.1-.4-.3-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9 0-3.2 0-3.6.1-4.9 0-1.2.3-1.8.4-2.2.2-.6.5-1 1-1.5s.9-.8 1.5-1c.4-.1 1-.3 2.2-.4 1.3-.1 1.7-.1 4.9-.1Zm0 1.8c-3.2 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.5-1.3.9s-.7.8-.9 1.3c-.1.4-.3 1-.4 2.1-.1 1.2-.1 1.5-.1 4.7s0 3.5.1 4.7c.1 1.1.3 1.7.4 2.1.2.5.5.9.9 1.3s.8.7 1.3.9c.4.1 1 .3 2.1.4 1.2.1 1.5.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.5 1.3-.9s.7-.8.9-1.3c.1-.4.3-1 .4-2.1.1-1.2.1-1.5.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.5-.9-.9-1.3s-.8-.7-1.3-.9c-.4-.1-1-.3-2.1-.4-1.2-.1-1.5-.1-4.7-.1Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4ZM18.4 6.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z' },
                ].map((s) => (
                  <a
                    key={s.l}
                    href={s.href}
                    target="_blank"
                    rel="noopener"
                    aria-label={s.l}
                    className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/55 hover:text-white hover:bg-white/5 hover:border-white/30 transition-all"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d={s.icon} /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 — Quick Links */}
            <div>
              <p className="text-base font-semibold mb-5">Quick Links</p>
              <ul className="space-y-3">
                {[
                  { l: 'Platform',    h: '#platform' },
                  { l: 'How it works', h: '#process' },
                  { l: 'Compliance',  h: '#compliance' },
                  { l: 'Pricing',     h: '#pricing' },
                  { l: 'Book a demo', h: '#enquire' },
                  { l: 'Intro',       h: '/intro' },
                ].map((it) => (
                  <li key={it.l}>
                    <Link href={it.h} className="text-sm text-white/55 hover:text-white transition-colors">
                      {it.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Contact */}
            <div>
              <p className="text-base font-semibold mb-5">Contact</p>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
                  </span>
                  <span className="text-white/70 leading-relaxed">
                    3 Gwen Lane, Sandown,<br />Sandton, 2031<br />South Africa
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" /></svg>
                  </span>
                  <a href="mailto:info@algolend.co.za" className="text-white/70 hover:text-white transition-colors">
                    info@algolend.co.za
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5a2 2 0 0 1 2-2h2.5l1.5 4-2 1a11 11 0 0 0 5 5l1-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5Z" /></svg>
                  </span>
                  <a href="tel:+27102760531" className="text-white/70 hover:text-white transition-colors">
                    +27 10 276 0531
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4 — Ready to start CTA card */}
            <div>
              <div className="rounded-3xl p-7 border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-2xl font-semibold mb-3 tracking-tight">Ready to start?</p>
                <p className="text-sm text-white/55 mb-6 leading-relaxed">
                  Join the growing group of South African credit providers running on AlgoLend.
                </p>
                <Link
                  href="#enquire"
                  className="btn-shine inline-flex items-center justify-center gap-2 w-full bg-[var(--color-brand)] text-white font-semibold text-sm px-5 py-3 rounded-full transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: '0 12px 32px -8px rgba(124, 58, 237, 0.6)' }}
                >
                  Book a demo
                  <ArrowUpRight size={15} />
                </Link>
                <a
                  href="https://mymint.co.za"
                  target="_blank"
                  rel="noopener"
                  className="mt-3 inline-flex items-center justify-center gap-2 w-full text-white/55 hover:text-white text-xs font-medium px-5 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all"
                >
                  Visit Mint Platforms
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Regulatory disclosure */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-xs text-white/40 leading-relaxed max-w-5xl">
              Mint Platforms (Pty) Ltd is an authorised Financial Services Provider (FSP&nbsp;55118)
              regulated by the Financial Sector Conduct Authority and a registered Credit Provider
              (NCRCP&nbsp;22892) under the National Credit Act. AlgoLend is a B2B software platform
              licensed to credit providers; AlgoLend does not itself extend credit. All
              implementations are subject to the licensee&apos;s own NCR registration and credit
              policies. Information presented here is for product overview purposes only and does
              not constitute financial or legal advice.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-white/40">
            <span>© 2026 Mint Platforms (Pty) Ltd. All rights reserved.</span>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms"   className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#"        className="hover:text-white transition-colors">Complaints Policy</Link>
              <Link href="#"        className="hover:text-white transition-colors">AML Policy</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">POPIA</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
