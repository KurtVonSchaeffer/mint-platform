import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, ArrowUpRight, Check, BarChart3, FileText,
  ShieldCheck, Users, Settings, CreditCard, Zap, Lock,
  Activity, Database, Globe,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin Dashboard Tour — AlgoLend',
  description: 'A full walkthrough of the AlgoLend lender admin console — everything your underwriting team needs in one place.',
  robots: { index: false, follow: false },
};

const sections = [
  {
    n: '01',
    icon: BarChart3,
    color: '#7C3AED',
    rgb: '124,58,237',
    title: 'Command Dashboard',
    summary: 'Live KPIs, portfolio health, and your credit pipeline. All in one glance.',
    features: [
      'Real-time active loan count and portfolio value',
      'NPA tracking with automated aging buckets',
      'Pending credit decision queue with SLA timers',
      'Monthly collection trend chart (ApexCharts)',
    ],
  },
  {
    n: '02',
    icon: FileText,
    color: '#10b981',
    rgb: '16,185,129',
    title: 'Credit Applications',
    summary: 'From submission to disbursement. Every step of the credit lifecycle in one pipeline.',
    features: [
      'Application intake with document uploads',
      'TruID open banking affordability check',
      'Experian credit bureau pull (one-click)',
      'Custom scorecard evaluation & approval workflow',
    ],
  },
  {
    n: '03',
    icon: CreditCard,
    color: '#f59e0b',
    rgb: '245,158,11',
    title: 'Loan Book',
    summary: 'Full loan lifecycle management from disbursement through collections to closure.',
    features: [
      'Live repayment schedule per borrower',
      'DebiCheck authenticated debit order management',
      'Arrears and write-off tracking',
      'Early settlement and restructure tools',
    ],
  },
  {
    n: '04',
    icon: ShieldCheck,
    color: '#ef4444',
    rgb: '239,68,68',
    title: 'Compliance & SACRRA',
    summary: 'Regulatory reporting that runs itself. No spreadsheets, no manual uploads.',
    features: [
      'SACRRA layout 700: auto-runs on the 28th',
      'Full acceptance reconciliation with error log',
      'NCA quotation generation (pre-agreement)',
      'NCR audit trail: every decision logged immutably',
    ],
  },
  {
    n: '05',
    icon: BarChart3,
    color: '#8b5cf6',
    rgb: '139,92,246',
    title: 'Analytics & Financials',
    summary: 'Actionable insight into revenue, risk, and portfolio performance.',
    features: [
      'Revenue recognition and interest income reports',
      'Risk-band breakdown (performing vs NPA)',
      'Cash flow forecasting (12-month projection)',
      'Exportable reports for board / NCR audits',
    ],
  },
  {
    n: '06',
    icon: Settings,
    color: '#64748b',
    rgb: '100,116,139',
    title: 'Settings & White-label',
    summary: 'Full platform configuration: branding, products, scoring, and team access.',
    features: [
      'Company branding (logo, colors, domain)',
      'Product builder (terms, rates, limits)',
      'Role-based access control (admin, analyst, agent)',
      'Integration credentials (Experian, TruID, e-contracts)',
    ],
  },
];

const integrations = [
  { name: 'TruID',        desc: 'Open banking: real-time affordability',  color: '#059669' },
  { name: 'Experian',     desc: 'Credit bureau: full consumer report',    color: '#3b82f6' },
  { name: 'SACRRA',       desc: 'Bureau reporting: layout 700 auto-sub',  color: '#f59e0b' },
  { name: 'E-Contracts',  desc: 'E-signatures: NCA-compliant contracts',  color: '#8b5cf6' },
  { name: 'DebiCheck', desc: 'Authenticated debit orders: NPS-compliant', color: '#ef4444' },
  { name: 'Resend',       desc: 'Transactional email: instant delivery',  color: '#64748b' },
];

export default function AdminTourPage() {
  return (
    <div className="relative overflow-x-hidden bg-[var(--color-bg)]">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 h-14 border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="AlgoLend">
            <path d="M 6 30 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 30" stroke="#7C3AED" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <circle cx="16" cy="15" r="5.5" fill="var(--color-ink)" />
          </svg>
          <span className="text-sm font-semibold text-[var(--color-ink)]">AlgoLend</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
            Back to site
          </Link>
          <Link
            href="/#enquire"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[var(--color-ink)] text-[var(--color-bg)] px-4 py-2 rounded-full hover:-translate-y-0.5 transition-transform"
          >
            Book a demo <ArrowUpRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 text-center">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 70%)', filter: 'blur(60px)' }} aria-hidden />
        <div className="relative max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] mb-8">
            <Activity size={11} className="text-emerald-500" />
            <span className="text-[var(--color-ink-soft)]">Admin console walkthrough</span>
          </div>
          <h1 className="headline text-5xl lg:text-7xl font-semibold mb-6 tracking-tight">
            How the admin<br />
            <span style={{ backgroundImage: 'linear-gradient(90deg,#C4B5FD,#7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              dashboard works.
            </span>
          </h1>
          <p className="text-xl text-[var(--color-ink-soft)] leading-relaxed mb-10">
            Six modules. One screen. Everything your underwriting team needs to
            run a compliant, data-driven credit operation. No spreadsheets.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/#enquire"
              className="btn-shine inline-flex items-center gap-2 bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold text-sm px-6 py-3.5 rounded-full hover:-translate-y-0.5 transition-transform"
              style={{ boxShadow: '0 12px 32px -8px rgba(9,9,11,0.4)' }}
            >
              Book a live demo <ArrowRight size={14} />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)] px-5 py-3.5 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </section>

      {/* ── SCREENSHOT ───────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 mb-24">
        <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 32px 80px -16px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1e1e1e' }}>
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.7)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(245,158,11,0.7)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(52,211,153,0.7)' }} />
            <div className="flex-1 mx-4 px-3 py-1 rounded-md text-xs text-center" style={{ background: '#2d2d2d', color: '#888', fontFamily: 'monospace' }}>
              admin.algolend.co.za/dashboard
            </div>
          </div>
          <Image
            src="/screenshots/lender-dashboard.jpg"
            alt="AlgoLend admin dashboard — full view"
            width={1400}
            height={860}
            className="w-full block"
            unoptimized
          />
        </div>
      </section>

      {/* ── MODULE WALKTHROUGH ───────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 mb-24">
        <div className="text-center mb-16">
          <p className="eyebrow mb-4">Module by module</p>
          <h2 className="headline text-4xl lg:text-5xl font-semibold">Six modules. Zero gaps.</h2>
        </div>

        <div className="space-y-5">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="bento-card p-7 flex flex-col md:flex-row gap-6 items-start group">
                <div className="flex items-start gap-4 md:w-72 shrink-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${s.rgb},0.1)`, border: `1px solid rgba(${s.rgb},0.2)` }}
                  >
                    <Icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--color-ink-muted)] mb-1">{s.n}</p>
                    <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                    <p className="text-sm text-[var(--color-ink-soft)] mt-1 leading-snug">{s.summary}</p>
                  </div>
                </div>
                <div className="flex-1 grid sm:grid-cols-2 gap-2.5">
                  {s.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check size={13} className="mt-0.5 shrink-0" style={{ color: s.color }} />
                      <span className="text-sm text-[var(--color-ink-soft)]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── INTEGRATIONS ─────────────────────────────────────────────── */}
      <section className="bg-[var(--color-ink)] py-20 mb-0">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4" style={{ color: '#A78BFA' }}>Certified integrations</p>
            <h2 className="headline text-4xl font-semibold text-white">Everything wired in. Nothing manual.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {integrations.map((it) => (
              <div key={it.name} className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `rgba(${it.color.replace('#','')},0.12)` }}
                >
                  <Zap size={16} style={{ color: it.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{it.name}</p>
                  <p className="text-xs text-white/50 leading-snug mt-0.5">{it.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SYSTEM TRUST ─────────────────────────────────────────────── */}
      <section className="bg-[var(--color-ink)] pb-20 pt-0">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="mt-10 pt-10 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { label: 'Uptime SLA',    val: '99.9%',           icon: Activity },
                { label: 'Go-live time',  val: '2-3 weeks',       icon: Zap      },
                { label: 'Data',          val: 'Dedicated DB',    icon: Database },
                { label: 'Hosting',       val: 'Vercel Edge',     icon: Globe    },
                { label: 'Auth',          val: 'Supabase RLS',    icon: Lock     },
                { label: 'Compliance',    val: 'NCA + POPIA',     icon: ShieldCheck },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-white/5">
                    <Icon size={14} className="text-white/50" />
                    <div>
                      <p className="text-sm font-semibold text-white/90">{b.val}</p>
                      <p className="text-[11px] text-white/40">{b.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg)] py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="headline text-4xl lg:text-5xl font-semibold mb-5">
            Ready to see it live?
          </h2>
          <p className="text-lg text-[var(--color-ink-soft)] mb-8">
            Book a 30-minute walk-through. We'll log into a live deployment and
            show you every module. No slides, no deck, just the actual product.
          </p>
          <Link
            href="/#enquire"
            className="btn-shine inline-flex items-center gap-2 bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold px-8 py-4 rounded-full text-base hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '0 16px 48px -12px rgba(9,9,11,0.45)' }}
          >
            Book a demo
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}
