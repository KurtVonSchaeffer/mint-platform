'use client';

import { useState, useEffect, useRef } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import Link from 'next/link';
import {
  Users, DollarSign, Zap, TrendingUp, AlertTriangle, ArrowUpRight,
  Power, ExternalLink, Activity, CheckCircle2, AlertCircle,
  ChevronRight, Server, Database, Globe, Plus, FileText,
  UserPlus, Clock, Wifi, WifiOff, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
type Tier   = 'core' | 'growth' | 'enterprise';
type Status = 'active' | 'trial' | 'suspended' | 'churned';

interface ClientRow {
  id:       string;
  name:     string;
  slug:     string;
  tier:     Tier;
  status:   Status;
  mrr:      number;
  apiCalls: number;
  quota:    number;
  users:    number;
}

interface HealthCheck { name: string; ok: boolean; detail: string }

const INITIAL_CLIENTS: ClientRow[] = [];

const tierBadge: Record<Tier, string>     = {
  core:       'badge badge-core',
  growth:     'badge badge-growth',
  enterprise: 'badge badge-enterprise',
};
const statusBadge: Record<Status, string> = {
  active:    'badge badge-active',
  trial:     'badge badge-trial',
  suspended: 'badge badge-suspended',
  churned:   'badge badge-churned',
};
const statusDot: Record<Status, string>   = {
  active:    '#34D399',
  trial:     '#60A5FA',
  suspended: '#F87171',
  churned:   '#4B5080',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Client initials — first letter of each word, max 2 */
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/** Deterministic color from slug */
const AVATAR_PALETTES = [
  ['#7C3AED', '#A78BFA'],
  ['#059669', '#6EE7B7'],
  ['#2563EB', '#93C5FD'],
  ['#D97706', '#FDE68A'],
  ['#DB2777', '#FBCFE8'],
];
function avatarGradient(slug: string) {
  const idx = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  const [a, b] = AVATAR_PALETTES[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// ─── Animated counter ─────────────────────────────────────────────────
function CountUp({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (to === 0) { setVal(0); return; }
    const start = performance.now();
    const dur   = 900;
    const tick  = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * to));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [to]);

  return <>{prefix}{val.toLocaleString('en-ZA')}{suffix}</>;
}

// ─── Sparkline bars ───────────────────────────────────────────────────
function Sparkline({ accent, rgb }: { accent: string; rgb: string }) {
  const bars = [30, 55, 40, 72, 48, 85, 62, 95, 70, 100];
  return (
    <div className="flex items-end gap-[3px] h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            height: `${h}%`,
            background: i === bars.length - 1
              ? accent
              : `rgba(${rgb}, ${0.12 + (i / bars.length) * 0.45})`,
            animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Health dot ───────────────────────────────────────────────────────
function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-60"
        style={{ background: ok ? '#34D399' : '#F87171' }}
      />
      <span
        className="relative rounded-full w-2 h-2"
        style={{ background: ok ? '#34D399' : '#F87171' }}
      />
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [clients,  setClients]  = useState<ClientRow[]>(INITIAL_CLIENTS);
  const [activity, setActivity] = useState<{ icon: typeof Users; color: string; rgb: string; text: string; time: string }[]>([]);
  const [health,   setHealth]   = useState<HealthCheck[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ kind: ToastKind; message: string } | null>(null);
  const [today,    setToday]    = useState('');
  const [killLoading, setKillLoading] = useState<string | null>(null);

  useEffect(() => { setToday(formatDate(new Date())); }, []);

  useEffect(() => {
    const loadClients = fetch('/api/clients')
      .then(r => r.json())
      .then(({ clients: raw }) => {
        if (Array.isArray(raw) && raw.length > 0) {
          setClients(raw.map((c: Record<string, unknown>) => ({
            id:       String(c.id ?? c.slug ?? ''),
            name:     String(c.name ?? ''),
            slug:     String(c.slug ?? ''),
            tier:     (c.tier as Tier) ?? 'core',
            status:   (c.status as Status) ?? 'trial',
            mrr:      Math.round(Number(c.monthly_fee_cents ?? 0) / 100),
            apiCalls: 0,
            quota:    Number(c.api_quota ?? 10000),
            users:    0,
          })));
        }
      });

    const loadLeads = fetch('/api/leads')
      .then(r => r.json())
      .then(({ leads }) => {
        if (Array.isArray(leads) && leads.length > 0) {
          setActivity(leads.slice(0, 5).map((l: Record<string, unknown>) => ({
            icon:  UserPlus,
            color: '#A78BFA',
            rgb:   '167,139,250',
            text:  `New lead: ${String(l.company ?? l.name ?? 'Unknown')}`,
            time:  timeAgo(String(l.created_at ?? '')),
          })));
        }
      })
      .catch(() => {});

    const loadHealth = fetch('/api/health')
      .then(r => r.json())
      .then(({ checks }) => { if (Array.isArray(checks)) setHealth(checks); })
      .catch(() => {});

    Promise.allSettled([loadClients, loadLeads, loadHealth]).finally(() => setLoading(false));
  }, []);

  async function toggleKill(c: ClientRow) {
    const next: Status = c.status === 'suspended' ? 'active' : 'suspended';
    setKillLoading(c.id);

    // Optimistic update
    setClients(prev => prev.map(x =>
      x.id === c.id ? { ...x, status: next } : x,
    ));

    try {
      await fetch(`/api/clients/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      setToast({
        kind:    next === 'suspended' ? 'error' : 'success',
        message: `${c.name} ${next === 'suspended' ? 'suspended' : 'reactivated'}.`,
      });
    } catch {
      // Rollback
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, status: c.status } : x));
      setToast({ kind: 'error', message: 'Status update failed. Please try again.' });
    } finally {
      setKillLoading(null);
    }
  }

  // ── Derived KPIs ──────────────────────────────────────────────────────
  const activeClients  = clients.filter(c => c.status === 'active').length;
  const trialClients   = clients.filter(c => c.status === 'trial').length;
  const suspended      = clients.filter(c => c.status === 'suspended');
  const noMrr          = clients.filter(c => c.status === 'active' && c.mrr === 0);
  const totalMRR       = clients.reduce((s, c) => s + (c.status === 'active' ? c.mrr : 0), 0);
  const mrrDisplay     = totalMRR >= 1000 ? `R ${(totalMRR / 1000).toFixed(1)}k` : `R ${totalMRR}`;

  const attentionItems = [
    ...suspended.map(c => ({
      label: `${c.name} suspended`,
      detail: 'Portal unreachable · payment overdue',
      color: '#F87171', rgb: '248,113,113',
      href: `/clients/${c.id}`,
    })),
    ...noMrr.map(c => ({
      label: `${c.name} — no MRR set`,
      detail: 'Active client with R 0 monthly fee',
      color: '#FBBF24', rgb: '251,191,36',
      href: `/clients/${c.id}`,
    })),
    ...(trialClients > 0 ? [{
      label: `${trialClients} trial client${trialClients > 1 ? 's' : ''}`,
      detail: 'Convert trials to active to start billing',
      color: '#60A5FA', rgb: '96,165,250',
      href: '/clients',
    }] : []),
  ];

  const KPI_STATS = [
    {
      label: 'Active clients',
      value: activeClients,
      display: String(activeClients),
      sub: trialClients > 0 ? `${trialClients} on trial` : 'All paid',
      icon: Users,
      accent: '#A78BFA', rgb: '167,139,250',
      href: '/clients',
    },
    {
      label: 'Monthly MRR',
      value: totalMRR,
      display: mrrDisplay,
      sub: `${fmt(totalMRR * 12)} ARR`,
      icon: DollarSign,
      accent: '#34D399', rgb: '52,211,153',
      href: '/billing',
    },
    {
      label: 'Leads pipeline',
      value: activity.length,
      display: String(activity.length),
      sub: activity.length > 0 ? 'Open enquiries' : 'Add first lead',
      icon: TrendingUp,
      accent: '#FBBF24', rgb: '251,191,36',
      href: '/leads',
    },
    {
      label: 'Deployments',
      value: clients.length,
      display: String(clients.length),
      sub: `${suspended.length} suspended`,
      icon: Zap,
      accent: '#60A5FA', rgb: '96,165,250',
      href: '/clients',
    },
  ];

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="space-y-6 page-enter">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Mint Platforms</p>
            <h1
              className="headline text-4xl font-bold tracking-tight"
              style={{ color: 'var(--color-text)' }}
            >
              Command Centre
            </h1>
            <p className="text-sm mt-1.5 flex items-center gap-2" style={{ color: 'var(--color-text3)' }}>
              {today}
              <span style={{ color: 'var(--color-border3)' }}>·</span>
              <span className="inline-flex items-center gap-1.5">
                <HealthDot ok={!loading} />
                <span>{loading ? 'Connecting…' : 'All systems monitored'}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick actions */}
            <Link
              href="/clients?new=1"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-px"
              style={{
                background: 'rgba(124,58,237,0.08)',
                color: 'var(--color-violet)',
                border: '1px solid rgba(124,58,237,0.15)',
              }}
            >
              <UserPlus size={13} /> New client
            </Link>
            <Link
              href="/invoices?new=1"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-px"
              style={{
                background: 'var(--color-faint-bg)',
                color: 'var(--color-text2)',
                border: '1px solid var(--color-border2)',
              }}
            >
              <FileText size={13} /> New invoice
            </Link>
            <Link href="/clients" className="btn-shine btn-purple inline-flex items-center gap-1.5">
              Manage clients <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* ── Attention required ──────────────────────────────────────── */}
        {attentionItems.length > 0 && (
          <div
            className="bento-card p-4"
            style={{ borderColor: 'rgba(251,191,36,0.18)', background: 'rgba(251,191,36,0.03)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} style={{ color: '#FBBF24' }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>
                Needs attention — {attentionItems.length} item{attentionItems.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {attentionItems.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className="flex items-start gap-2.5 p-3 rounded-xl transition-all hover:-translate-y-px"
                  style={{ background: `rgba(${a.rgb},0.06)`, border: `1px solid rgba(${a.rgb},0.14)` }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `rgba(${a.rgb},0.1)`, color: a.color }}
                  >
                    <AlertCircle size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{a.label}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-text3)' }}>{a.detail}</p>
                  </div>
                  <ChevronRight size={11} className="shrink-0 mt-0.5 ml-auto" style={{ color: a.color }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── ARR Hero ─────────────────────────────────────────────────── */}
        <div
          className="purple-hero bento-card p-6 relative overflow-hidden"
          style={{ borderColor: 'rgba(124,58,237,0.22)' }}
        >
          {/* Animated mesh blobs */}
          <div
            className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)',
              filter: 'blur(28px)',
              animation: 'mesh-drift 18s ease-in-out infinite',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 right-0 w-56 h-56 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
              filter: 'blur(24px)',
              animation: 'mesh-drift 22s ease-in-out infinite',
              animationDelay: '-8s',
            }}
            aria-hidden
          />

          <div className="relative space-y-5">
            {/* ARR + MRR row */}
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="eyebrow mb-2">Annual Recurring Revenue</p>
                <p
                  className="text-5xl font-bold tracking-tight"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
                >
                  {loading ? '—' : fmt(totalMRR * 12)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>Monthly run rate</p>
                <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-violet)' }}>
                  {loading ? '—' : fmt(totalMRR)} <span className="text-sm font-normal opacity-60">/ mo</span>
                </p>
                {clients.length > 0 && (
                  <p className="text-[11px]" style={{ color: 'var(--color-text3)' }}>
                    across {clients.length} deployment{clients.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Revenue breakdown bars */}
            {clients.filter(c => c.mrr > 0).length > 0 ? (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text3)' }}>
                  Revenue by client
                </p>
                <div className="space-y-2">
                  {clients
                    .filter(c => c.status !== 'churned' && c.mrr > 0)
                    .sort((a, b) => b.mrr - a.mrr)
                    .slice(0, 5)
                    .map((c, i) => {
                      const pct = totalMRR > 0 ? Math.round((c.mrr / totalMRR) * 100) : 0;
                      return (
                        <Link
                          key={c.slug}
                          href={`/clients/${c.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{ background: avatarGradient(c.slug), color: 'white' }}
                          >
                            {initials(c.name)}
                          </div>
                          <span
                            className="text-[11px] w-28 truncate shrink-0 group-hover:text-[var(--color-violet)] transition-colors"
                            style={{ color: 'var(--color-text2)' }}
                          >
                            {c.name}
                          </span>
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(124,58,237,0.1)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                                animation: `progress-fill 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both`,
                              }}
                            />
                          </div>
                          <span
                            className="text-[11px] font-mono w-16 text-right shrink-0"
                            style={{ color: 'var(--color-text3)' }}
                          >
                            {fmt(c.mrr)}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ) : !loading && (
              <div className="flex items-center gap-3 py-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.1)' }}
                >
                  <DollarSign size={14} style={{ color: 'var(--color-violet)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No revenue yet</p>
                  <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                    Add clients and set their monthly fee to track MRR here.{' '}
                    <Link href="/clients" style={{ color: 'var(--color-violet)' }}>Add first client →</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_STATS.map((s, i) => (
            <Link
              key={s.label}
              href={s.href}
              className="bento-card p-5 group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 block"
              style={{
                animation: `fade-up 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
                cursor: 'pointer',
              }}
            >
              {/* Accent bottom strip */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`,
                  opacity: 0.5,
                }}
                aria-hidden
              />
              {/* Corner glow */}
              <div
                className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle, rgba(${s.rgb},0.2) 0%, transparent 70%)`,
                  filter: 'blur(12px)',
                  opacity: 0.6,
                }}
                aria-hidden
              />

              {/* Icon + external link hint */}
              <div className="relative flex items-center justify-between mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{
                    background: `rgba(${s.rgb},0.1)`,
                    color: s.accent,
                    border: `1px solid rgba(${s.rgb},0.15)`,
                  }}
                >
                  <s.icon size={16} />
                </div>
                <ChevronRight
                  size={13}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-x-1 group-hover:translate-x-0"
                  style={{ color: s.accent }}
                />
              </div>

              <p
                className="relative text-3xl font-bold tracking-tight mb-0.5"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
              >
                {loading ? <span className="inline-block w-12 h-7 rounded-lg animate-pulse" style={{ background: 'var(--color-surface2)' }} /> : s.display}
              </p>
              <p className="relative text-[11px] mb-3" style={{ color: 'var(--color-text3)' }}>{s.label}</p>

              <div className="relative opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                <Sparkline accent={s.accent} rgb={s.rgb} />
              </div>

              <p
                className="relative text-[11px] mt-2 font-semibold"
                style={{ color: s.accent, fontFamily: 'var(--font-mono)' }}
              >
                {s.sub}
              </p>
            </Link>
          ))}
        </div>

        {/* ── Activity + System health ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Recent activity */}
          <div className="lg:col-span-3 bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Recent Activity</p>
              <Link
                href="/leads"
                className="text-xs font-semibold transition-colors"
                style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}
              >
                View leads →
              </Link>
            </div>

            {loading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'var(--color-surface2)', flexShrink: 0 }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--color-surface2)', width: '65%' }} />
                      <div className="h-2.5 rounded animate-pulse" style={{ background: 'var(--color-surface3)', width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && activity.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(124,58,237,0.08)' }}
                >
                  <Activity size={20} style={{ color: 'var(--color-violet)' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>No activity yet</p>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text3)' }}>New leads and events will appear here</p>
                <Link
                  href="/leads"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)' }}
                >
                  Go to leads →
                </Link>
              </div>
            )}

            {!loading && activity.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-default"
                style={{
                  borderBottom: i < activity.length - 1 ? '1px solid var(--color-row-border)' : 'none',
                  animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
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
                  className="text-[11px] shrink-0 flex items-center gap-1"
                  style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}
                >
                  <Clock size={10} />
                  {a.time}
                </span>
              </div>
            ))}
          </div>

          {/* System health + quick links */}
          <div className="lg:col-span-2 bento-card p-5 flex flex-col gap-5">
            {/* Health */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">System Health</p>
                <button
                  onClick={() => fetch('/api/health').then(r => r.json()).then(({ checks }) => setHealth(checks ?? []))}
                  className="p-1.5 rounded-lg transition-all hover:rotate-180 duration-300"
                  style={{ color: 'var(--color-text3)' }}
                  title="Refresh"
                >
                  <RefreshCw size={11} />
                </button>
              </div>
              <div className="space-y-2.5">
                {health.length === 0 && loading && [...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg animate-pulse shrink-0" style={{ background: 'var(--color-surface2)' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--color-surface2)', width: '55%' }} />
                      <div className="h-2.5 rounded animate-pulse" style={{ background: 'var(--color-surface3)', width: '40%' }} />
                    </div>
                  </div>
                ))}

                {health.map((s, i) => {
                  const color  = s.ok ? '#34D399' : '#F87171';
                  const rgb    = s.ok ? '52,211,153' : '248,113,113';
                  const Icon   = s.ok ? CheckCircle2 : AlertCircle;
                  const WIcon  = s.ok ? Wifi : WifiOff;
                  return (
                    <div
                      key={s.name}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                      style={{
                        animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                        background: s.ok ? 'transparent' : `rgba(${rgb},0.04)`,
                        border: `1px solid ${s.ok ? 'transparent' : `rgba(${rgb},0.12)`}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `rgba(${rgb},0.1)`, color }}
                      >
                        <WIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--color-text3)' }}>{s.detail}</p>
                      </div>
                      <Icon size={14} style={{ color }} className="shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ borderTop: '1px solid var(--color-border2)' }} className="pt-4">
              <p className="eyebrow mb-3">Quick links</p>
              <div className="space-y-0.5">
                {[
                  { label: 'Feature flags', href: '/features',    icon: Zap },
                  { label: 'API usage',     href: '/usage',       icon: Activity },
                  { label: 'Invoices',      href: '/invoices',    icon: FileText },
                  { label: 'Marketplace',   href: '/marketplace', icon: Globe },
                ].map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-sm transition-all group"
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
                    <l.icon size={13} className="shrink-0 opacity-60 group-hover:opacity-100" />
                    <span className="flex-1">{l.label}</span>
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-violet)' }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Client table ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow mb-1.5">All deployments</p>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                {loading ? '—' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
              </h2>
            </div>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}
            >
              Manage all <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="bento-card overflow-hidden p-0">
            {/* Gradient header line */}
            <div
              className="h-px w-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(167,139,250,0.35), transparent)' }}
            />

            <table className="data-table">
              <thead>
                <tr>
                  {['Client', 'Tier', 'Status', 'MRR', 'Portal', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((__, j) => (
                      <td key={j}>
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--color-surface2)', width: j === 0 ? '70%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {!loading && clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2">
                        <Users size={24} style={{ color: 'var(--color-text3)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No clients yet</p>
                        <Link href="/clients?new=1" style={{ color: 'var(--color-violet)', fontSize: 12, fontWeight: 600 }}>
                          + Add first client
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}

                {clients.map((c, i) => (
                  <tr
                    key={c.id || c.slug}
                    style={{ animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${280 + i * 50}ms both` }}
                  >
                    {/* Client name + avatar */}
                    <td>
                      <Link href={`/clients/${c.id || c.slug}`} className="flex items-center gap-2.5 group">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 text-white transition-transform duration-200 group-hover:scale-105"
                          style={{ background: avatarGradient(c.slug) }}
                        >
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold truncate transition-colors group-hover:text-[var(--color-violet)]"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {c.name}
                          </p>
                          <p className="text-[10px] truncate font-mono" style={{ color: 'var(--color-text3)' }}>
                            {c.slug}.algolend.co.za
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td><span className={tierBadge[c.tier]}>{c.tier}</span></td>

                    <td>
                      <span className={`${statusBadge[c.status]} inline-flex items-center gap-1.5`}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: statusDot[c.status],
                            boxShadow: c.status === 'active' ? `0 0 4px ${statusDot[c.status]}` : 'none',
                          }}
                        />
                        {c.status}
                      </span>
                    </td>

                    <td>
                      {c.mrr > 0
                        ? <span className="font-semibold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(c.mrr)}</span>
                        : <span style={{ color: 'var(--color-text3)' }}>—</span>}
                    </td>

                    {/* Portal link */}
                    <td>
                      <a
                        href={`https://${c.slug}.algolend.co.za`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:-translate-y-px"
                        style={{
                          background: 'rgba(124,58,237,0.06)',
                          color: 'var(--color-violet)',
                          border: '1px solid rgba(124,58,237,0.12)',
                        }}
                      >
                        <ExternalLink size={10} /> Open portal
                      </a>
                    </td>

                    {/* Suspend / Reactivate */}
                    <td>
                      <button
                        onClick={() => toggleKill(c)}
                        disabled={killLoading === c.id}
                        title={c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:-translate-y-px disabled:opacity-50"
                        style={c.status === 'suspended' ? {
                          background: 'rgba(52,211,153,0.08)',
                          color: '#34D399',
                          border: '1px solid rgba(52,211,153,0.15)',
                        } : {
                          background: 'rgba(248,113,113,0.08)',
                          color: '#F87171',
                          border: '1px solid rgba(248,113,113,0.15)',
                        }}
                      >
                        {killLoading === c.id ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <Power size={11} />
                        )}
                        {c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </Shell>
  );
}
