'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Sparkles, BarChart3 } from 'lucide-react';

/* ─── Lender admin view — real screenshot inside laptop chrome ──── */
function LenderView() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">

      {/* Laptop frame */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: '#1A1A1F',
          border: '10px solid #1A1A1F',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
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
            className="flex-1 mx-4 px-3 py-1 rounded-md text-[11px] font-mono text-center"
            style={{ background: '#2d2d2d', color: '#888' }}
          >
            admin.algolend.co.za/dashboard
          </div>
        </div>

        {/* Real screenshot */}
        <div className="relative overflow-hidden" style={{ height: 420 }}>
          <Image
            src="/screenshots/lender-dashboard.jpg"
            alt="AlgoLend lender admin dashboard"
            width={1400}
            height={860}
            className="w-full object-cover object-top"
            style={{ height: '100%' }}
            unoptimized
          />
          {/* Subtle vignette at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(26,26,31,0.6))' }}
          />
        </div>

        {/* Laptop base notch */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-1 rounded-b-3xl bg-[#0A0A0D]"
          style={{ width: '105%', height: 12 }}
          aria-hidden
        />
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

/* ─── Borrower portal view — real screenshot inside phone chrome ── */
function BorrowerView() {
  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 520 }}>

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

      {/* Phone frame with real screenshot */}
      <div
        className="relative"
        style={{ width: 260, animation: 'breathe 7s ease-in-out infinite' }}
      >
        {/* Phone outer shell */}
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
            <div
              className="rounded-full bg-black"
              style={{ width: 100, height: 18 }}
            />
          </div>

          {/* Screenshot inside phone — uses true 390px mobile capture */}
          <div
            className="overflow-hidden rounded-2xl"
            style={{ height: 480 }}
          >
            <Image
              src="/screenshots/borrower-mobile.jpg"
              alt="AlgoLend borrower portal"
              width={390}
              height={1200}
              className="w-full object-cover object-top"
              style={{ height: 'auto' }}
              unoptimized
            />
          </div>

          {/* Home indicator */}
          <div className="flex items-center justify-center py-2 bg-[#1A1A1F]">
            <div className="w-24 h-1 rounded-full bg-white/20" />
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
  const [active, setActive] = useState<'lender' | 'borrower'>('lender');
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
            { key: 'lender',   label: 'Your view',      sub: 'Admin console' },
            { key: 'borrower', label: "Borrower's view", sub: 'Mobile portal' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTo(tab.key)}
              className="relative px-6 py-3 rounded-full text-[13px] font-semibold transition-all duration-300 flex items-center gap-2.5"
              style={{
                background: active === tab.key ? 'white' : 'transparent',
                color: active === tab.key ? '#0F0A1E' : 'rgba(255,255,255,0.5)',
                boxShadow: active === tab.key ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
              }}
            >
              <span>{tab.label}</span>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: active === tab.key ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.08)',
                  color: active === tab.key ? '#7C3AED' : 'rgba(255,255,255,0.35)',
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
            opacity: animating ? 0 : 1,
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
