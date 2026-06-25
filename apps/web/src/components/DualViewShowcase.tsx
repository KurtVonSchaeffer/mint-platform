'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Check, Sparkles, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

/* ─── Lender mock slide config ───────────────────────────────────── */
const MOCK_SLIDES = [
  { key: 'dashboard',    label: 'Dashboard',    url: 'admin.algolend.co.za/dashboard'    },
  { key: 'loanbook',    label: 'Loan Book',    url: 'admin.algolend.co.za/loan-book'    },
  { key: 'applications', label: 'Applications', url: 'admin.algolend.co.za/applications' },
] as const;

/* ─── Mini sidebar logo ──────────────────────────────────────────── */
function MiniLogo() {
  return (
    <svg width={16} height={16} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.10)" />
      <path d="M 6 28 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 28"
        stroke="#A78BFA" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="15" r="5.5" fill="#0F1629" />
    </svg>
  );
}

/* ─── Shared admin shell (sidebar + content area) ────────────────── */
const SIDEBAR_ITEMS = ['Dashboard', 'Analytics', 'Applications', 'Users', 'Payments', 'Credit Rules', 'Loan Book', 'Cash Ledger'];

function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full" style={{ background: '#0d0b1a' }}>
      <div className="w-28 shrink-0 flex flex-col p-2" style={{ background: 'rgba(8,5,20,0.85)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mb-3 flex items-center gap-1.5 pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <MiniLogo />
          <span className="text-[9px] font-bold text-white">AlgoLend</span>
        </div>
        {SIDEBAR_ITEMS.map(item => (
          <div key={item}
            className="mb-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[8px]"
            style={{
              background: item === active ? 'rgba(167,139,250,0.12)' : 'transparent',
              color: item === active ? '#C4B5FD' : 'rgba(255,255,255,0.30)',
            }}
          >
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: item === active ? '#A78BFA' : 'rgba(255,255,255,0.15)' }} />
            {item}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/* ─── Slide 1: Dashboard ─────────────────────────────────────────── */
function DashboardSlide() {
  return (
    <AdminShell active="Dashboard">
      <div className="flex h-full flex-col gap-2 p-3" style={{ background: 'rgba(13,10,26,0.65)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-wider font-mono" style={{ color: 'rgba(255,255,255,0.30)' }}>Tuesday, 9 June 2026</p>
            <p className="text-sm font-semibold text-white">Welcome back, Sipho</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>● Operational</span>
            <span className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>SureSystems Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: 'Total Balance',   v: 'R 2.4M',  d: '+18%' },
            { l: 'Total Disbursed', v: 'R 1.2M',  d: '+12%' },
            { l: 'Cash Flow',       v: 'R 89.4K', d: '+9%'  },
            { l: 'Active Loans',    v: '23',       d: '+4'   },
          ].map(s => (
            <div key={s.l} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
              <p className="mt-0.5 text-[11px] font-bold text-white">{s.v}</p>
              <p className="mt-0.5 text-[7px] font-semibold text-emerald-400">↗ {s.d}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[8px] font-semibold text-white/70">Cash Flow Velocity</p>
            <span className="text-[7px] font-semibold text-emerald-400">↗ +18%</span>
          </div>
          <svg viewBox="0 0 400 48" className="w-full" style={{ height: 48 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="dv-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7C3AED" stopOpacity="0.4" />
                <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 40 L30 37 L60 33 L90 36 L120 27 L150 30 L180 20 L210 23 L240 14 L270 18 L300 11 L330 14 L360 6 L400 2 L400 48 L0 48 Z" fill="url(#dv-grad)" />
            <path d="M0 40 L30 37 L60 33 L90 36 L120 27 L150 30 L180 20 L210 23 L240 14 L270 18 L300 11 L330 14 L360 6 L400 2" stroke="#A78BFA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <div className="rounded-xl overflow-hidden flex-1" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[8px] font-semibold text-white/60">Recent Applications</p>
            <p className="text-[7px] font-mono text-white/30">5 NEW</p>
          </div>
          {[
            { n: 'Nkosi Holdings',    a: 'R 50,000',  s: 'pending',   c: 'rgba(96,165,250,0.15)',    t: '#93C5FD' },
            { n: 'Dlamini Logistics', a: 'R 120,000', s: 'approved',  c: 'rgba(52,211,153,0.15)',    t: '#6EE7B7' },
            { n: 'Mahlangu Tech',     a: 'R 30,000',  s: 'disbursed', c: 'rgba(167,139,250,0.15)',   t: '#C4B5FD' },
          ].map(r => (
            <div key={r.n} className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[8px] text-white/70">{r.n}</span>
              <span className="text-[8px] text-white/40">{r.a}</span>
              <span className="rounded px-1.5 py-0.5 text-[7px] font-medium" style={{ background: r.c, color: r.t }}>{r.s}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

/* ─── Slide 2: Loan Book ─────────────────────────────────────────── */
function LoanBookSlide() {
  return (
    <AdminShell active="Loan Book">
      <div className="flex h-full flex-col gap-2 p-3" style={{ background: 'rgba(13,10,26,0.65)' }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Loan Book</p>
          <span className="text-[8px] px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>Export CSV</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: 'Active Loans', v: '23'      },
            { l: 'Portfolio',    v: 'R 2.4M'  },
            { l: 'Avg Rate',     v: '24.2%'   },
            { l: 'Arrears',      v: '3.1%'    },
          ].map(s => (
            <div key={s.l} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
              <p className="mt-0.5 text-[11px] font-bold text-white">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden flex-1" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="grid grid-cols-5 px-2.5 py-1.5 text-[7px] font-semibold" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.40)' }}>
            <span>Borrower</span><span>Amount</span><span>Term</span><span>Rate</span><span>Status</span>
          </div>
          {[
            { n: 'Nkosi Holdings',    a: 'R 50,000',  t: '24m', r: '24%', s: 'current',  c: 'rgba(52,211,153,0.15)',   tx: '#6EE7B7' },
            { n: 'Dlamini Logistics', a: 'R 120,000', t: '36m', r: '21%', s: 'current',  c: 'rgba(52,211,153,0.15)',   tx: '#6EE7B7' },
            { n: 'Mahlangu Tech',     a: 'R 30,000',  t: '12m', r: '27%', s: 'current',  c: 'rgba(52,211,153,0.15)',   tx: '#6EE7B7' },
            { n: 'Sithole Retail',    a: 'R 85,000',  t: '18m', r: '23%', s: 'current',  c: 'rgba(52,211,153,0.15)',   tx: '#6EE7B7' },
            { n: 'Mthembu Farms',     a: 'R 45,000',  t: '24m', r: '25%', s: '1-30 days',c: 'rgba(245,158,11,0.15)',   tx: '#FCD34D' },
          ].map(r => (
            <div key={r.n} className="grid grid-cols-5 items-center px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[8px] text-white/75">{r.n}</span>
              <span className="text-[8px] text-white/55">{r.a}</span>
              <span className="text-[8px] text-white/45">{r.t}</span>
              <span className="text-[8px] text-white/55">{r.r}</span>
              <span className="rounded px-1.5 py-0.5 text-[7px] font-medium w-fit" style={{ background: r.c, color: r.tx }}>{r.s}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

/* ─── Slide 3: Applications ──────────────────────────────────────── */
function ApplicationsSlide() {
  return (
    <AdminShell active="Applications">
      <div className="flex h-full flex-col gap-2 p-3" style={{ background: 'rgba(13,10,26,0.65)' }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Applications</p>
          <span className="text-[8px] px-2.5 py-1 rounded-full font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)' }}>+ New Application</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: 'Pending',    v: '8',  c: '#93C5FD' },
            { l: 'In Review',  v: '3',  c: '#FCD34D' },
            { l: 'Approved',   v: '6',  c: '#6EE7B7' },
            { l: 'Disbursed',  v: '5',  c: '#C4B5FD' },
          ].map(s => (
            <div key={s.l} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
              <p className="mt-0.5 text-[13px] font-bold" style={{ color: s.c }}>{s.v}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden flex-1" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="grid grid-cols-4 px-2.5 py-1.5 text-[7px] font-semibold" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.40)' }}>
            <span>Applicant</span><span>Amount</span><span>Bureau</span><span>Status</span>
          </div>
          {[
            { n: 'Zulu Properties', a: 'R 200,000', b: '71', s: 'under review', c: 'rgba(245,158,11,0.15)',   tx: '#FCD34D' },
            { n: 'Mokoena Auto',    a: 'R 75,000',  b: '82', s: 'approved',     c: 'rgba(52,211,153,0.15)',   tx: '#6EE7B7' },
            { n: 'Khumalo Clinic',  a: 'R 150,000', b: '68', s: 'pending',      c: 'rgba(96,165,250,0.15)',   tx: '#93C5FD' },
            { n: 'Ndlovu Trading',  a: 'R 60,000',  b: '79', s: 'disbursed',    c: 'rgba(167,139,250,0.15)',  tx: '#C4B5FD' },
            { n: 'Dube & Sons',     a: 'R 90,000',  b: '74', s: 'under review', c: 'rgba(245,158,11,0.15)',   tx: '#FCD34D' },
          ].map(r => (
            <div key={r.n} className="grid grid-cols-4 items-center px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[8px] text-white/75">{r.n}</span>
              <span className="text-[8px] text-white/55">{r.a}</span>
              <span className="text-[8px] font-semibold" style={{ color: '#A78BFA' }}>{r.b}</span>
              <span className="rounded px-1.5 py-0.5 text-[7px] font-medium w-fit" style={{ background: r.c, color: r.tx }}>{r.s}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

const SLIDE_COMPONENTS = [DashboardSlide, LoanBookSlide, ApplicationsSlide];

const BORROWER_SLIDES = [
  { src: '/screenshots/borrower-live-dashboard.jpg', label: 'Dashboard' },
  { src: '/screenshots/borrower-live-apply.jpg',     label: 'My Loans'  },
];

/* ─── Carousel hook ──────────────────────────────────────────────── */
function useCarousel(count: number, autoMs = 5000) {
  const [idx, setIdx] = useState(0);
  const next = useCallback(() => setIdx((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + count) % count), [count]);
  const goTo = useCallback((n: number) => setIdx(n), []);
  // auto-advance resets on every idx change (including manual nav)
  useEffect(() => {
    const t = setTimeout(next, autoMs);
    return () => clearTimeout(t);
  }, [idx, next, autoMs]);
  return { idx, next, prev, goTo };
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
  const SlideComponent = SLIDE_COMPONENTS[idx];

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
          style={{ height: 'clamp(260px, 45vw, 440px)' }}
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
            {MOCK_SLIDES.map((_, i) => {
              const Comp = SLIDE_COMPONENTS[i];
              return (
                <div key={i} className="h-full" style={{ width: `${100 / MOCK_SLIDES.length}%` }}>
                  <Comp />
                </div>
              );
            })}
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
          Their branded portal — your logo, your colours.
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
            style={{ height: 528 }}
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
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="w-full object-cover object-top"
                    style={{ height: '100%' }}
                    priority={i === 0}
                  />
                </div>
              ))}
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
