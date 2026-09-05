'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import Link from 'next/link';
import { TERMINAL_STATUSES } from '@/lib/lead-distribution';
import {
  Users, DollarSign, Server, TrendingUp, AlertTriangle,
  Power, ExternalLink, Activity, CheckCircle2, AlertCircle,
  ChevronRight, Globe, FileText, UserPlus, Clock, Wifi, WifiOff,
  RefreshCw, ArrowUpRight, ArrowDownRight, CircleDot, ToggleLeft,
  MousePointerClick, Share2, PenLine, Phone, Trophy,
} from 'lucide-react';

type Tier   = 'core' | 'growth' | 'enterprise';
type Status = 'active' | 'trial' | 'suspended' | 'churned';

interface SourceStat {
  source: string;
  label: string;
  count: number;
  won: number;
  convRate: number;
}

interface ClientRow {
  id: string; name: string; slug: string;
  tier: Tier; status: Status;
  mrr: number;
}
interface HealthCheck { name: string; ok: boolean; detail: string }

const tierBadge: Record<Tier, string>   = { core: 'badge badge-core', growth: 'badge badge-growth', enterprise: 'badge badge-enterprise' };
const statusBadge: Record<Status, string> = { active: 'badge badge-active', trial: 'badge badge-trial', suspended: 'badge badge-suspended', churned: 'badge badge-churned' };
const statusDot: Record<Status, string> = { active: '#34D399', trial: '#60A5FA', suspended: '#F87171', churned: '#4B5080' };

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}
function fmtK(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `R ${(n / 1_000).toFixed(0)}k`;
  return `R ${n}`;
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
function initials(name: string) { return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

const PALETTES = [['#7C3AED','#A78BFA'],['#059669','#6EE7B7'],['#2563EB','#93C5FD'],['#D97706','#FDE68A'],['#DB2777','#FBCFE8']];
function avatarGrad(slug: string) {
  const [a, b] = PALETTES[slug.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// ── Sparkline SVG ────────────────────────────────────────────────────
function Sparkline({ color, trend }: { color: string; trend: 'up' | 'down' | 'flat' }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 200); return () => clearTimeout(t); }, []);

  // Seven fake historical data points per trend direction
  const pts: Record<string, number[]> = {
    up:   [30, 38, 28, 45, 40, 55, 70],
    down: [70, 62, 68, 50, 55, 42, 30],
    flat: [45, 50, 42, 55, 48, 52, 50],
  };
  const raw   = pts[trend];
  const W = 72, H = 28;
  const min   = Math.min(...raw), max = Math.max(...raw);
  const range = max - min || 1;
  const points = raw.map((v, i) => {
    const x = (i / (raw.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  });
  const d = `M ${points.join(' L ')}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${trend}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path d={`${d} L ${W},${H} L 0,${H} Z`} fill={`url(#sg-${trend})`} />
      {/* Line */}
      <path
        d={d}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: drawn ? 0 : 200,
          transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      {/* End dot */}
      {drawn && (
        <circle
          cx={W}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r={2.5}
          fill={color}
          opacity={0.9}
        />
      )}
    </svg>
  );
}

// ── Animated count-up ────────────────────────────────────────────────
function CountUp({ to }: { to: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (to === 0) { setVal(0); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 900, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [to]);
  return <>{val.toLocaleString('en-ZA')}</>;
}


// ── Revenue bar chart ────────────────────────────────────────────────
function RevenueChart({ clients, totalMRR, loading }: { clients: ClientRow[]; totalMRR: number; loading: boolean }) {
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [cursorX,  setCursorX]  = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data   = clients.filter(c => c.status !== 'churned' && c.mrr > 0).sort((a, b) => b.mrr - a.mrr).slice(0, 6);
  const maxMrr = data.length > 0 ? Math.max(...data.map(c => c.mrr)) : 1;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setCursorX(e.clientX - rect.left);
  }

  if (loading) return (
    <div className="flex items-end gap-2 h-28 pt-4">
      {[60, 90, 45, 75, 55, 80].map((h, i) => (
        <div key={i} className="flex-1 rounded-t animate-pulse" style={{ height: `${h}%`, background: 'var(--color-surface2)' }} />
      ))}
    </div>
  );

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
      <DollarSign size={20} style={{ color: 'var(--color-text3)', opacity: 0.4 }} />
      <p className="text-xs" style={{ color: 'var(--color-text3)' }}>No revenue data yet</p>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative flex items-end gap-2 h-28 px-1"
      onMouseMove={onMove}
      onMouseLeave={() => { setHovered(null); setCursorX(null); }}
    >

      {/* Cursor tracking gradient line */}
      {cursorX !== null && (
        <div
          className="absolute top-0 bottom-6 w-px pointer-events-none z-10"
          style={{
            left: cursorX,
            background: 'linear-gradient(180deg, transparent, rgba(167,139,250,0.4) 30%, rgba(124,58,237,0.6) 60%, transparent)',
          }}
          aria-hidden
        />
      )}

      {data.map((c) => {
        const heightPct = Math.max((c.mrr / maxMrr) * 100, 6);
        const ratio     = c.mrr / maxMrr;
        const isHov     = hovered === c.id;
        const [gradTop] = PALETTES[c.slug.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % PALETTES.length];
        return (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="relative flex-1 flex flex-col items-center gap-1.5"
            onMouseEnter={() => setHovered(c.id)}
          >
            {/* Tooltip */}
            {isHov && (
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-xl px-3 py-2 pointer-events-none"
                style={{
                  background: 'var(--color-surface2)',
                  border: '1px solid var(--color-border2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  animation: 'fade-up 0.15s ease both',
                }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-violet)' }}>{fmt(c.mrr)}/mo</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
                  {totalMRR > 0 ? Math.round((c.mrr / totalMRR) * 100) : 0}% of MRR
                </p>
              </div>
            )}

            {/* Gradient bar */}
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{
                height: `${heightPct}%`,
                background: isHov
                  ? `linear-gradient(to top, rgba(124,58,237,0.08), ${gradTop}cc)`
                  : `linear-gradient(to top, rgba(124,58,237,0.04), rgba(124,58,237,${0.22 + ratio * 0.52}))`,
                boxShadow: isHov ? `0 0 16px -2px ${gradTop}66` : 'none',
                minHeight: 4,
              }}
            />

            {/* Avatar label */}
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold shrink-0 text-white transition-transform duration-200"
              style={{ background: avatarGrad(c.slug), transform: isHov ? 'scale(1.15)' : 'scale(1)' }}
            >
              {initials(c.name)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Health dot ────────────────────────────────────────────────────────
function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative inline-flex w-2 h-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: ok ? '#34D399' : '#F87171', opacity: 0.5 }} />
      <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: ok ? '#34D399' : '#F87171' }} />
    </span>
  );
}

// ── Source Analytics card ─────────────────────────────────────────────
const SOURCE_META: Record<string, { icon: typeof MousePointerClick; color: string; rgb: string }> = {
  'marketing-site': { icon: MousePointerClick, color: '#A78BFA', rgb: '167,139,250' },
  referral:         { icon: Share2,            color: '#34D399', rgb: '52,211,153'  },
  manual:           { icon: PenLine,           color: '#60A5FA', rgb: '96,165,250'  },
};
const SOURCE_ORDER = ['marketing-site', 'referral', 'manual'];

function SourceAnalytics({ sources, total, loading }: { sources: SourceStat[]; total: number; loading: boolean }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const maxCount = sources.length > 0 ? Math.max(...sources.map(s => s.count)) : 1;

  // Ensure all three known sources appear, even if 0 leads
  const rows = SOURCE_ORDER.map(src => {
    const found = sources.find(s => s.source === src);
    return found ?? { source: src, label: src === 'marketing-site' ? 'algolend.co.za' : src === 'referral' ? 'Referral' : 'Manual Entry', count: 0, won: 0, convRate: 0 };
  });

  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>Lead Sources</h2>
          {!loading && total > 0 && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
              {total.toLocaleString('en-ZA')} total lead{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link href="/leads" className="text-[10px] font-semibold" style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}>
          View all leads →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rows.map((s, i) => {
          const meta  = SOURCE_META[s.source] ?? { icon: Activity, color: '#A78BFA', rgb: '167,139,250' };
          const Icon  = meta.icon;
          const barW  = maxCount > 0 ? Math.max((s.count / maxCount) * 100, s.count > 0 ? 4 : 0) : 0;
          const isHov = hovered === s.source;

          return (
            <Link
              key={s.source}
              href={`/leads?source=${s.source}`}
              className="block rounded-xl p-4 transition-all duration-200 cursor-pointer"
              style={{
                background: isHov ? `rgba(${meta.rgb},0.07)` : 'var(--color-surface2)',
                border: `1px solid ${isHov ? `rgba(${meta.rgb},0.25)` : 'var(--color-border2)'}`,
                animation: `fade-up 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both`,
                transform: isHov ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHov ? `0 6px 24px -4px rgba(${meta.rgb},0.2)` : 'none',
              }}
              onMouseEnter={() => setHovered(s.source)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Icon + label row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `rgba(${meta.rgb},0.12)`, color: meta.color }}>
                  <Icon size={13} />
                </div>
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text2)' }}>{s.label}</span>
              </div>

              {/* Volume bar */}
              <div className="mb-3">
                {loading ? (
                  <div className="h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-surface3)', width: '60%' }} />
                ) : (
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-fill-subtle)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barW}%`,
                        background: `linear-gradient(90deg, rgba(${meta.rgb},0.5), ${meta.color})`,
                        boxShadow: barW > 0 ? `0 0 8px rgba(${meta.rgb},0.4)` : 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-end justify-between gap-2">
                {loading ? (
                  <div className="h-7 w-10 rounded animate-pulse" style={{ background: 'var(--color-surface3)' }} />
                ) : (
                  <p className="text-2xl font-bold font-mono leading-none" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                    {s.count.toLocaleString('en-ZA')}
                  </p>
                )}
                <div className="text-right">
                  {loading ? (
                    <div className="h-3.5 w-14 rounded animate-pulse" style={{ background: 'var(--color-surface3)' }} />
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold font-mono" style={{ color: meta.color }}>
                        {s.convRate}% conv.
                      </p>
                      {s.won > 0 && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
                          {s.won} won
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [clients,     setClients]     = useState<ClientRow[]>([]);
  const [activity,    setActivity]    = useState<{ icon: typeof Users; color: string; rgb: string; text: string; time: string }[]>([]);
  const [sources,     setSources]     = useState<SourceStat[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [health,      setHealth]      = useState<HealthCheck[]>([]);
  const [openLeadsCount,   setOpenLeadsCount]   = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [overdueFollowUps, setOverdueFollowUps] = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [toast,       setToast]       = useState<{ kind: ToastKind; message: string; duration?: number } | null>(null);
  const [killLoading, setKillLoading] = useState<string | null>(null);
  const [hoveredPerf, setHoveredPerf] = useState<number | null>(null);

  // Static-ish data — client roster, system health, source mix. Fetched once;
  // these don't change minute-to-minute the way sales activity does.
  useEffect(() => {
    Promise.allSettled([
      fetch('/api/clients').then(r => r.json()).then(({ clients: raw }) => {
        if (Array.isArray(raw) && raw.length > 0)
          setClients(raw.map((c: Record<string, unknown>) => ({
            id: String(c.id ?? c.slug ?? ''), name: String(c.name ?? ''), slug: String(c.slug ?? ''),
            tier: (c.tier as Tier) ?? 'core', status: (c.status as Status) ?? 'trial',
            mrr: Math.round(Number(c.monthly_fee_cents ?? 0) / 100),
          })));
      }),
      fetch('/api/health').then(r => r.json()).then(({ checks }) => { if (Array.isArray(checks)) setHealth(checks); }).catch(() => {}),
      fetch('/api/admin/source-analytics').then(r => r.json()).then(({ sources: s, total }) => {
        if (Array.isArray(s)) { setSources(s); setSourceTotal(Number(total ?? 0)); }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Real activity feed — merges new leads, calls made, and deals won into one
  // timeline instead of just "new lead" events, and refreshes on an interval
  // (previously fetched once on mount and never updated). Endpoints below 401
  // for roles outside their access list (e.g. support) — that's fine, those
  // event types and the attention chips they feed just don't show.
  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const [leadsRes, teamRes, commRes, apprRes] = await Promise.allSettled([
        fetch('/api/leads').then(r => r.json()),
        fetch('/api/admin/team').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/commissions').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/approvals').then(r => r.ok ? r.json() : null),
      ]);

      const events: { icon: typeof Users; color: string; rgb: string; text: string; ts: number }[] = [];

      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value?.leads)) {
        const leads = leadsRes.value.leads as Record<string, unknown>[];
        setOpenLeadsCount(leads.filter(l => !TERMINAL_STATUSES.includes(String(l.tm_status ?? ''))).length);
        leads.slice(0, 5).forEach(l => {
          events.push({
            icon: UserPlus, color: '#A78BFA', rgb: '167,139,250',
            text: `New lead: ${String(l.company ?? l.name ?? 'Unknown')}`,
            ts: new Date(String(l.created_at ?? 0)).getTime(),
          });
        });

        // Website leads are auto-assigned instantly on submission and need
        // prioritizing — notify here the moment one arrives. Watermarked in
        // localStorage (per-browser) rather than a DB flag, so this alerts
        // whoever has the dashboard open, not a specific "seen" state shared
        // across staff.
        const websiteLeads = leads.filter(l => l.source === 'marketing-site');
        if (websiteLeads.length > 0) {
          const newest = Math.max(...websiteLeads.map(l => new Date(String(l.created_at ?? 0)).getTime()));
          const stored = localStorage.getItem('lastSeenWebsiteLeadAt');
          if (stored === null) {
            localStorage.setItem('lastSeenWebsiteLeadAt', String(newest));
          } else {
            const lastSeen = Number(stored);
            const newOnes = websiteLeads.filter(l => new Date(String(l.created_at ?? 0)).getTime() > lastSeen);
            if (newOnes.length > 0) {
              setToast({
                kind: 'info',
                message: `🌐 ${newOnes.length} new website lead${newOnes.length > 1 ? 's' : ''} — prioritize on My Leads`,
                duration: 10000,
              });
              localStorage.setItem('lastSeenWebsiteLeadAt', String(newest));
            }
          }
        }
      }

      if (teamRes.status === 'fulfilled' && teamRes.value) {
        const agents: { id: string; name: string; overdueFollowUps?: number }[] = teamRes.value.agents ?? [];
        setOverdueFollowUps(agents.reduce((s, a) => s + (a.overdueFollowUps ?? 0), 0));
        const names: Record<string, string> = {};
        agents.forEach(a => { names[a.id] = a.name; });
        const calls: { agent_id: string; outcome: string; called_at: string; leads: { name: string } | null }[] =
          teamRes.value.recentActivity ?? [];
        calls.slice(0, 5).forEach(c => {
          events.push({
            icon: Phone, color: '#60A5FA', rgb: '96,165,250',
            text: `${names[c.agent_id] ?? 'Agent'} called ${c.leads?.name ?? 'a lead'} — ${c.outcome}`,
            ts: new Date(c.called_at).getTime(),
          });
        });
      }

      if (commRes.status === 'fulfilled' && Array.isArray(commRes.value?.commissions)) {
        const wins: { client_name: string; commission_amount: number; created_at: string; agentName?: string }[] =
          commRes.value.commissions;
        wins.slice(0, 5).forEach(w => {
          events.push({
            icon: Trophy, color: '#34D399', rgb: '52,211,153',
            text: `${w.agentName ?? 'Agent'} won ${w.client_name} — R ${w.commission_amount.toLocaleString('en-ZA')}`,
            ts: new Date(w.created_at).getTime(),
          });
        });
      }

      if (apprRes.status === 'fulfilled' && Array.isArray(apprRes.value?.approvals)) {
        setPendingApprovals(apprRes.value.approvals.length);
      }

      events.sort((a, b) => b.ts - a.ts);
      setActivity(events.slice(0, 6).map(e => ({ ...e, time: timeAgo(new Date(e.ts).toISOString()) })));
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 60_000);
    return () => clearInterval(interval);
  }, [loadActivity]);

  async function toggleKill(c: ClientRow) {
    const next: Status = c.status === 'suspended' ? 'active' : 'suspended';
    if (next === 'suspended' && !window.confirm(`Suspend ${c.name}?\n\nTheir portal will become unreachable until reactivated.`)) return;
    setKillLoading(c.id);
    setClients(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
    try {
      await fetch(`/api/clients/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      setToast({ kind: next === 'suspended' ? 'error' : 'success', message: `${c.name} ${next === 'suspended' ? 'suspended' : 'reactivated'}.` });
    } catch {
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, status: c.status } : x));
      setToast({ kind: 'error', message: 'Status update failed.' });
    } finally { setKillLoading(null); }
  }

  // ── Derived ──────────────────────────────────────────────────────────
  const activeClients = clients.filter(c => c.status === 'active').length;
  const trialClients  = clients.filter(c => c.status === 'trial');
  const suspended     = clients.filter(c => c.status === 'suspended');
  const noMrr         = clients.filter(c => c.status === 'active' && c.mrr === 0);
  const totalMRR      = clients.reduce((s, c) => s + (c.status === 'active' ? c.mrr : 0), 0);
  const totalARR      = totalMRR * 12;

  const attentionItems = [
    ...suspended.map(c => ({ label: `${c.name} suspended`, color: '#F87171', rgb: '248,113,113', href: `/clients/${c.id}` })),
    ...noMrr.map(c => ({ label: `${c.name} (no MRR)`, color: '#FBBF24', rgb: '251,191,36', href: `/clients/${c.id}` })),
    ...(pendingApprovals > 0 ? [{
      label: `${pendingApprovals} quote${pendingApprovals > 1 ? 's' : ''} awaiting approval`,
      color: '#FBBF24', rgb: '251,191,36', href: '/approvals',
    }] : []),
    ...(overdueFollowUps > 0 ? [{
      label: `${overdueFollowUps} overdue follow-up${overdueFollowUps > 1 ? 's' : ''}`,
      color: '#F87171', rgb: '248,113,113', href: '/telemarketer/team',
    }] : []),
  ];

  const PERF = [
    { label: 'Active clients', value: activeClients, display: String(activeClients), sub: trialClients.length > 0 ? `+${trialClients.length} trial` : 'All paid', accent: '#A78BFA', rgb: '167,139,250', icon: Users, href: '/clients', trend: 'up' },
    { label: 'Monthly MRR', value: totalMRR, display: fmtK(totalMRR), sub: fmtK(totalARR) + ' ARR', accent: '#34D399', rgb: '52,211,153', icon: DollarSign, href: '/billing', trend: totalMRR > 0 ? 'up' : 'flat' },
    { label: 'Leads', value: openLeadsCount, display: String(openLeadsCount), sub: 'Open enquiries', accent: '#FBBF24', rgb: '251,191,36', icon: TrendingUp, href: '/leads', trend: openLeadsCount > 0 ? 'up' : 'flat' },
    { label: 'Deployments', value: clients.length, display: String(clients.length), sub: suspended.length > 0 ? `${suspended.length} suspended` : 'All operational', accent: '#60A5FA', rgb: '96,165,250', icon: Server, href: '/clients', trend: suspended.length > 0 ? 'down' : 'flat' },
  ] as const;

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} duration={toast.duration} onClose={() => setToast(null)} />}

      <div className="space-y-5 page-enter">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
              Overview
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
              MINT Platforms — AlgoLend admin console
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 shrink-0 px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--color-border2)', background: 'var(--color-surface2)' }}>
            <HealthDot ok={!loading} />
            <span className="text-xs font-medium" style={{ color: loading ? 'var(--color-text3)' : 'var(--color-text2)' }}>
              {loading ? 'Connecting…' : 'All systems operational'}
            </span>
          </div>
        </div>

        {/* ── Trial conversion CTA ─────────────────────────────────────── */}
        {!loading && trialClients.length > 0 && (
          <div
            className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(167,139,250,0.06) 100%)',
              border: '1px solid rgba(124,58,237,0.28)',
              boxShadow: '0 0 30px rgba(124,58,237,0.08)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <CircleDot size={16} style={{ color: 'var(--color-violet)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {trialClients.length} trial client{trialClients.length > 1 ? 's' : ''} ready to convert
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                  Convert to active to start billing and unlock full features
                </p>
              </div>
            </div>
            <Link
              href="/clients"
              className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-2 !px-4 shrink-0"
            >
              Convert {trialClients.length > 1 ? `${trialClients.length} trial clients` : '1 trial client'}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {/* ── Attention chips ──────────────────────────────────────────── */}
        {attentionItems.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} style={{ color: '#FBBF24' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>Needs attention</span>
            </div>
            {attentionItems.map((a, i) => (
              <Link key={i} href={a.href}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:-translate-y-px"
                style={{ background: `rgba(${a.rgb},0.1)`, color: a.color, border: `1px solid rgba(${a.rgb},0.2)` }}>
                <AlertCircle size={10} />
                {a.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── ARR hero + Revenue chart ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-4">

          {/* ARR/MRR numbers — 3/5 */}
          <div className="lg:col-span-3 purple-hero bento-card p-6 relative overflow-hidden">
            {/* Mesh drift blobs */}
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full" aria-hidden
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%)', filter: 'blur(24px)', animation: 'mesh-drift 8s ease-in-out infinite' }} />
            <div className="pointer-events-none absolute bottom-0 -left-8 w-36 h-36 rounded-full" aria-hidden
              style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.14) 0%, transparent 65%)', filter: 'blur(20px)', animation: 'mesh-drift 11s ease-in-out infinite reverse' }} />
            <div className="relative">
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>Annual Recurring Revenue</p>
              <div className="relative inline-block">
                {/* ARR aura — breathes behind the number */}
                <div className="absolute inset-0 pointer-events-none rounded-xl" aria-hidden
                  style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,58,237,0.22) 0%, transparent 70%)', animation: 'arr-aura 4s ease-in-out infinite', filter: 'blur(12px)' }} />
              </div>
              <p className="font-bold tracking-tight leading-none"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
                {loading
                  ? <span className="inline-block h-10 w-44 rounded-xl animate-pulse" style={{ background: 'rgba(124,58,237,0.15)' }} />
                  : totalARR === 0 ? '' : fmtK(totalARR)}
              </p>

              {!loading && totalARR > 0 && (
                <div className="flex items-center gap-1.5 mt-2 mb-5">
                  <ArrowUpRight size={13} style={{ color: '#34D399' }} />
                  <span className="text-xs font-semibold" style={{ color: '#34D399' }}>
                    {fmtK(totalMRR)} / mo
                  </span>
                  <span style={{ color: 'var(--color-border3)', fontSize: 11 }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--color-text3)' }}>
                    {clients.length} deployment{clients.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {!loading && totalARR === 0 && (
                <p className="text-xs mt-2 mb-5" style={{ color: 'var(--color-text3)' }}>
                  Add clients with a monthly fee to start tracking.{' '}
                  <Link href="/clients?new=1" style={{ color: 'var(--color-violet)' }}>Add first client →</Link>
                </p>
              )}

              {/* MRR + avg/client row */}
              <div className="flex items-center gap-6 pt-4" style={{ borderTop: '1px solid rgba(124,58,237,0.15)' }}>
                <div>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>MRR</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-violet)' }}>
                    {loading ? '' : fmtK(totalMRR)}
                  </p>
                </div>
                {activeClients > 1 && (
                  <div>
                    <p className="text-[10px] font-medium mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>Avg / client</p>
                    <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text)' }}>
                      {fmtK(Math.round(totalMRR / activeClients))}
                    </p>
                  </div>
                )}
                {!loading && totalMRR > 0 && (
                  <div className="ml-auto">
                    <p className="text-[10px] font-medium mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>ARR</p>
                    <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-text2)' }}>
                      {fmt(totalARR)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue bar chart — 2/5 */}
          <div className="lg:col-span-2 bento-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text3)' }}>Revenue by client</p>
              <Link href="/billing" className="text-[10px] font-semibold" style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}>
                Full report →
              </Link>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <RevenueChart clients={clients} totalMRR={totalMRR} loading={loading} />
            </div>
          </div>
        </div>

        {/* ── Performance strip ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PERF.map((s, i) => (
            <Link
              key={s.label}
              href={s.href}
              onMouseEnter={() => setHoveredPerf(i)}
              onMouseLeave={() => setHoveredPerf(null)}
              className="bento-card p-5 group block"
              style={{
                animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                transform: hoveredPerf === i ? 'translateY(-3px)' : 'translateY(0)',
                boxShadow: hoveredPerf === i
                  ? `0 8px 32px -4px rgba(${s.rgb},0.28), 0 0 0 1px rgba(${s.rgb},0.16)`
                  : undefined,
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.25s ease',
                borderLeft: `3px solid rgba(${s.rgb},0.7)`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                {s.trend === 'up'   && <ArrowUpRight   size={12} style={{ color: '#34D399', opacity: 0.8, flexShrink: 0 }} />}
                {s.trend === 'down' && <ArrowDownRight size={12} style={{ color: '#F87171', opacity: 0.8, flexShrink: 0 }} />}
              </div>

              <p className="text-3xl font-bold tracking-tight tabular-nums mb-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                {loading ? <span className="inline-block w-12 h-8 rounded animate-pulse" style={{ background: 'var(--color-surface2)' }} /> : s.display}
              </p>

              <div className="flex items-end justify-between gap-2">
                <p className="text-xs font-medium" style={{ color: s.accent }}>{s.sub}</p>
                {!loading && <Sparkline color={s.accent} trend={s.trend} />}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Source Analytics ─────────────────────────────────────────── */}
        <SourceAnalytics sources={sources} total={sourceTotal} loading={loading} />

        {/* ── Activity + System health ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>Recent Activity</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadActivity}
                  disabled={activityLoading}
                  title="Refresh — auto-updates every minute"
                  className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{ color: 'var(--color-text3)' }}>
                  <RefreshCw size={11} className={activityLoading ? 'animate-spin' : ''} />
                </button>
                <Link href="/leads" className="text-xs" style={{ color: 'var(--color-violet)' }}>View leads →</Link>
              </div>
            </div>
            {activityLoading && activity.length === 0 && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg animate-pulse shrink-0" style={{ background: 'var(--color-surface2)' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--color-surface2)', width: '65%' }} />
                      <div className="h-2.5 rounded animate-pulse" style={{ background: 'var(--color-surface3)', width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!activityLoading && activity.length === 0 && (
              <p className="py-3 text-sm" style={{ color: 'var(--color-text3)' }}>
                No recent activity.{' '}
                <Link href="/leads?new=1" className="font-semibold" style={{ color: 'var(--color-violet)' }}>Add first lead →</Link>
              </p>
            )}
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200"
                style={{ borderBottom: i < activity.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgba(${a.rgb},0.1)`, color: a.color }}>
                  <a.icon size={14} />
                </div>
                <p className="flex-1 text-sm" style={{ color: 'var(--color-text2)' }}>{a.text}</p>
                <span className="text-[11px] shrink-0 flex items-center gap-1" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>
                  <Clock size={10} />{a.time}
                </span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 bento-card p-5 flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>System Health</h2>
                <button onClick={() => fetch('/api/health').then(r => r.json()).then(({ checks }) => setHealth(checks ?? []))}
                  className="p-1.5 rounded-lg transition-all hover:rotate-180 duration-300" style={{ color: 'var(--color-text3)' }} title="Refresh">
                  <RefreshCw size={11} />
                </button>
              </div>
              <div className="space-y-2">
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
                  const color = s.ok ? '#34D399' : '#F87171';
                  const rgb   = s.ok ? '52,211,153' : '248,113,113';
                  return (
                    <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`, background: s.ok ? 'transparent' : `rgba(${rgb},0.04)`, border: `1px solid ${s.ok ? 'transparent' : `rgba(${rgb},0.12)`}` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgba(${rgb},0.1)`, color }}>
                        {s.ok ? <Wifi size={14} /> : <WifiOff size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--color-text3)' }}>{s.detail}</p>
                      </div>
                      {s.ok ? <CheckCircle2 size={14} style={{ color }} /> : <AlertCircle size={14} style={{ color }} />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border2)' }} className="pt-4">
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text2)' }}>Quick links</h2>
              <div className="space-y-0.5">
                {[
                  { label: 'Feature flags', href: '/features',    icon: ToggleLeft },
                  { label: 'API usage',     href: '/usage',       icon: Activity },
                  { label: 'Invoices',      href: '/invoices',    icon: FileText },
                  { label: 'Marketplace',   href: '/marketplace', icon: Globe },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-sm transition-all group"
                    style={{ color: 'var(--color-text2)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(124,58,237,0.06)'; el.style.color = 'var(--color-violet)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--color-text2)'; }}>
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                {loading ? 'Clients' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>All deployments</p>
            </div>
            <Link href="/clients" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}>
              Manage all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="bento-card overflow-hidden p-0">
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(167,139,250,0.35), transparent)' }} />
            <table className="data-table">
              <thead><tr>{['Client','Tier','Status','MRR','Portal',''].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {loading && [...Array(3)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((__, j) => <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'var(--color-surface2)', width: j === 0 ? '70%' : '50%' }} /></td>)}</tr>
                ))}
                {!loading && clients.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={24} style={{ color: 'var(--color-text3)' }} />
                      <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No clients yet</p>
                      <Link href="/clients?new=1" style={{ color: 'var(--color-violet)', fontSize: 12, fontWeight: 600 }}>+ Add first client</Link>
                    </div>
                  </td></tr>
                )}
                {clients.map((c, i) => (
                  <tr key={c.id || c.slug} style={{ animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${280 + i * 50}ms both` }}>
                    <td>
                      <Link href={`/clients/${c.id || c.slug}`} className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 text-white transition-transform group-hover:scale-105"
                          style={{ background: avatarGrad(c.slug) }}>{initials(c.name)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-[var(--color-violet)] transition-colors" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                          <p className="text-[10px] truncate font-mono" style={{ color: 'var(--color-text3)' }}>{c.slug}.algolend.co.za</p>
                        </div>
                      </Link>
                    </td>
                    <td><span className={tierBadge[c.tier]}>{c.tier}</span></td>
                    <td>
                      <span className={`${statusBadge[c.status]} inline-flex items-center gap-1.5`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot[c.status], boxShadow: c.status === 'active' ? `0 0 4px ${statusDot[c.status]}` : 'none' }} />
                        {c.status}
                      </span>
                    </td>
                    <td>{c.mrr > 0 ? <span className="font-semibold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(c.mrr)}</span> : null}</td>
                    <td>
                      <a href={`https://${c.slug}.algolend.co.za`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:-translate-y-px"
                        style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.12)' }}>
                        <ExternalLink size={10} /> Open portal
                      </a>
                    </td>
                    <td>
                      <button onClick={() => toggleKill(c)} disabled={killLoading === c.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:-translate-y-px disabled:opacity-50"
                        style={c.status === 'suspended'
                          ? { background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }
                          : { background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.15)' }}>
                        {killLoading === c.id ? <RefreshCw size={11} className="animate-spin" /> : <Power size={11} />}
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
