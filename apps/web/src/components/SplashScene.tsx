'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

const WORDMARK = 'AlgoLend';

const STATS = [
  { label: 'AVG GO-LIVE',  value: '4-8 wks', detail: 'from kick-off' },
  { label: 'UPTIME SLA',   value: '99.9%',   detail: 'platform guarantee' },
  { label: 'CREDIT CYCLE', value: '< 48hr',  detail: 'avg decision time' },
];

interface Particle {
  id: number;
  left: string;
  size: number;
  delay: number;
  duration: number;
  dx: number;
  dy: number;
  color: string;
}

function generateParticles(count: number): Particle[] {
  const colors = ['#A78BFA', '#C4B5FD', '#FFFFFF', '#6EE7B7'];
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 6,
    dx: (Math.random() - 0.5) * 200,
    dy: -(Math.random() * 600 + 300),
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function SplashScene() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const [particles] = useState(() => generateParticles(40));
  const rafRef = useRef<number | null>(null);

  // Mouse-following parallax on the mesh blobs
  const blobARef = useRef<HTMLDivElement>(null);
  const blobBRef = useRef<HTMLDivElement>(null);
  const blobCRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = (e.clientX - cx) / cx;  // -1 .. 1
      const ny = (e.clientY - cy) / cy;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (blobARef.current) blobARef.current.style.transform = `translate(${nx * 30}px, ${ny * 30}px)`;
        if (blobBRef.current) blobBRef.current.style.transform = `translate(${nx * -40}px, ${ny * -20}px)`;
        if (blobCRef.current) blobCRef.current.style.transform = `translate(${nx * 20}px, ${ny * -40}px)`;
      });
    };

    window.addEventListener('mousemove', handler, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handler);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleEnter() {
    if (exiting) return;
    // Set the seen-intro cookie so the middleware lets subsequent visits through.
    // 90-day expiry, lax samesite for safety with redirects.
    document.cookie = `algolend_seen_intro=1; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
    setExiting(true);
    window.setTimeout(() => router.push('/'), 750);
  }

  // Skip on key press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        handleEnter();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting]);

  return (
    <div className={`fixed inset-0 z-50 bg-[#0A0B0F] text-white overflow-hidden ${exiting ? 'splash-exiting' : ''}`}>

      {/* ── Mesh gradient backdrop ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          ref={blobARef}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'mesh-drift 18s ease-in-out infinite',
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <div
          ref={blobBRef}
          className="absolute top-1/2 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'mesh-drift 22s ease-in-out infinite',
            animationDelay: '-7s',
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <div
          ref={blobCRef}
          className="absolute bottom-1/4 left-1/2 w-[450px] h-[450px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'mesh-drift 26s ease-in-out infinite',
            animationDelay: '-12s',
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* ── Grid overlay ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
        aria-hidden
      />

      {/* ── Scanline sweep ─────────────────────────────────────────── */}
      <div
        className="scanline absolute inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)' }}
        aria-hidden
      />

      {/* ── Particles ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle absolute bottom-0 rounded-full"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              ['--dx' as string]: `${p.dx}px`,
              ['--dy' as string]: `${p.dy}px`,
              ['--delay' as string]: `${p.delay}s`,
              ['--dur' as string]: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* ── Top bar — skip ──────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <span
          className="text-xs font-mono uppercase tracking-[0.22em] text-white/40"
          style={{ animation: 'fade-in 1s ease-out 0.2s both' }}
        >
          MINT PLATFORMS / INTRO
        </span>
        <button
          onClick={handleEnter}
          className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 hover:text-white transition-colors flex items-center gap-2"
          style={{ animation: 'fade-in 1s ease-out 0.2s both' }}
        >
          Skip
          <ArrowRight size={11} />
        </button>
      </header>

      {/* ── Side stats column (left) ───────────────────────────────── */}
      <aside
        className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 flex-col gap-4 z-10"
        style={{ animation: 'fade-in 1.2s ease-out 3.4s both' }}
      >
        {STATS.map((s) => (
          <div key={s.label} className="border-l-2 border-white/15 pl-4 hover:border-[#A78BFA] transition-colors">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
            <p className="text-[11px] text-white/50">{s.detail}</p>
          </div>
        ))}
      </aside>

      {/* ── Right edge — system status ─────────────────────────────── */}
      <aside
        className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 z-10"
        style={{ animation: 'fade-in 1.2s ease-out 3.4s both' }}
      >
        <div className="border-r-2 border-white/15 pr-4 text-right">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 mb-2">SYSTEM STATUS</p>
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-sm font-semibold">Operational</span>
            <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-400">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
            </span>
          </div>
          <p className="text-[11px] text-white/50">All services healthy</p>
        </div>
      </aside>

      {/* ── Center stage ────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 -mt-12">

        {/* Logo with stroke draw */}
        <div
          className="mb-10"
          style={{ animation: 'fade-in 0.6s ease-out 0.2s both' }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-label="AlgoLend">
            <defs>
              <linearGradient id="splash-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#C4B5FD" />
                <stop offset="0.5" stopColor="#A78BFA" />
                <stop offset="1" stopColor="#6D28D9" />
              </linearGradient>
              <filter id="splash-glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Subtle outer ring */}
            <circle
              cx="60" cy="60" r="58"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              fill="none"
              style={{ animation: 'pulse-dot 3s ease-in-out infinite' }}
            />

            {/* Animated arch — proper brand gateway shape: vertical legs + half-round top */}
            <path
              className="logo-draw-path"
              pathLength={1}
              d="M 22 112 L 22 52 C 22 31 39 14 60 14 C 81 14 98 31 98 52 L 98 112"
              stroke="url(#splash-gradient)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              filter="url(#splash-glow)"
            />

            {/* Nested dark circle */}
            <circle
              cx="60" cy="58" r="20"
              fill="#0F1629"
              style={{ animation: 'scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.8s both' }}
            />
            <circle
              cx="60" cy="58" r="22"
              stroke="#A78BFA"
              strokeWidth="0.5"
              fill="none"
              opacity="0.35"
              style={{ animation: 'pulse-dot 2.4s ease-in-out 2.4s infinite' }}
            />
          </svg>
        </div>

        {/* Eyebrow */}
        <p
          className="text-xs font-mono uppercase tracking-[0.32em] text-white/50 mb-6"
          style={{ animation: 'fade-in 0.8s ease-out 2.6s both' }}
        >
          A product by Mint Platforms
        </p>

        {/* Wordmark — letter by letter */}
        <h1 className="text-center mb-8" aria-label={WORDMARK}>
          <span className="block text-[clamp(4rem,12vw,8.5rem)] font-semibold headline tracking-[-0.04em]">
            {WORDMARK.split('').map((char, i) => (
              <span
                key={i}
                className="letter"
                style={{ animationDelay: `${1.4 + i * 0.07}s` }}
              >
                {char}
              </span>
            ))}
          </span>
        </h1>

        {/* Tagline with animated underline */}
        <div className="text-center max-w-2xl mb-12 relative">
          <p
            className="text-lg md:text-xl text-white/65 leading-relaxed mb-2"
            style={{ animation: 'fade-in 0.9s ease-out 2.4s both' }}
          >
            The lending platform for{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-white font-medium">corporate credit providers</span>
              <span className="tagline-underline absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#A78BFA]" />
            </span>
            .
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleEnter}
          className="btn-shine cta-pulse group inline-flex items-center gap-3 bg-white text-[#0A0B0F] font-semibold text-[15px] px-7 py-4 rounded-full transition-all hover:-translate-y-0.5"
          style={{ animation: 'fade-in 1s ease-out 3.6s both' }}
        >
          <Sparkles size={15} className="transition-transform group-hover:rotate-12" />
          Enter the platform
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>

        {/* Subtle hint */}
        <p
          className="mt-8 text-[11px] font-mono uppercase tracking-[0.18em] text-white/30"
          style={{ animation: 'fade-in 1s ease-out 4s both' }}
        >
          Press <kbd className="border border-white/20 px-1.5 py-0.5 rounded text-[10px] mx-0.5">↵</kbd> or click anywhere
        </p>
      </main>

      {/* ── Bottom ticker ──────────────────────────────────────────── */}
      <footer
        className="relative z-10 absolute bottom-0 inset-x-0 px-8 py-5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-white/30"
        style={{ animation: 'fade-in 1s ease-out 3.8s both' }}
      >
        <div className="flex items-center gap-4">
          <span>JNB · 24 MAY 2026</span>
          <span className="h-3 w-px bg-white/20" />
          <span className="flex items-center gap-1.5">
            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </span>
            LIVE
          </span>
        </div>
        <span>VER 1.0 · MINT PLATFORMS</span>
      </footer>
    </div>
  );
}
