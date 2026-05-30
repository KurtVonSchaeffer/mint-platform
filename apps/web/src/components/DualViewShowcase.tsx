'use client';

import { useState } from 'react';
import { Check, Sparkles, BarChart3, ArrowRight } from 'lucide-react';

/* ─── Inline logo (no external dep) ────────────────────────────── */
function MiniLogo({ size = 20, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill={dark ? '#F4F4F5' : 'rgba(255,255,255,0.12)'} />
      <path d="M 6 28 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 28"
        stroke={dark ? '#7C3AED' : '#A78BFA'} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="15" r="5.5" fill={dark ? '#0F1629' : '#0d0b1a'} />
    </svg>
  );
}

/* ─── Lender admin view ─────────────────────────────────────────── */
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
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0F0F12]">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400/60" />
            <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
            <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
          </div>
          <div className="flex-1 mx-3 px-2 py-0.5 rounded text-[8px] font-mono text-white/30 text-center bg-white/5">
            admin.bridgecapital.algolend.co.za
          </div>
        </div>

        {/* App shell */}
        <div className="grid grid-cols-[160px_1fr] bg-[var(--color-bg)]" style={{ height: 400 }}>
          {/* Sidebar */}
          <div className="bg-[var(--color-ink)] text-white p-3 space-y-0.5">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
              <MiniLogo size={20} />
              <span className="text-[10px] font-bold">BridgeCapital</span>
            </div>
            {['Dashboard', 'Applications', 'Loan Book', 'Payments', 'Compliance', 'Reports', 'Team', 'Settings'].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px]"
                style={{
                  background: i === 0 ? 'rgba(167,139,250,0.12)' : 'transparent',
                  color: i === 0 ? '#C4B5FD' : 'rgba(255,255,255,0.38)',
                }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: i === 0 ? '#A78BFA' : 'rgba(255,255,255,0.18)' }} />
                {item}
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="p-4 space-y-3 overflow-hidden bg-[var(--color-bg)]">
            <div>
              <p className="text-[8px] text-[var(--color-ink-muted)] uppercase tracking-wider font-mono">Good morning</p>
              <p className="text-base font-bold tracking-tight">Dashboard</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Active book', v: 'R 84.2M', d: '+12%' },
                { l: 'Approved (May)', v: 'R 2.4M', d: '+8.4%' },
                { l: 'Arrears', v: '3.1%', d: '-0.4%' },
                { l: 'Avg score', v: '74', d: '+3' },
              ].map((s) => (
                <div key={s.l} className="bg-white rounded-lg p-2 border border-[var(--color-border)]">
                  <p className="text-[8px] text-[var(--color-ink-muted)]">{s.l}</p>
                  <p className="text-xs font-bold mt-0.5">{s.v}</p>
                  <p className="text-[8px] text-emerald-600 font-semibold mt-0.5">↗ {s.d}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] font-bold">Disbursements — last 30 days</p>
                <span className="text-[7px] text-emerald-600 font-semibold">↗ 18%</span>
              </div>
              <svg viewBox="0 0 280 44" className="w-full h-[44px]" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dv-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7C3AED" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 38 L20 35 L40 30 L60 32 L80 24 L100 27 L120 18 L140 22 L160 14 L180 18 L200 10 L220 13 L240 6 L260 8 L280 3 L280 44 L0 44 Z" fill="url(#dv-grad)" />
                <path d="M0 38 L20 35 L40 30 L60 32 L80 24 L100 27 L120 18 L140 22 L160 14 L180 18 L200 10 L220 13 L240 6 L260 8 L280 3" stroke="#7C3AED" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-2.5 py-1.5 border-b border-[var(--color-border)] flex justify-between">
                <p className="text-[8px] font-bold">Recent applications</p>
                <p className="text-[7px] text-[var(--color-ink-muted)] font-mono">5 NEW</p>
              </div>
              {[
                { n: 'Nkosi Holdings',    a: 'R 50,000',  s: 'pending',  c: 'bg-blue-50 text-blue-700' },
                { n: 'Dlamini Logistics', a: 'R 120,000', s: 'review',   c: 'bg-amber-50 text-amber-700' },
                { n: 'Mahlangu Tech',     a: 'R 30,000',  s: 'approved', c: 'bg-emerald-50 text-emerald-700' },
              ].map((r) => (
                <div key={r.n} className="flex items-center justify-between px-2.5 py-1 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-[8px] text-[var(--color-ink)]">{r.n}</span>
                  <span className="text-[8px] text-[var(--color-ink-muted)]">{r.a}</span>
                  <span className={`text-[7px] px-1 py-0.5 rounded font-semibold ${r.c}`}>{r.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Laptop base */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-[105%] h-3 rounded-b-3xl bg-[#0A0A0D]" aria-hidden />
      </div>

      {/* Floating chips */}
      <div className="absolute -top-3 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[var(--color-bg)] text-[var(--color-ink)] shadow-2xl">
        <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500">
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
        </span>
        Live · 47 applications today
      </div>
      <div className="hidden md:flex absolute top-20 -left-5 items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--color-bg)] text-[var(--color-ink)] shadow-2xl">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={13} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-[11px] font-bold">R 50,000 approved</p>
          <p className="text-[9px] text-[var(--color-ink-muted)]">Mahlangu Tech · 2s ago</p>
        </div>
      </div>
      <div className="hidden md:flex absolute -bottom-3 left-8 items-center gap-2.5 px-3 py-2 rounded-2xl bg-[var(--color-bg)] text-[var(--color-ink)] shadow-2xl">
        <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
          <BarChart3 size={13} className="text-sky-700" />
        </div>
        <div>
          <p className="text-[11px] font-bold">Book up 18% this month</p>
          <p className="text-[9px] text-[var(--color-ink-muted)]">Arrears down to 3.1%</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Borrower portal view ──────────────────────────────────────── */
function BorrowerView() {
  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 520 }}>
      {/* Context label */}
      <div className="hidden md:block absolute left-[5%] top-1/2 -translate-y-1/2 max-w-[200px] text-left space-y-3">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Borrower sees</p>
        <p className="text-white text-lg font-semibold leading-snug">Their branded portal — your logo, your colours.</p>
        <ul className="space-y-1.5">
          {['Balance & repayments', 'Debit order control', 'Statement download', 'New application'].map((f) => (
            <li key={f} className="flex items-center gap-2 text-white/60 text-xs">
              <Check size={11} className="text-emerald-400 shrink-0" />{f}
            </li>
          ))}
        </ul>
      </div>

      {/* Phone */}
      <div
        className="w-[240px] rounded-[38px] overflow-hidden"
        style={{
          background: '#1A1A1F',
          border: '8px solid #1A1A1F',
          boxShadow: '0 40px 80px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
          animation: 'breathe 7s ease-in-out infinite',
        }}
      >
        {/* Notch */}
        <div className="relative h-6 flex items-center justify-center bg-[#1A1A1F]">
          <div className="w-24 h-4 rounded-full bg-black" />
        </div>

        {/* Screen */}
        <div className="bg-[var(--color-bg)] px-4 pt-2 pb-5 space-y-3">
          <div className="flex items-center justify-between text-[8px] font-mono text-[var(--color-ink-muted)]">
            <span>9:41</span><span>● ● ●</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-soft)]">
            <div className="flex items-center gap-1.5">
              <MiniLogo size={18} dark />
              <span className="text-[10px] font-bold">Portal</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center text-[8px] font-bold">SN</div>
          </div>
          <div>
            <p className="text-[9px] text-[var(--color-ink-muted)]">Welcome back</p>
            <p className="text-sm font-bold tracking-tight">Sipho</p>
          </div>
          <div className="rounded-2xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
            <p className="text-[8px] uppercase tracking-wider opacity-70 mb-1">Outstanding balance</p>
            <p className="text-xl font-bold tracking-tight">R 18,500</p>
            <div className="mt-2 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/80 rounded-full" style={{ width: '38%' }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[7px] opacity-70">
              <span>R 31,500 paid</span><span>R 50,000 total</span>
            </div>
          </div>
          <div className="rounded-xl p-2.5 bg-white border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[8px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Next payment</p>
              <p className="text-[8px] font-mono text-[var(--color-ink-muted)]">1 Jun</p>
            </div>
            <p className="text-base font-bold tracking-tight">R 4,640</p>
            <p className="text-[8px] text-emerald-600 font-semibold mt-0.5">✓ Debit order active</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg bg-[var(--color-ink)] text-white text-[9px] font-semibold py-2 text-center">Pay now</div>
            <div className="rounded-lg text-[var(--color-ink)] text-[9px] font-semibold py-2 text-center border border-[var(--color-border)]">Top up</div>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-1.5">Recent</p>
            <div className="space-y-1.5">
              {[
                { l: 'Payment received', a: '+R 4,640', c: 'text-emerald-600' },
                { l: 'Statement viewed', a: '20 May', c: 'text-[var(--color-ink-muted)]' },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-[9px]">
                  <span className="text-[var(--color-ink)]">{r.l}</span>
                  <span className={r.c + ' font-semibold'}>{r.a}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center pt-1">
            <div className="w-10 h-0.5 rounded-full bg-[var(--color-ink-muted)]" />
          </div>
        </div>
      </div>

      {/* Context label — right */}
      <div className="hidden md:block absolute right-[5%] top-1/2 -translate-y-1/2 max-w-[200px] text-right space-y-3">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">White-label</p>
        <p className="text-white text-lg font-semibold leading-snug">Zero AlgoLend branding visible to your borrowers.</p>
        <ul className="space-y-1.5 items-end">
          {['Your logo', 'Your colour scheme', 'Your domain', 'Your email templates'].map((f) => (
            <li key={f} className="flex items-center justify-end gap-2 text-white/60 text-xs">
              {f}<Check size={11} className="text-purple-400 shrink-0" />
            </li>
          ))}
        </ul>
      </div>

      {/* Floating chips */}
      <div className="hidden md:flex absolute top-8 right-[26%] items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--color-bg)] text-[var(--color-ink)] shadow-2xl">
        <div className="w-6 h-6 rounded-full bg-[var(--color-brand-soft)] flex items-center justify-center">
          <Sparkles size={11} className="text-[var(--color-brand)]" />
        </div>
        <div>
          <p className="text-[10px] font-bold">Score · 74 / 100</p>
          <p className="text-[8px] text-[var(--color-ink-muted)]">Risk band B</p>
        </div>
      </div>
      <div className="hidden md:flex absolute bottom-10 left-[26%] items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--color-bg)] text-[var(--color-ink)] shadow-2xl">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={11} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-[10px] font-bold">KYC passed</p>
          <p className="text-[8px] text-[var(--color-ink-muted)]">Biometric verified</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Exported component ────────────────────────────────────────── */
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
    }, 280);
  }

  return (
    <div>
      {/* Toggle pill */}
      <div className="flex justify-center mb-12">
        <div
          className="inline-flex rounded-full p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {([
            { key: 'lender',   label: 'Your view',       sub: 'Admin console' },
            { key: 'borrower', label: "Borrower's view",  sub: 'Mobile portal' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTo(tab.key)}
              className="relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2"
              style={{
                background: active === tab.key ? 'white' : 'transparent',
                color: active === tab.key ? '#0F0A1E' : 'rgba(255,255,255,0.5)',
                boxShadow: active === tab.key ? '0 2px 12px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <span>{tab.label}</span>
              <span
                className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
                style={{
                  background: active === tab.key ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.1)',
                  color: active === tab.key ? '#7C3AED' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tab.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* View container — no overflow-hidden so floating chips bleed outside */}
      <div className="pb-10">
        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === 'right' ? '-40px' : '40px'})`
              : 'translateX(0)',
            transition: 'opacity 0.28s ease, transform 0.28s ease',
          }}
        >
          {active === 'lender' ? <LenderView /> : <BorrowerView />}
        </div>
      </div>
    </div>
  );
}
