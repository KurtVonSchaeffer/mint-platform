'use client';

import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import Link from 'next/link';
import {
  Users, DollarSign, Zap, TrendingUp, AlertTriangle, ArrowUpRight,
  Power, ExternalLink, Activity, CheckCircle2, AlertCircle,
  ChevronRight, Server, Database, Globe,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
type Tier   = 'core' | 'growth' | 'enterprise';
type Status = 'active' | 'trial' | 'suspended' | 'churned';

interface ClientRow {
  name:     string;
  slug:     string;
  tier:     Tier;
  status:   Status;
  mrr:      number;
  apiCalls: number;
  quota:    number;
  users:    number;
}

// ─── Static data ──────────────────────────────────────────────────────
const INITIAL_CLIENTS: ClientRow[] = [
  { name: 'BridgeCapital Finance',  slug: 'bridgecap', tier: 'enterprise', status: 'active',    mrr: 45000, apiCalls: 41200, quota: 50000, users: 38 },
  { name: 'Apex Credit Solutions',  slug: 'apex',      tier: 'growth',     status: 'active',    mrr: 22000, apiCalls: 18420, quota: 25000, users: 14 },
  { name: 'Nexus Business Finance', slug: 'nexus',     tier: 'growth',     status: 'active',    mrr: 22000, apiCalls: 19800, quota: 25000, users: 11 },
  { name: 'Elevate Capital',        slug: 'elevate',   tier: 'growth',     status: 'suspended', mrr: 0,     apiCalls: 0,     quota: 25000, users: 0  },
  { name: 'Summit Lending',         slug: 'summit',    tier: 'core',       status: 'trial',     mrr: 8000,  apiCalls: 2100,  quota: 5000,  users: 4  },
];

const MRR_TREND  = [112000, 128000, 135000, 148000, 162000, 184000];
const MRR_LABELS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
const ARR_VALUE  = 184000 * 12;

const ACTIVITY = [
  { icon: Users,         color: '#A78BFA', rgb: '167,139,250', text: 'Summit Lending went live on portal',  time: '2h ago' },
  { icon: AlertTriangle, color: '#FBBF24', rgb: '251,191,36',  text: 'Elevate Capital kill switch triggered', time: '5h ago' },
  { icon: DollarSign,    color: '#34D399', rgb: '52,211,153',  text: 'Invoice INV-0041 paid — R 22,000',    time: '1d ago' },
  { icon: Zap,           color: '#60A5FA', rgb: '96,165,250',  text: 'BridgeCapital >80% API quota',        time: '1d ago' },
  { icon: Users,         color: '#A78BFA', rgb: '167,139,250', text: 'New lead: Prosper Microfinance',      time: '2d ago' },
];

const SYSTEM_HEALTH = [
  { name: 'Supabase',    status: 'ok',   detail: '14ms avg query',  icon: Database },
  { name: 'Vercel Edge', status: 'ok',   detail: '99.98% uptime',   icon: Globe    },
  { name: 'SureSystems', status: 'warn', detail: 'UAT API — 503',   icon: Server   },
  { name: 'Experian',    status: 'err',  detail: 'No credentials',  icon: Server   },
] as const;

const KPI_STATS = [
  { label: 'Active clients',  value: '12',      sub: '+2 this month',        icon: Users,      accent: '#A78BFA', rgb: '167,139,250', trend: '+19%' },
  { label: 'Monthly MRR',     value: 'R 184k',  sub: '+R 24k vs last month', icon: DollarSign, accent: '#34D399', rgb: '52,211,153',  trend: '+15%' },
  { label: 'API calls (May)', value: '142,830', sub: '↑ 18% month on month', icon: Zap,        accent: '#60A5FA', rgb: '96,165,250',  trend: '+18%' },
  { label: 'Pipeline MRR',    value: 'R 96k',   sub: '5 leads in negotiation',icon: TrendingUp,accent: '#FBBF24', rgb: '251,191,36',  trend: '+3'   },
];

const tierBadge: Record<Tier, string>     = { core: 'badge badge-core', growth: 'badge badge-growth', enterprise: 'badge badge-enterprise' };
const statusBadge: Record<Status, string> = { active: 'badge badge-active', trial: 'badge badge-trial', suspended: 'badge badge-suspended', churned: 'badge badge-churned' };
const statusDot: Record<Status, string>   = { active: '#34D399', trial: '#60A5FA', suspended: '#F87171', churned: '#4B5080' };

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

// ─── SVG smooth area chart ────────────────────────────────────────────
function AreaChart({ data, color, gradId }: { data: number[]; color: string; gradId: string }) {
  const W = 400, H = 80;
  const max = Math.max(...data);
  const min = Math.min(...data) * 0.92;
  const rng = max - min;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / rng) * H * 0.85 - H * 0.05,
  }));
  const line = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C${cx},${prev.y.toFixed(1)} ${cx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, '');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line}  fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="5.5" fill={color} fillOpacity="0.18" />
      <circle cx={last.x} cy={last.y} r="3"   fill={color} />
    </svg>
  );
}

// ─── Bar sparkline ────────────────────────────────────────────────────
function Sparkline({ accent, rgb }: { accent: string; rgb: string }) {
  const bars = [40, 65, 45, 80, 55, 90, 70, 100, 75, 88];
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-sm"
          style={{
            height: `${h}%`,
            background: i === bars.length - 1
              ? accent
              : `rgba(${rgb},${0.14 + (i / bars.length) * 0.42})`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [clients, setClients] = useState<ClientRow[]>(INITIAL_CLIENTS);
  const [toast, setToast]     = useState<{ kind: ToastKind; message: string } | null>(null);

  function toggleKill(c: ClientRow) {
    const next: Status = c.status === 'suspended' ? 'active' : 'suspended';
    setClients(prev => prev.map(x =>
      x.slug === c.slug ? { ...x, status: next, mrr: next === 'suspended' ? 0 : (x.mrr || 22000) } : x,
    ));
    setToast({
      kind:    next === 'suspended' ? 'error' : 'success',
      message: `${c.name} ${next === 'suspended' ? 'suspended' : 'reactivated'} — Vercel project update queued.`,
    });
  }

  const suspended = clients.filter(c => c.status === 'suspended');

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="space-y-6 page-enter">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Mint Platforms</p>
            <h1 className="headline text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
              Command Centre
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Friday, 29 May 2026 · All deployments monitored
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{
                background: 'rgba(52,211,153,0.07)',
                border: '1px solid rgba(52,211,153,0.15)',
                color: '#34D399',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Activity size={12} />
              Live · 14ms
            </div>
            <Link href="/clients" className="btn-shine btn-purple inline-flex items-center gap-1.5">
              Manage clients <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* ── ARR Hero ────────────────────────────────────────────── */}
        <div
          className="purple-hero bento-card p-6 relative overflow-hidden"
          style={{ borderColor: 'rgba(124,58,237,0.22)' }}
        >
          {/* BG glow */}
          <div
            className="absolute -top-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)', filter: 'blur(28px)' }}
            aria-hidden
          />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* ARR number */}
            <div className="md:col-span-1">
              <p className="eyebrow mb-3">Annual Recurring Revenue</p>
              <p
                className="text-5xl font-bold tracking-tight stat-value"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
              >
                {fmt(ARR_VALUE)}
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(52,211,153,0.1)',
                    color: '#34D399',
                    border: '1px solid rgba(52,211,153,0.2)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ↗ +42% YoY
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text3)' }}>vs R 1.56M last year</span>
              </div>
            </div>

            {/* MRR trend area chart */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text3)' }}>
                  MRR — Dec 2025 → May 2026
                </p>
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: 'var(--color-violet)' }}
                >
                  {fmt(184000)} / mo
                </span>
              </div>
              <AreaChart data={MRR_TREND} color="#7C3AED" gradId="arrGrad" />
              <div className="flex justify-between mt-2">
                {MRR_LABELS.map(l => (
                  <span
                    key={l}
                    className="text-[10px]"
                    style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI stat cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_STATS.map((s, i) => (
            <div
              key={s.label}
              className="bento-card p-5 group cursor-default relative overflow-hidden"
              style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${i * 70}ms` }}
            >
              {/* Accent bottom strip */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`, opacity: 0.5 }}
                aria-hidden
              />
              {/* Corner glow */}
              <div
                className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full"
                style={{ background: `radial-gradient(circle, rgba(${s.rgb},0.18) 0%, transparent 70%)`, filter: 'blur(10px)' }}
                aria-hidden
              />

              {/* Top row */}
              <div className="relative flex items-center justify-between mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${s.rgb},0.1)`, color: s.accent, border: `1px solid rgba(${s.rgb},0.15)` }}
                >
                  <s.icon size={16} />
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `rgba(${s.rgb},0.1)`, color: s.accent, fontFamily: 'var(--font-mono)' }}
                >
                  {s.trend}
                </span>
              </div>

              <p
                className="relative stat-value text-3xl font-bold tracking-tight mb-0.5"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)', animationDelay: `${i * 70 + 200}ms` }}
              >
                {s.value}
              </p>
              <p className="relative text-[11px] mb-3" style={{ color: 'var(--color-text3)' }}>{s.label}</p>

              <div className="relative opacity-70 group-hover:opacity-100 transition-opacity">
                <Sparkline accent={s.accent} rgb={s.rgb} />
              </div>

              <p
                className="relative text-[11px] mt-2 font-semibold"
                style={{ color: s.accent, fontFamily: 'var(--font-mono)' }}
              >
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Activity + System health ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Recent activity */}
          <div className="lg:col-span-3 bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Recent Activity</p>
              <Link
                href="/clients"
                className="text-xs font-semibold transition-colors"
                style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
              >
                View all →
              </Link>
            </div>
            <div>
              {ACTIVITY.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors cursor-default"
                  style={{ borderBottom: i < ACTIVITY.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${a.rgb},0.1)`, color: a.color }}
                  >
                    <a.icon size={14} />
                  </div>
                  <p className="flex-1 text-sm" style={{ color: 'var(--color-text2)' }}>{a.text}</p>
                  <span
                    className="text-[11px] shrink-0"
                    style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}
                  >
                    {a.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System health + quick links */}
          <div className="lg:col-span-2 bento-card p-5 flex flex-col gap-5">
            <div>
              <p className="eyebrow mb-4">System Health</p>
              <div className="space-y-3">
                {SYSTEM_HEALTH.map(s => {
                  const color   = s.status === 'ok' ? '#34D399' : s.status === 'warn' ? '#FBBF24' : '#F87171';
                  const rgb     = s.status === 'ok' ? '52,211,153' : s.status === 'warn' ? '251,191,36' : '248,113,113';
                  const Icon    = s.status === 'ok' ? CheckCircle2 : s.status === 'warn' ? AlertTriangle : AlertCircle;
                  return (
                    <div key={s.name} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `rgba(${rgb},0.08)`, color }}
                      >
                        <s.icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text3)' }}>{s.detail}</p>
                      </div>
                      <Icon size={14} style={{ color }} className="shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border2)' }} className="pt-4">
              <p className="eyebrow mb-3">Quick links</p>
              <div className="space-y-1">
                {[
                  { label: 'Feature flags', href: '/features' },
                  { label: 'API usage',     href: '/usage'    },
                  { label: 'Invoices',      href: '/invoices' },
                ].map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center justify-between py-2 px-3 rounded-xl text-sm transition-all"
                    style={{ color: 'var(--color-text2)' }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'rgba(124,58,237,0.06)';
                      el.style.color      = 'var(--color-violet)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'transparent';
                      el.style.color      = 'var(--color-text2)';
                    }}
                  >
                    {l.label}
                    <ChevronRight size={13} style={{ color: 'var(--color-text3)' }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Suspended alert ──────────────────────────────────────── */}
        {suspended.length > 0 && (
          <div
            className="bento-card flex items-center gap-4 p-5"
            style={{ background: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.2)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}
            >
              <AlertTriangle size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: '#F87171' }}>
                {suspended.length} client{suspended.length === 1 ? '' : 's'} suspended
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text2)' }}>
                {suspended.map(c => c.name).join(' · ')} — portal{suspended.length === 1 ? '' : 's'} unreachable.
              </p>
            </div>
            <Link
              href="/clients"
              className="text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
              style={{ color: '#F87171' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FCA5A5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#F87171'; }}
            >
              Manage →
            </Link>
          </div>
        )}

        {/* ── Client table ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow mb-1.5">All clients</p>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                {clients.length} deployments
              </h2>
            </div>
            <Link
              href="/clients"
              className="text-xs font-semibold transition-colors"
              style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            >
              View all →
            </Link>
          </div>

          <div className="bento-card overflow-hidden p-0">
            {/* Table header glow */}
            <div
              className="h-px w-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), rgba(167,139,250,0.3), transparent)' }}
            />

            <table className="data-table">
              <thead>
                <tr>
                  {['Client', 'Tier', 'Status', 'MRR', 'API Usage', 'Users', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => {
                  const pct      = c.quota > 0 ? Math.round((c.apiCalls / c.quota) * 100) : 0;
                  const barColor = pct >= 80 ? '#F87171' : pct >= 60 ? '#FBBF24' : '#34D399';
                  return (
                    <tr
                      key={c.slug}
                      style={{ animation: 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${280 + i * 50}ms` }}
                    >
                      <td>
                        <Link
                          href="/clients"
                          className="font-semibold transition-colors"
                          style={{ color: 'var(--color-text)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td><span className={tierBadge[c.tier]}>{c.tier}</span></td>
                      <td>
                        <span className={`${statusBadge[c.status]} inline-flex items-center gap-1.5`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot[c.status] }} />
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.mrr > 0
                          ? <span className="font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{fmt(c.mrr)}</span>
                          : <span style={{ color: 'var(--color-text3)' }}>—</span>}
                      </td>
                      {/* API usage with progress bar */}
                      <td>
                        {c.apiCalls > 0 ? (
                          <div style={{ minWidth: '90px' }}>
                            <div
                              className="flex justify-between mb-1"
                              style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                            >
                              <span style={{ color: 'var(--color-text3)' }}>{c.apiCalls.toLocaleString()}</span>
                              <span style={{ color: barColor }}>{pct}%</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: barColor,
                                  boxShadow: `0 0 6px ${barColor}`,
                                  transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                                }}
                              />
                            </div>
                          </div>
                        ) : <span style={{ color: 'var(--color-text3)' }}>—</span>}
                      </td>
                      <td>
                        {c.users > 0
                          ? <span style={{ color: 'var(--color-text2)' }}>{c.users}</span>
                          : <span style={{ color: 'var(--color-text3)' }}>—</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 justify-end">
                          <a
                            href={`https://${c.slug}.algolend.co.za`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open portal"
                            className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                            style={{ color: 'var(--color-text3)' }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.color      = 'var(--color-violet)';
                              el.style.background = 'rgba(124,58,237,0.08)';
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.color      = 'var(--color-text3)';
                              el.style.background = 'transparent';
                            }}
                          >
                            <ExternalLink size={13} />
                          </a>
                          <button
                            onClick={() => toggleKill(c)}
                            title={c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer"
                            style={c.status === 'suspended' ? {
                              background: 'rgba(52,211,153,0.08)',
                              color: '#34D399',
                              border: '1px solid rgba(52,211,153,0.15)',
                            } : {
                              background: 'rgba(248,113,113,0.08)',
                              color: '#F87171',
                              border: '1px solid rgba(248,113,113,0.15)',
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.transform  = 'translateY(-1px)';
                              el.style.boxShadow  = c.status === 'suspended'
                                ? '0 4px 12px rgba(52,211,153,0.2)'
                                : '0 4px 12px rgba(248,113,113,0.2)';
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.transform = '';
                              el.style.boxShadow = '';
                            }}
                          >
                            <Power size={11} />
                            {c.status === 'suspended' ? 'Reactivate' : 'Kill'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </Shell>
  );
}
