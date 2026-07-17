'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Check, Sparkles, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

/* ─── Lender admin screenshots ───────────────────────────────────── */
const MOCK_SLIDES = [
  { src: '/screenshots/admin-app/01-dashboard.png',          label: 'Dashboard',          url: 'admin.algolend.co.za/dashboard' },
  { src: '/screenshots/admin-app/02-applications.png',       label: 'Applications',       url: 'admin.algolend.co.za/applications' },
  { src: '/screenshots/admin-app/03-users.png',               label: 'Users',               url: 'admin.algolend.co.za/users' },
  { src: '/screenshots/admin-app/04-mandates.png',            label: 'Mandates',            url: 'admin.algolend.co.za/mandates' },
  { src: '/screenshots/admin-app/05-incoming-payments.png',   label: 'Incoming Payments',   url: 'admin.algolend.co.za/payments/incoming' },
  { src: '/screenshots/admin-app/06-outgoing-payments.png',   label: 'Outgoing Payments',   url: 'admin.algolend.co.za/payments/outgoing' },
  { src: '/screenshots/admin-app/07-analytics.png',           label: 'Analytics',           url: 'admin.algolend.co.za/analytics' },
  { src: '/screenshots/admin-app/08-financials.png',          label: 'Financials',          url: 'admin.algolend.co.za/financials' },
  { src: '/screenshots/admin-app/09-credit-rules.png',        label: 'Credit Rules',        url: 'admin.algolend.co.za/credit-rules' },
  { src: '/screenshots/admin-app/10-portfolio.png',           label: 'Portfolio',           url: 'admin.algolend.co.za/portfolio' },
  { src: '/screenshots/admin-app/11-loan-book.png',           label: 'Loan Book',           url: 'admin.algolend.co.za/loan-book' },
  { src: '/screenshots/admin-app/12-cash-ledger.png',         label: 'Cash Ledger',         url: 'admin.algolend.co.za/cash-ledger' },
  { src: '/screenshots/admin-app/13-sacrra.png',               label: 'SACRRA',               url: 'admin.algolend.co.za/sacrra' },
  { src: '/screenshots/admin-app/14-ncr-reporting.png',       label: 'NCR Reporting',       url: 'admin.algolend.co.za/ncr-reporting' },
  { src: '/screenshots/admin-app/15-ncr-registers.png',       label: 'NCR Registers',       url: 'admin.algolend.co.za/ncr-registers' },
  { src: '/screenshots/admin-app/16-compliance-tracker.png',  label: 'Compliance Tracker',  url: 'admin.algolend.co.za/compliance' },
  { src: '/screenshots/admin-app/17-goaml.png',                label: 'goAML',                url: 'admin.algolend.co.za/goaml' },
  { src: '/screenshots/admin-app/18-settings.png',             label: 'Settings',             url: 'admin.algolend.co.za/settings' },
  { src: '/screenshots/admin-app/19-create-application.png',  label: 'New Application',     url: 'admin.algolend.co.za/applications/new' },
] as const;

const BORROWER_SLIDES = [
  { src: '/screenshots/borrower-app/01-login.png',       label: 'Login' },
  { src: '/screenshots/borrower-app/02-dashboard.png',   label: 'Dashboard' },
  { src: '/screenshots/borrower-app/03-apply.png',       label: 'Apply' },
  { src: '/screenshots/borrower-app/04-calculator.png',  label: 'Loan calculator' },
  { src: '/screenshots/borrower-app/05-transactions.png',label: 'Transactions' },
  { src: '/screenshots/borrower-app/06-transcripts.png', label: 'Credit transcripts' },
  { src: '/screenshots/borrower-app/07-support.png',     label: 'Support' },
  { src: '/screenshots/borrower-app/08-profile.png',     label: 'Profile' },
];

/* ─── Carousel hook ──────────────────────────────────────────────── */
function useCarousel(count: number, autoMs = 5000) {
  const [idx, setIdx] = useState(0);
  // Once the visitor takes control (swipe, arrow, dot), autoplay stops for
  // good — it was previously resetting on every idx change including manual
  // ones, so autoplay could yank the slide away mid-interaction and make it
  // look like the carousel was "disappearing" while someone tried to swipe.
  const interacted = useRef(false);
  const next = useCallback(() => setIdx((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => { interacted.current = true; setIdx((i) => (i - 1 + count) % count); }, [count]);
  const goTo = useCallback((n: number) => { interacted.current = true; setIdx(n); }, []);
  const nextManual = useCallback(() => { interacted.current = true; next(); }, [next]);
  useEffect(() => {
    if (interacted.current) return;
    const t = setTimeout(next, autoMs);
    return () => clearTimeout(t);
  }, [idx, next, autoMs]);
  return { idx, next: nextManual, prev, goTo };
}

/* ─── Touch / mouse swipe handler ────────────────────────────────── */
function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef(0);
  return {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; },
    onTouchEnd:   (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 40) dx < 0 ? onLeft() : onRight();
    },
    onMouseDown: (e: React.MouseEvent) => { startX.current = e.clientX; },
    onMouseUp:   (e: React.MouseEvent) => {
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 40) dx < 0 ? onLeft() : onRight();
    },
  };
}

/* ─── Shared dot indicators ──────────────────────────────────────── */
function Dots({ count, active, onDot, light = false }: {
  count: number; active: number; onDot: (i: number) => void; light?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDot(i)}
          aria-label={`Go to slide ${i + 1}`}
          style={{
            width:      i === active ? 18 : 6,
            height:     6,
            borderRadius: 99,
            transition: 'width 0.3s ease, background 0.3s ease',
            background: i === active
              ? (light ? 'rgba(255,255,255,0.9)' : '#7C3AED')
              : (light ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.25)'),
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Nav arrow buttons ──────────────────────────────────────────── */
function NavBtn({ dir, onClick, light = false }: {
  dir: 'prev' | 'next'; onClick: () => void; light?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={dir === 'prev' ? 'Previous slide' : 'Next slide'}
      className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
      style={{
        [dir === 'prev' ? 'left' : 'right']: 8,
        background: light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'}`,
        color: light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.08)';
      }}
    >
      {dir === 'prev' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}

/* ─── Lender admin view ──────────────────────────────────────────── */
function LenderView() {
  const { idx, next, prev, goTo } = useCarousel(MOCK_SLIDES.length, 5000);
  const swipe = useSwipe(next, prev);
  const slide = MOCK_SLIDES[idx];

  return (
    <div className="relative w-full max-w-4xl mx-auto">

      {/* Laptop frame */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: '#1A1A1F',
          border: '10px solid #2A2A30',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12), 0 0 60px -10px rgba(124,58,237,0.2)',
          animation: 'breathe 8s ease-in-out infinite',
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#0F0F12]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.7)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(245,158,11,0.7)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(52,211,153,0.7)' }} />
          </div>
          <div
            className="flex-1 mx-4 px-3 py-1 rounded-md text-[11px] font-mono text-center transition-all duration-300"
            style={{ background: '#2d2d2d', color: '#888' }}
          >
            {slide.url}
          </div>
        </div>

        {/* Slides */}
        <div
          className="relative overflow-hidden select-none"
          style={{ height: 'clamp(260px, 45vw, 440px)', touchAction: 'pan-y' }}
          {...swipe}
        >
          <div
            className="flex h-full"
            style={{
              width: `${MOCK_SLIDES.length * 100}%`,
              transform: `translateX(-${(idx * 100) / MOCK_SLIDES.length}%)`,
              transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            {MOCK_SLIDES.map((s, i) => (
              <div key={i} className="relative h-full shrink-0" style={{ width: `${100 / MOCK_SLIDES.length}%` }}>
                <Image
                  src={s.src}
                  alt={`AlgoLend admin console — ${s.label}`}
                  width={2880}
                  height={1800}
                  unoptimized
                  priority
                  className="w-full h-full object-cover object-top"
                />
              </div>
            ))}
          </div>

          {/* White-label overlay — the admin sidebar's top-left corner is
              blank real estate in these screenshots; stamp "Your Logo" there
              on every slide to make the white-labeling message concrete. */}
          <div className="absolute left-0 top-0 flex items-center gap-1.5 px-3 py-2 pointer-events-none" style={{ width: '11%' }}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.2)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#A78BFA' }} />
            </span>
            <span className="text-[10px] font-bold tracking-tight text-white/90 whitespace-nowrap">Your Logo</span>
          </div>

          {/* Arrows */}
          <NavBtn dir="prev" onClick={prev} />
          <NavBtn dir="next" onClick={next} />
        </div>

        {/* Dot indicators inside laptop chrome */}
        <div className="bg-[#0F0F12]">
          <Dots count={MOCK_SLIDES.length} active={idx} onDot={goTo} light />
        </div>
      </div>

      {/* Floating badge — top right: Live indicator */}
      <div
        className="absolute -top-4 right-6 flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-semibold bg-[var(--color-bg)] text-[var(--color-ink)] shadow-2xl"
        style={{
          animation: 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both, badge-float 5s ease-in-out 1.2s infinite',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        <span className="relative w-2 h-2 rounded-full bg-emerald-500">
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
        </span>
        Live · 47 applications today
      </div>

      {/* Floating badge — left: approval notification */}
      <div
        className="hidden md:flex absolute top-16 -left-6 items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[var(--color-bg)] shadow-2xl"
        style={{
          animation: 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.7s both, badge-float 6s ease-in-out 1.5s infinite',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}
        >
          <Check size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[12px] font-bold text-[var(--color-ink)]">R 50,000 approved</p>
          <p className="text-[10px] text-[var(--color-ink-muted)]">Mahlangu Tech · 2s ago</p>
        </div>
      </div>

      {/* Floating badge — bottom: portfolio insight */}
      <div
        className="hidden md:flex absolute -bottom-4 left-10 items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[var(--color-bg)] shadow-2xl"
        style={{
          animation: 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 1s both, badge-float 7s ease-in-out 2s infinite',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}
        >
          <BarChart3 size={14} className="text-blue-500" />
        </div>
        <div>
          <p className="text-[12px] font-bold text-[var(--color-ink)]">Book up 18% this month</p>
          <p className="text-[10px] text-[var(--color-ink-muted)]">Arrears down to 3.1%</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Borrower portal view ───────────────────────────────────────── */
function BorrowerView() {
  const { idx, next, prev, goTo } = useCarousel(BORROWER_SLIDES.length, 4500);
  const swipe = useSwipe(next, prev);

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 600 }}>

      {/* Left context */}
      <div className="hidden md:block absolute left-[4%] top-1/2 -translate-y-1/2 max-w-[190px] space-y-3">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Borrower sees</p>
        <p className="text-white text-base font-semibold leading-snug">
          Their branded portal. Your logo, your colours.
        </p>
        <ul className="space-y-2">
          {['Balance & repayments', 'Debit order control', 'Statement download', 'New application'].map((f) => (
            <li key={f} className="flex items-center gap-2 text-white/60 text-xs">
              <Check size={11} className="text-emerald-400 shrink-0" />{f}
            </li>
          ))}
        </ul>
      </div>

      {/* Phone frame */}
      <div
        className="relative"
        style={{ width: 260, animation: 'breathe 7s ease-in-out infinite' }}
      >
        <div
          className="rounded-[42px] overflow-hidden"
          style={{
            background: '#1A1A1F',
            padding: '10px 8px',
            boxShadow: '0 40px 80px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* Notch */}
          <div className="flex items-center justify-center h-7 bg-[#1A1A1F]">
            <div className="rounded-full bg-black" style={{ width: 100, height: 18 }} />
          </div>

          {/* Slides inside phone screen */}
          <div
            className="overflow-hidden rounded-2xl relative select-none cursor-grab active:cursor-grabbing"
            style={{ height: 528, touchAction: 'pan-y' }}
            {...swipe}
          >
            <div
              className="flex h-full"
              style={{
                width: `${BORROWER_SLIDES.length * 100}%`,
                transform: `translateX(-${(idx * 100) / BORROWER_SLIDES.length}%)`,
                transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            >
              {BORROWER_SLIDES.map((s, i) => (
                <div key={i} className="relative h-full shrink-0" style={{ width: `${100 / BORROWER_SLIDES.length}%` }}>
                  <Image
                    src={s.src}
                    alt={`AlgoLend borrower portal — ${s.label}`}
                    width={390}
                    height={1200}
                    unoptimized
                    className="w-full object-cover object-top"
                    style={{ height: '100%' }}
                    priority
                  />
                </div>
              ))}
            </div>

            {/* Nav bar overlay — full-width white strip covering the AlgoLend branding in screenshots */}
            <div
              className="absolute z-10 pointer-events-none inset-x-0 top-0 flex items-center justify-center gap-2"
              style={{ height: 44, background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
              </div>
              <span className="text-[11px] font-bold tracking-wide" style={{ color: '#7C3AED' }}>Your Logo</span>
            </div>

            {/* Prev/next arrows inside screen */}
            <NavBtn dir="prev" onClick={prev} light />
            <NavBtn dir="next" onClick={next} light />
          </div>

          {/* Dot indicators + home indicator */}
          <div className="bg-[#1A1A1F]">
            <Dots count={BORROWER_SLIDES.length} active={idx} onDot={goTo} light />
            <div className="flex items-center justify-center pb-2 pt-1">
              <div className="w-24 h-1 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Right context */}
      <div className="hidden md:block absolute right-[4%] top-1/2 -translate-y-1/2 max-w-[190px] text-right space-y-3">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">White-label</p>
        <p className="text-white text-base font-semibold leading-snug">
          Zero AlgoLend branding visible to your borrowers.
        </p>
        <ul className="space-y-2">
          {['Your logo', 'Your colour scheme', 'Your domain', 'Your email templates'].map((f) => (
            <li key={f} className="flex items-center justify-end gap-2 text-white/60 text-xs">
              {f}<Check size={11} className="text-purple-400 shrink-0" />
            </li>
          ))}
        </ul>
      </div>

      {/* Floating badge — top: credit score */}
      <div
        className="hidden md:flex absolute top-8 right-[25%] items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[var(--color-bg)] shadow-2xl"
        style={{
          animation: 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both, badge-float 5.5s ease-in-out 1.3s infinite',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <Sparkles size={12} style={{ color: '#7C3AED' }} />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[var(--color-ink)]">Score · 74 / 100</p>
          <p className="text-[9px] text-[var(--color-ink-muted)]">Risk band B</p>
        </div>
      </div>

      {/* Floating badge — bottom: KYC */}
      <div
        className="hidden md:flex absolute bottom-10 left-[25%] items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[var(--color-bg)] shadow-2xl"
        style={{
          animation: 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s both, badge-float 6.5s ease-in-out 1.8s infinite',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <Check size={12} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[var(--color-ink)]">KYC passed</p>
          <p className="text-[9px] text-[var(--color-ink-muted)]">Biometric verified</p>
        </div>
      </div>

    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────────── */
export function DualViewShowcase() {
  const [active, setActive]   = useState<'lender' | 'borrower'>('lender');
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  function switchTo(view: 'lender' | 'borrower') {
    if (view === active || animating) return;
    setDirection(view === 'borrower' ? 'right' : 'left');
    setAnimating(true);
    setTimeout(() => {
      setActive(view);
      setAnimating(false);
    }, 300);
  }

  return (
    <div>
      {/* Toggle pill */}
      <div className="flex justify-center mb-14">
        <div
          className="inline-flex rounded-full p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {([
            { key: 'lender',   label: 'Your view',       sub: 'Admin console' },
            { key: 'borrower', label: "Borrower's view",  sub: 'Mobile portal' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTo(tab.key)}
              className="relative px-3 sm:px-6 py-2 sm:py-3 rounded-full text-[12px] sm:text-[13px] font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2.5"
              style={{
                background: active === tab.key ? 'white' : 'transparent',
                color:      active === tab.key ? '#0F0A1E' : 'rgba(255,255,255,0.5)',
                boxShadow:  active === tab.key ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
              }}
            >
              <span>{tab.label}</span>
              <span
                className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: active === tab.key ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.08)',
                  color:      active === tab.key ? '#7C3AED' : 'rgba(255,255,255,0.35)',
                }}
              >
                {tab.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* View with swipe animation */}
      <div className="pb-12 overflow-visible">
        <div
          style={{
            opacity:   animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === 'right' ? '-50px' : '50px'}) scale(0.97)`
              : 'translateX(0) scale(1)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          {active === 'lender' ? <LenderView /> : <BorrowerView />}
        </div>
      </div>
    </div>
  );
}
