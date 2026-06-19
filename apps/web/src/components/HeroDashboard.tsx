'use client';

/**
 * Raw dashboard content rendered inside ContainerScroll's dark card.
 * No perspective / 3-D wrapper here — ContainerScroll owns that.
 */

const SIDEBAR = ['Dashboard', 'Applications', 'Loan Book', 'Payments', 'Compliance', 'Reports', 'Team', 'Settings'];

const STATS = [
  { l: 'Applications', v: '47',     d: '+12%'  },
  { l: 'Approved',     v: 'R 2.4M', d: '+8.4%' },
];

const APPS = [
  { n: 'Nkosi Holdings',    a: 'R 50,000',  s: 'pending',  col: 'bg-blue-400/15 text-blue-300' },
  { n: 'Dlamini Logistics', a: 'R 120,000', s: 'review',   col: 'bg-amber-400/15 text-amber-300' },
  { n: 'Mahlangu Tech',     a: 'R 30,000',  s: 'approved', col: 'bg-emerald-400/15 text-emerald-300' },
];

function MiniLogo() {
  return (
    <svg width={20} height={20} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.10)" />
      <path d="M 6 28 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 28"
        stroke="#A78BFA" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="15" r="5.5" fill="#0F1629" />
    </svg>
  );
}

export function HeroDashboard() {
  return (
    <div className="flex h-full w-full flex-col" style={{ background: '#0d0b1a' }}>

      {/* Browser chrome */}
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-2.5"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <div
          className="flex-1 mx-4 rounded-md px-3 py-1 text-center text-[10px] font-mono"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.30)' }}
        >
          admin.algolend.co.za
        </div>
        {/* Live pill */}
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* App shell */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div
          className="hidden sm:flex w-40 shrink-0 flex-col p-3"
          style={{ background: 'rgba(8,5,20,0.80)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="mb-5 flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <MiniLogo />
            <span className="text-[11px] font-bold text-white">AlgoLend</span>
          </div>
          {SIDEBAR.map((item, i) => (
            <div
              key={item}
              className="mb-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px]"
              style={{
                background: i === 0 ? 'rgba(167,139,250,0.12)' : 'transparent',
                color: i === 0 ? '#C4B5FD' : 'rgba(255,255,255,0.32)',
              }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: i === 0 ? '#A78BFA' : 'rgba(255,255,255,0.15)' }} />
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5" style={{ background: 'rgba(13,10,26,0.60)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-mono" style={{ color: 'rgba(255,255,255,0.30)' }}>Good morning, Sipho</p>
            <p className="text-lg font-semibold text-white">Dashboard</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATS.map((s) => (
              <div
                key={s.l}
                className="rounded-xl p-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
                <p className="mt-0.5 text-sm font-bold text-white">{s.v}</p>
                <p className="mt-0.5 text-[9px] font-semibold text-emerald-400">↗ {s.d}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-white/70">Disbursements — May</p>
              <span className="text-[9px] font-semibold text-emerald-400">↗ +18%</span>
            </div>
            <svg viewBox="0 0 400 56" className="w-full h-[56px]" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hdb-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#7C3AED" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 45 L30 42 L60 38 L90 40 L120 32 L150 35 L180 25 L210 28 L240 18 L270 22 L300 15 L330 18 L360 10 L390 6 L400 4 L400 56 L0 56 Z" fill="url(#hdb-grad)" />
              <path d="M0 45 L30 42 L60 38 L90 40 L120 32 L150 35 L180 25 L210 28 L240 18 L270 22 L300 15 L330 18 L360 10 L390 6 L400 4" stroke="#A78BFA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          {/* Applications table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] font-semibold text-white/60">Recent applications</p>
              <p className="text-[9px] font-mono text-white/30">5 NEW</p>
            </div>
            {APPS.map((r) => (
              <div
                key={r.n}
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-[10px] text-white/70">{r.n}</span>
                <span className="text-[10px] text-white/35">{r.a}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${r.col}`}>{r.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
