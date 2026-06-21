

import { useState } from 'react';
import { Check, TrendingUp, ShieldCheck, Zap } from 'lucide-react';

function MiniLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="white" fillOpacity="0.1" />
      <path d="M 6 28 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 28"
        stroke="#A78BFA" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="15" r="5.5" fill="#0F1629" />
    </svg>
  );
}

const SIDEBAR_ITEMS = ['Dashboard', 'Applications', 'Loan Book', 'Compliance', 'Reports', 'Team'];

const STATS = [
  { l: 'Applications', v: '47',    d: '+12%' },
  { l: 'Approved',     v: 'R 2.4M', d: '+8.4%' },
  { l: 'Decline rate', v: '14%',   d: '-2.1%' },
  { l: 'Avg score',    v: '74',    d: '+3'    },
];

const APPS = [
  { n: 'Nkosi Holdings',    a: 'R 50,000',  s: 'pending',  col: 'bg-blue-400/15 text-blue-300' },
  { n: 'Dlamini Logistics', a: 'R 120,000', s: 'review',   col: 'bg-amber-400/15 text-amber-300' },
  { n: 'Mahlangu Tech',     a: 'R 30,000',  s: 'approved', col: 'bg-emerald-400/15 text-emerald-300' },
];

export function HeroVisual() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="mt-20 relative select-none" aria-hidden>

      {/* Radial glow behind the card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 60%, rgba(124,58,237,0.18) 0%, rgba(99,30,220,0.08) 40%, transparent 70%)',
        }}
      />

      {/* 3D tilt wrapper */}
      <div
        className="relative mx-auto max-w-5xl cursor-pointer"
        style={{
          transform: hovered
            ? 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1.01)'
            : 'perspective(1400px) rotateX(7deg) rotateY(-3deg) scale(0.97)',
          transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          transformStyle: 'preserve-3d',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Browser frame ── */}
        <div
          className="rounded-[20px] overflow-hidden"
          style={{
            background: 'rgba(13,10,26,0.95)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: hovered
              ? '0 60px 120px -20px rgba(124,58,237,0.35), 0 24px 48px -8px rgba(0,0,0,0.6)'
              : '0 40px 80px -20px rgba(124,58,237,0.20), 0 16px 32px -8px rgba(0,0,0,0.5)',
            transition: 'box-shadow 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <div
              className="flex-1 mx-4 px-3 py-1 rounded-md text-[10px] font-mono text-center"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
            >
              portal.bridgecapital.algolend.co.za
            </div>
          </div>

          {/* App shell */}
          <div className="grid grid-cols-[172px_1fr] min-h-[400px]">

            {/* Sidebar */}
            <div
              className="p-4 flex flex-col"
              style={{ background: 'rgba(8,5,20,0.80)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <MiniLogo size={24} />
                <span className="text-xs font-bold text-white">BridgeCapital</span>
              </div>
              {SIDEBAR_ITEMS.map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-2 px-2 py-1.5 mb-0.5 rounded-lg text-[11px] transition-colors"
                  style={{
                    background: i === 0 ? 'rgba(167,139,250,0.12)' : 'transparent',
                    color: i === 0 ? '#C4B5FD' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ background: i === 0 ? '#A78BFA' : 'rgba(255,255,255,0.15)' }}
                  />
                  {item}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="p-5 space-y-3" style={{ background: 'rgba(13,10,26,0.60)' }}>
              <div>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Good morning, Sipho</p>
                <p className="text-base font-semibold text-white">Dashboard</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-2">
                {STATS.map((s) => (
                  <div
                    key={s.l}
                    className="rounded-xl p-2.5"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{s.v}</p>
                    <p className="text-[9px] text-emerald-400 font-semibold mt-0.5">↗ {s.d}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-white/70">Disbursements — May</p>
                  <span className="text-[9px] text-emerald-400 font-semibold">↗ +18%</span>
                </div>
                <svg viewBox="0 0 280 56" className="w-full h-[56px]" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#7C3AED" stopOpacity="0.4" />
                      <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 45 L20 42 L40 38 L60 40 L80 32 L100 35 L120 25 L140 28 L160 18 L180 22 L200 15 L220 18 L240 10 L260 12 L280 6 L280 56 L0 56 Z"
                    fill="url(#hvg)"
                  />
                  <path
                    d="M0 45 L20 42 L40 38 L60 40 L80 32 L100 35 L120 25 L140 28 L160 18 L180 22 L200 15 L220 18 L240 10 L260 12 L280 6"
                    stroke="#A78BFA"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Applications table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[10px] font-semibold text-white/60">Recent applications</p>
                </div>
                {APPS.map((r) => (
                  <div
                    key={r.n}
                    className="flex items-center justify-between px-3 py-1.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-[10px] text-white/70">{r.n}</span>
                    <span className="text-[10px] text-white/35">{r.a}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${r.col}`}>{r.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Floating glass chips ── */}

        {/* Live counter — top right */}
        <div
          className="absolute -top-3 right-6 lg:right-16 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{
            background: 'rgba(13,10,26,0.90)',
            border: '1px solid rgba(167,139,250,0.30)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(124,58,237,0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ boxShadow: '0 0 6px #34d399', animation: 'pulse 2s ease-in-out infinite' }}
          />
          Live · 47 applications today
        </div>

        {/* KYC — top left */}
        <div
          className="hidden md:flex absolute top-24 -left-5 items-center gap-2 px-3 py-2 rounded-2xl text-[11px]"
          style={{
            background: 'rgba(13,10,26,0.88)',
            border: '1px solid rgba(52,211,153,0.25)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'breathe 6s ease-in-out infinite',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-white">KYC passed</p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>2s ago · Mahlangu Tech</p>
          </div>
        </div>

        {/* Credit approval — bottom left */}
        <div
          className="hidden md:flex absolute -bottom-4 left-6 items-center gap-2.5 px-3 py-2.5 rounded-2xl"
          style={{
            background: 'rgba(13,10,26,0.88)',
            border: '1px solid rgba(167,139,250,0.22)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'breathe 7s ease-in-out infinite',
            animationDelay: '-3s',
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Zap size={14} className="text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[11px] font-bold text-white">76 / 100</p>
              <span className="text-[9px] bg-emerald-400/15 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded font-bold">APPROVED</span>
            </div>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Composite credit score</p>
          </div>
        </div>

        {/* Phone mockup — bottom right */}
        <div
          className="hidden md:block absolute -bottom-12 -right-3 lg:right-8 w-[188px] rounded-[28px] overflow-hidden"
          style={{
            background: '#0a0818',
            border: '6px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.12)',
            animation: 'breathe 8s ease-in-out infinite',
            animationDelay: '-2s',
          }}
        >
          <div className="h-5 flex items-center justify-center" style={{ background: '#0a0818' }}>
            <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div className="p-3 space-y-2" style={{ background: '#0d0b1a' }}>
            <div className="flex items-center justify-between text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>9:41</span><span>● ● ●</span>
            </div>
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <MiniLogo size={16} />
              <span className="text-[10px] font-bold text-white">Borrower Portal</span>
            </div>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Welcome back, Sipho</p>
            <p className="text-[15px] font-bold tracking-tight text-white">
              R 18,500
              <span className="text-[9px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}> /balance</span>
            </p>
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.18)' }}>
              <p className="text-[9px] font-semibold text-purple-300 mb-1">Next payment</p>
              <div className="flex items-end justify-between">
                <p className="text-[12px] font-bold text-white">R 4,640</p>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>1 Jun</p>
              </div>
              <div className="h-1 mt-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(167,139,250,0.2)' }}>
                <div className="h-full rounded-full bg-purple-400" style={{ width: '65%' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div
                className="text-center text-[9px] font-semibold py-1.5 rounded-lg text-white"
                style={{ background: 'rgba(124,58,237,0.70)' }}
              >
                Pay now
              </div>
              <div
                className="text-center text-[9px] font-semibold py-1.5 rounded-lg"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)' }}
              >
                Statement
              </div>
            </div>
            <div className="flex justify-center pt-1">
              <div className="w-12 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
