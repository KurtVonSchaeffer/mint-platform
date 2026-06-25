'use client';

import { useEffect, useState } from 'react';
import { Warp } from '@paper-design/shaders-react';
import {
  Cpu, ShieldCheck, Landmark, FileSignature, BarChart3, Globe, Check, Heart,
} from 'lucide-react';

/* ─── Per-card shader configs ────────────────────────────────────────── */
const CARD_CONFIGS = {
  creditEngine: {
    colors: ['hsl(0,0%,97%)', 'hsl(275,100%,45%)', 'hsl(0,0%,78%)', 'hsl(255,100%,65%)'],
    proportion: 0.38, softness: 1.0, distortion: 0.18, swirl: 0.7,
    swirlIterations: 10, shape: 'checks' as const, shapeScale: 0.09, speed: 0.6,
  },
  kyc: {
    colors: ['hsl(0,0%,96%)', 'hsl(145,100%,38%)', 'hsl(0,0%,80%)', 'hsl(140,100%,60%)'],
    proportion: 0.35, softness: 1.1, distortion: 0.16, swirl: 0.8,
    swirlIterations: 8, shape: 'stripes' as const, shapeScale: 0.11, speed: 0.7,
  },
  openBanking: {
    colors: ['hsl(0,0%,97%)', 'hsl(195,100%,42%)', 'hsl(0,0%,76%)', 'hsl(190,100%,62%)'],
    proportion: 0.40, softness: 0.9, distortion: 0.20, swirl: 0.65,
    swirlIterations: 12, shape: 'checks' as const, shapeScale: 0.10, speed: 0.55,
  },
  eContracts: {
    colors: ['hsl(0,0%,97%)', 'hsl(42,100%,50%)', 'hsl(0,0%,79%)', 'hsl(48,100%,68%)'],
    proportion: 0.36, softness: 1.0, distortion: 0.17, swirl: 0.75,
    swirlIterations: 9, shape: 'edge' as const, shapeScale: 0.12, speed: 0.65,
  },
  portfolio: {
    colors: ['hsl(0,0%,96%)', 'hsl(215,100%,48%)', 'hsl(0,0%,77%)', 'hsl(210,100%,65%)'],
    proportion: 0.42, softness: 0.95, distortion: 0.19, swirl: 0.85,
    swirlIterations: 11, shape: 'checks' as const, shapeScale: 0.08, speed: 0.6,
  },
  portal: {
    colors: ['hsl(0,0%,97%)', 'hsl(345,100%,52%)', 'hsl(0,0%,80%)', 'hsl(350,100%,68%)'],
    proportion: 0.37, softness: 1.05, distortion: 0.15, swirl: 0.9,
    swirlIterations: 10, shape: 'stripes' as const, shapeScale: 0.13, speed: 0.7,
  },
  creditLife: {
    colors: ['hsl(0,0%,97%)', 'hsl(175,85%,40%)', 'hsl(0,0%,78%)', 'hsl(168,90%,58%)'],
    proportion: 0.39, softness: 1.0, distortion: 0.17, swirl: 0.8,
    swirlIterations: 10, shape: 'stripes' as const, shapeScale: 0.11, speed: 0.65,
  },
} as const;

/* ─── Warp backdrop ──────────────────────────────────────────────────── */
function WarpBg({ cfg }: { cfg: typeof CARD_CONFIGS[keyof typeof CARD_CONFIGS] }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  return (
    <div className="absolute inset-0 rounded-[24px] overflow-hidden" aria-hidden>
      {/* Skip WebGL shader on mobile — GPU cost not worth it on small screens */}
      {!isMobile && (
        <Warp
          style={{ width: '100%', height: '100%' }}
          colors={[...cfg.colors]}
          proportion={cfg.proportion}
          softness={cfg.softness}
          distortion={cfg.distortion}
          swirl={cfg.swirl}
          swirlIterations={cfg.swirlIterations}
          shape={cfg.shape}
          shapeScale={cfg.shapeScale}
          scale={1}
          rotation={0}
          speed={cfg.speed}
        />
      )}
      {isMobile && <div className="absolute inset-0 bg-[#1a1a2e]" />}
      {/* Dark overlay so text is legible */}
      <div className="absolute inset-0 bg-black/65" />
    </div>
  );
}

/* ─── Cards ─────────────────────────────────────────────────────────── */

export function CreditEngineCard() {
  return (
    <div className="relative h-full min-h-[480px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.creditEngine} />
      <div className="relative z-10 p-8 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-purple-500/25 transition-all">
            <Cpu size={17} className="text-purple-300" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-purple-300">Credit engine</span>
        </div>

        <h3 className="text-3xl font-semibold mb-3 tracking-tight text-white leading-tight">
          A credit engine that<br />thinks like your<br />underwriters.
        </h3>
        <p className="text-white/60 mb-8 max-w-md text-sm leading-relaxed">
          Custom scorecards, rule-based decisioning, automated approvals, and risk-based pricing — configured to your exact credit policy.
        </p>

        {/* Scorecard visual */}
        <div className="mt-auto bg-white/8 rounded-2xl p-5 border border-white/15 backdrop-blur-sm group-hover:bg-white/12 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-white/80">Application APP-2026-014</p>
            <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded font-bold">APPROVED</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { l: 'Affordability', v: 89, c: '#34d399' },
              { l: 'Credit bureau', v: 74, c: '#a78bfa' },
              { l: 'Bank flow',     v: 81, c: '#60a5fa' },
              { l: 'Industry risk', v: 62, c: '#fbbf24' },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-white/50">{m.l}</span>
                  <span className="text-[10px] font-bold text-white/90">{m.v}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.v}%`, background: m.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-white/45">Composite score</span>
            <span className="text-xl font-bold text-white">76 / 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KycCard() {
  return (
    <div className="relative h-full min-h-[220px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.kyc} />
      <div className="relative z-10 p-7 h-full flex flex-col">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-5 group-hover:bg-emerald-500/25 group-hover:scale-105 transition-all">
          <ShieldCheck size={17} className="text-emerald-300" />
        </div>
        <h3 className="text-xl font-semibold mb-2 tracking-tight text-white">KYC, AML & sanctions</h3>
        <p className="text-sm text-white/55 mb-6 leading-relaxed">
          Director identity, biometric liveness, PEP, and sanctions screening — embedded in the application flow.
        </p>
        <div className="mt-auto space-y-1.5">
          {['Director ID verified', 'AML clear', 'PEP screened', 'CIPC confirmed'].map((c) => (
            <div key={c} className="flex items-center gap-2 text-xs text-white/60">
              <Check size={12} className="text-emerald-400 shrink-0" />
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OpenBankingCard() {
  return (
    <div className="relative h-full min-h-[220px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.openBanking} />
      <div className="relative z-10 p-7 h-full flex flex-col">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-5 group-hover:bg-cyan-500/25 group-hover:scale-105 transition-all">
          <Landmark size={17} className="text-cyan-300" />
        </div>
        <h3 className="text-xl font-semibold mb-2 tracking-tight text-white">Open banking, via TruID</h3>
        <p className="text-sm text-white/55 mb-6 leading-relaxed">
          Real-time bank statement retrieval and twelve months of cash-flow intelligence from 25+ SA banks.
        </p>
        <div className="mt-auto bg-white/8 border border-white/15 rounded-xl p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/40">Avg monthly inflows</span>
            <span className="text-[10px] text-emerald-300 font-semibold">↗ 12%</span>
          </div>
          <p className="text-lg font-bold text-white">R 142,800</p>
        </div>
      </div>
    </div>
  );
}

export function EContractsCard() {
  return (
    <div className="relative h-full min-h-[220px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.eContracts} />
      <div className="relative z-10 p-7 h-full flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-5 group-hover:bg-amber-500/25 group-hover:scale-105 transition-all">
            <FileSignature size={17} className="text-amber-300" />
          </div>
          <h3 className="text-xl font-semibold mb-2 tracking-tight text-white">E-contracts</h3>
          <p className="text-sm text-white/55 leading-relaxed">
            Automated agreement generation, secure digital signing, certificates of completion — all inside the portal.
          </p>
        </div>
        <div className="bg-white/8 border border-white/15 rounded-2xl p-4 w-full md:w-56 shrink-0 backdrop-blur-sm group-hover:rotate-1 transition-transform duration-500">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-white/40">Loan Agreement</span>
            <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded font-bold">SIGNED</span>
          </div>
          <div className="space-y-1 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-1.5 bg-white/15 rounded" style={{ width: `${85 - i * 8}%` }} />
            ))}
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-[9px] text-white/35">Signed by</p>
            <p className="text-sm font-semibold italic text-white/80" style={{ fontFamily: 'Brush Script MT, cursive' }}>S. Nkosi</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortfolioCard() {
  const bars = [38, 52, 44, 61, 55, 70, 63, 74, 68, 82, 71, 88, 79, 92, 84, 95, 89, 97];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

  return (
    <div className="relative h-full min-h-[200px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.portfolio} />
      <div className="relative z-10 p-7 h-full flex flex-col md:flex-row gap-8 items-center">

        {/* Left: copy */}
        <div className="md:w-72 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-5 group-hover:bg-blue-500/25 group-hover:scale-105 transition-all">
            <BarChart3 size={17} className="text-blue-300" />
          </div>
          <h3 className="text-xl font-semibold mb-2 tracking-tight text-white">Portfolio & arrears analytics</h3>
          <p className="text-sm text-white/55 leading-relaxed">
            Live loan book, arrears monitoring, collections workflow, vintage and cohort analysis.
          </p>
          {/* KPI pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { label: 'Active loans', value: '1,284' },
              { label: 'Arrears rate', value: '3.1%' },
              { label: 'Avg. yield', value: '22.4%' },
            ].map((k) => (
              <div key={k.label} className="bg-white/8 border border-white/15 rounded-xl px-3 py-2 backdrop-blur-sm">
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">{k.label}</p>
                <p className="text-sm font-bold text-white">{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chart */}
        <div className="flex-1 bg-white/8 border border-white/15 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Disbursements — rolling 18 weeks</p>
            <span className="text-[10px] text-emerald-300 font-semibold">↗ +34% YTD</span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, #3b82f6, #a5b4fc)`,
                  opacity: 0.7 + i * 0.016,
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[9px] text-white/30 mt-1.5">
            {months.map((m) => <span key={m}>{m}</span>)}
          </div>
        </div>

      </div>
    </div>
  );
}

export function CreditLifeCard() {
  return (
    <div className="relative h-full min-h-[220px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.creditLife} />
      <div className="relative z-10 p-7 h-full flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-teal-500/25 group-hover:scale-105 transition-all">
            <Heart size={17} className="text-teal-300" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
            FSCA Approved
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-semibold tracking-tight text-white">Credit life insurance</h3>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/15">Sanlam</span>
        </div>
        <p className="text-sm text-white/55 mb-2 leading-relaxed">
          Embedded cover protecting your loan book — and your borrowers — against death, disability, and retrenchment.
        </p>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-400/15 text-teal-300 border border-teal-400/25 mb-4">
          R4.50 per R1,000 insured
        </div>
        <div className="mt-auto space-y-2">
          {[
            { label: 'Death',               detail: 'Outstanding balance settled' },
            { label: 'Disability',          detail: 'Payments waived for term'    },
            { label: 'Unemployment benefit', detail: 'Income protection cover'    },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/8 border border-white/12 backdrop-blur-sm">
              <Check size={11} className="text-teal-400 shrink-0" />
              <span className="text-xs font-semibold text-white/80">{r.label}</span>
              <span className="text-[10px] text-white/40 ml-auto">{r.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PortalCard() {
  return (
    <div className="relative h-full min-h-[220px] rounded-[24px] overflow-hidden group">
      <WarpBg cfg={CARD_CONFIGS.portal} />
      <div className="relative z-10 p-7 h-full flex flex-col">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-5 group-hover:bg-pink-500/25 group-hover:scale-105 transition-all">
          <Globe size={17} className="text-pink-300" />
        </div>
        <h3 className="text-xl font-semibold mb-2 tracking-tight text-white">White-label portal</h3>
        <p className="text-sm text-white/55 mb-6 leading-relaxed">
          Your logo, your colours, your domain. Zero AlgoLend branding visible to your borrowers.
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {['Logo', 'Colours', 'Domain', 'Email', 'Forms'].map((t) => (
            <span key={t} className="text-[10px] px-2 py-1 rounded bg-white/10 border border-white/15 text-white/60 font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
