'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Phone, TrendingUp, Users2, DollarSign, Filter, Calendar,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Zap,
  ChevronRight, Target, Banknote, Loader2, Flame,
  PhoneCall,
} from 'lucide-react';
import { getAgentId, getAgentName, getUserRole } from '@/lib/telemarketer-agent';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DashStats {
  leads:    { total: number; newThisMonth: number; awaitingContact: number };
  activity: { callsToday: number; followUpsDue: number; overdue: number };
  clients:  { converted: number; convertedThisMonth: number; live: number; pendingCompliance: number; complianceApproved: number };
  earnings: { commissionPending: number; commissionEarned: number; expectedPayroll: number };
}

interface TodayCall {
  id: string; outcome: string; called_at: string;
  leads: { id: string; name: string; company: string; phone: string | null } | null;
}

function fmt(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

const DAILY_CALL_GOAL = 20;
const MONTHLY_LEAD_GOAL = 8;
const MONTH = new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

// ── SVG call-goal ring (Apple Activity inspired) ─────────────────────────────
function CallRing({ calls, goal }: { calls: number; goal: number }) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(calls / goal, 1);
  const offset = circ * (1 - progress);
  const pct = Math.round(progress * 100);

  const color =
    progress >= 1 ? '#34D399' :
    progress >= 0.5 ? '#A78BFA' :
    '#60A5FA';

  const glow =
    progress >= 1 ? 'rgba(52,211,153,0.6)' :
    progress >= 0.5 ? 'rgba(167,139,250,0.6)' :
    'rgba(96,165,250,0.5)';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        {/* Fill */}
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <p className="text-3xl font-bold leading-none" style={{ color, fontFamily: 'var(--font-mono)' }}>{calls}</p>
        <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>/ {goal} calls</p>
        {progress >= 1 && (
          <Flame size={12} style={{ color: '#34D399', marginTop: 2 }} />
        )}
      </div>
    </div>
  );
}

// ── Animated number counter ───────────────────────────────────────────────────
function AnimCount({ to, prefix = '' }: { to: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (to === 0) return;
    let cur = 0;
    const steps = 40;
    const inc = to / steps;
    timer.current = setInterval(() => {
      cur += inc;
      if (cur >= to) {
        setVal(to);
        clearInterval(timer.current!);
      } else {
        setVal(Math.round(cur));
      }
    }, 16);
    return () => clearInterval(timer.current!);
  }, [to]);

  return <>{prefix}{val.toLocaleString('en-ZA')}</>;
}

// ── Mini 7-bar sparkline ──────────────────────────────────────────────────────
function SparkBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-7 mt-3">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[2px]"
          style={{
            height: `${Math.max((v / max) * 100, 8)}%`,
            background: i === data.length - 1 ? color : `${color}38`,
          }}
        />
      ))}
    </div>
  );
}

// ── Call outcome chip colours ─────────────────────────────────────────────────
function outcomeStyle(outcome: string) {
  if (outcome === 'Spoke')      return { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)',  color: '#34D399' };
  if (outcome === 'No Answer')  return { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)',  color: '#FBBF24' };
  if (outcome === 'Voicemail')  return { bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)',  color: '#60A5FA' };
  return { bg: 'rgba(139,144,180,0.08)', border: 'rgba(139,144,180,0.18)', color: '#8B90B4' };
}

export default function TelemarketerHomePage() {
  const [stats,      setStats]      = useState<DashStats | null>(null);
  const [todayCalls, setTodayCalls] = useState<TodayCall[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [agentName,  setAgentName]  = useState('');
  const [userRole,   setUserRole]   = useState<string>('telemarketer');

  useEffect(() => {
    async function load() {
      const [agentId, name, role] = await Promise.all([getAgentId(), getAgentName(), getUserRole()]);
      setUserRole(role);
      setAgentName(name);
      const [dashRes, callsRes] = await Promise.all([
        fetch(`/api/telemarketer/dashboard?agent_id=${agentId}`).then(r => r.json()),
        fetch(`/api/telemarketer/call-logs?agent_id=${agentId}&today=true`).then(r => r.json()),
      ]);
      if (dashRes.leads) setStats(dashRes);
      setTodayCalls(callsRes.call_logs ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const s = stats ?? {
    leads:    { total: 0, newThisMonth: 0, awaitingContact: 0 },
    activity: { callsToday: 0, followUpsDue: 0, overdue: 0 },
    clients:  { converted: 0, convertedThisMonth: 0, live: 0, pendingCompliance: 0, complianceApproved: 0 },
    earnings: { commissionPending: 0, commissionEarned: 0, expectedPayroll: 0 },
  };

  const isSuperAdmin = userRole === 'super_admin';

  const winRate = s.leads.total > 0
    ? Math.round((s.clients.converted / s.leads.total) * 100)
    : 0;

  const goalPct = Math.round((s.clients.convertedThisMonth / MONTHLY_LEAD_GOAL) * 100);
  const goalRemaining = Math.max(MONTHLY_LEAD_GOAL - s.clients.convertedThisMonth, 0);

  return (
    <div className="space-y-4 page-enter">

      {/* ══ Row 1: Hero + Call Ring ══════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Greeting panel */}
        <div className="lg:col-span-2 bento-card p-6 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)' }}
          />
          <div className="relative flex flex-col justify-between h-full gap-5">
            <div>
              <p className="eyebrow mb-1">
                Telemarketer Workspace
                <span className="ml-2 opacity-50">·</span>
                <span className="ml-2">
                  {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </p>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}
              >
                {agentName ? `${getGreeting()}, ${agentName.split(' ')[0]}` : getGreeting()}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
                {loading ? 'Loading your workspace…' :
                 s.activity.callsToday >= DAILY_CALL_GOAL
                   ? 'Daily call goal reached — keep the momentum!'
                   : `${DAILY_CALL_GOAL - s.activity.callsToday} more calls to hit your daily target`}
              </p>
            </div>

            {/* 3-stat strip */}
            {!loading && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Win Rate',     value: `${winRate}%`,                                                          color: '#A78BFA', sub: 'Leads → Clients'     },
                  { label: 'Live Clients', value: String(s.clients.live),                                                 color: '#34D399', sub: 'Active & earning'    },
                  isSuperAdmin
                    ? { label: 'Pending',  value: fmt(s.earnings.commissionPending), color: '#FBBF24', sub: 'Awaiting payout'    }
                    : { label: 'New Leads', value: String(s.leads.newThisMonth),     color: '#FBBF24', sub: 'This month'          },
                ].map(item => (
                  <div key={item.label} className="rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                    <p className="text-lg font-bold leading-tight" style={{ color: item.color, fontFamily: 'var(--font-mono)' }}>{item.value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text3)' }}>{item.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: item.color, opacity: 0.6 }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily call goal ring */}
        <div className="bento-card p-5 flex flex-col items-center justify-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text3)' }}>
            Daily Call Goal
          </p>
          {loading
            ? <div className="w-[120px] h-[120px] flex items-center justify-center">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
              </div>
            : <CallRing calls={s.activity.callsToday} goal={DAILY_CALL_GOAL} />
          }
          {/* Due / Overdue chips */}
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 text-center rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.16)' }}>
              <p className="text-sm font-bold" style={{ color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>{loading ? '—' : s.activity.followUpsDue}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'rgba(251,191,36,0.55)' }}>Due today</p>
            </div>
            <div className="flex-1 text-center rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.16)' }}>
              <p className="text-sm font-bold" style={{ color: '#F87171', fontFamily: 'var(--font-mono)' }}>{loading ? '—' : s.activity.overdue}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'rgba(248,113,113,0.55)' }}>Overdue</p>
            </div>
          </div>
          <Link href="/telemarketer/leads"
            className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-1.5 !text-xs !py-2">
            <Phone size={12} /> Start Calling
          </Link>
        </div>
      </div>

      {/* ══ Attention Banners ════════════════════════════════════════════ */}
      {!loading && s.activity.overdue > 0 && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'linear-gradient(135deg,rgba(248,113,113,0.08),rgba(248,113,113,0.03))', border: '1px solid rgba(248,113,113,0.22)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {s.activity.overdue} overdue follow-up{s.activity.overdue !== 1 ? 's' : ''}
                {s.activity.followUpsDue > 0 && ` · ${s.activity.followUpsDue} due today`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                {s.leads.awaitingContact} leads still awaiting first contact
              </p>
            </div>
          </div>
          <Link href="/telemarketer/follow-ups"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl"
            style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)' }}>
            Urgent: View Follow-Ups <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {!loading && s.activity.overdue === 0 && s.activity.followUpsDue > 0 && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.22)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
              <Clock size={16} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {s.activity.followUpsDue} follow-up{s.activity.followUpsDue !== 1 ? 's' : ''} due today
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                {s.leads.awaitingContact} leads still awaiting first contact
              </p>
            </div>
          </div>
          <Link href="/telemarketer/follow-ups"
            className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-2 !px-4 shrink-0">
            View Follow-Ups <ArrowUpRight size={13} />
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && (
        <>
          {/* ══ Row 2: Earnings Spotlight ════════════════════════════════ */}
          <div className="bento-card p-6 relative overflow-hidden">
            <div
              className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.09) 0%, transparent 70%)' }}
            />
            <div className="grid lg:grid-cols-3 gap-6 relative">
              {/* Big earned number */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(52,211,153,0.7)' }}>
                  Commission Earned
                </p>
                <p className="text-4xl font-bold" style={{ color: '#34D399', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
                  R&nbsp;<AnimCount to={s.earnings.commissionEarned} />
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
                  Collected & payable · {MONTH.split(' ')[0]}
                </p>
                {s.earnings.expectedPayroll > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Monthly progress</p>
                      <p className="text-[10px] font-bold" style={{ color: '#34D399' }}>
                        {Math.min(Math.round((s.earnings.commissionEarned / s.earnings.expectedPayroll) * 100), 100)}%
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((s.earnings.commissionEarned / s.earnings.expectedPayroll) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #34D399, #10B981)',
                          boxShadow: '0 0 10px rgba(52,211,153,0.45)',
                          transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Breakdown cards */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                {[
                  { label: 'Pending Commission',           value: s.earnings.commissionPending, color: '#FBBF24', rgb: '251,191,36',  sub: 'Awaiting deduction',   icon: Target  },
                  { label: `Expected · ${MONTH.split(' ')[0]}`, value: s.earnings.expectedPayroll, color: '#A78BFA', rgb: '167,139,250', sub: 'Due end of month',     icon: Banknote },
                ].map(item => (
                  <div key={item.label}
                    className="flex flex-col justify-between p-4 rounded-xl"
                    style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{item.label}</p>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: `rgba(${item.rgb},0.12)`, color: item.color }}>
                        <item.icon size={11} />
                      </div>
                    </div>
                    <p className="text-xl font-bold" style={{ color: item.color, fontFamily: 'var(--font-mono)' }}>
                      R&nbsp;<AnimCount to={item.value} />
                    </p>
                    <p className="text-[10px] mt-1.5" style={{ color: item.color, opacity: 0.6 }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ Row 3: KPI Cards ═════════════════════════════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Leads',
                value: s.leads.total,
                sub: `${s.leads.newThisMonth} new this month`,
                color: '#A78BFA', rgb: '167,139,250',
                icon: Filter,
                href: '/telemarketer/leads',
                bars: [40, 55, 45, 60, 70, 75, Math.max(s.leads.newThisMonth, 1)],
              },
              {
                label: 'Awaiting Contact',
                value: s.leads.awaitingContact,
                sub: 'Need first call',
                color: '#FBBF24', rgb: '251,191,36',
                icon: Phone,
                href: '/telemarketer/leads',
                bars: [30, 40, 35, 50, 45, 55, Math.max(s.leads.awaitingContact, 1)],
              },
              {
                label: 'Converted',
                value: s.clients.converted,
                sub: `${s.clients.complianceApproved} compliance approved`,
                color: '#34D399', rgb: '52,211,153',
                icon: CheckCircle2,
                href: '/telemarketer/clients',
                bars: [5, 8, 6, 10, 9, 11, Math.max(s.clients.converted, 1)],
              },
              {
                label: 'Live Clients',
                value: s.clients.live,
                sub: 'Active & earning',
                color: '#10B981', rgb: '16,185,129',
                icon: Zap,
                href: '/telemarketer/clients',
                bars: [2, 4, 3, 5, 4, 6, Math.max(s.clients.live, 1)],
              },
            ].map(item => (
              <Link key={item.label} href={item.href}
                className="bento-card p-4 block group cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ borderLeft: `3px solid ${item.color}` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `rgba(${item.rgb},0.12)`, color: item.color }}>
                    <item.icon size={13} />
                  </div>
                  <ArrowUpRight size={11}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: item.color }} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>{item.label}</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{item.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: item.color, opacity: 0.75 }}>{item.sub}</p>
                <SparkBars data={item.bars} color={item.color} />
              </Link>
            ))}
          </div>

          {/* ══ Monthly Goal ════════════════════════════════════════════ */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>
                  <Target size={13} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text3)' }}>
                    Monthly Goal
                  </p>
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
                    {MONTH}
                  </p>
                </div>
              </div>
              {goalPct >= 100 && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: 'rgba(52,211,153,0.10)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
                  <Flame size={10} /> Goal reached!
                </span>
              )}
            </div>

            <div className="flex items-end justify-between mb-2">
              <p className="text-2xl font-bold leading-none" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                {s.clients.convertedThisMonth}
                <span className="text-base font-normal ml-1" style={{ color: 'var(--color-text3)' }}>/ {MONTHLY_LEAD_GOAL}</span>
              </p>
              <p className="text-sm font-bold" style={{ color: goalPct >= 100 ? '#34D399' : '#A78BFA' }}>
                {goalPct}%
              </p>
            </div>

            <div className="h-2 rounded-full overflow-hidden mb-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(goalPct, 100)}%`,
                  background: goalPct >= 100
                    ? 'linear-gradient(90deg, #34D399, #10B981)'
                    : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                  boxShadow: goalPct >= 100
                    ? '0 0 10px rgba(52,211,153,0.4)'
                    : '0 0 10px rgba(167,139,250,0.4)',
                  transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            </div>

            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
              {goalPct >= 100
                ? 'Outstanding work — you have smashed your monthly conversion target!'
                : `${goalRemaining} more conversion${goalRemaining !== 1 ? 's' : ''} to hit your target for ${MONTH.split(' ')[0]}`}
            </p>
          </div>

          {/* ══ Compliance nudge ════════════════════════════════════════ */}
          {s.clients.pendingCompliance > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <AlertCircle size={13} style={{ color: '#FBBF24', flexShrink: 0 }} />
              <p className="text-sm flex-1" style={{ color: 'var(--color-text2)' }}>
                <span className="font-bold" style={{ color: '#FBBF24' }}>{s.clients.pendingCompliance}</span>
                {' '}client{s.clients.pendingCompliance !== 1 ? 's' : ''} awaiting compliance review
              </p>
              <Link href="/telemarketer/clients" className="text-xs font-bold flex items-center gap-1" style={{ color: '#FBBF24' }}>
                Review <ChevronRight size={12} />
              </Link>
            </div>
          )}

          {/* ══ Row 4: Call Feed + Quick Launch ══════════════════════════ */}
          <div className="grid lg:grid-cols-5 gap-4">

            {/* Today's call feed */}
            <div className="lg:col-span-3 bento-card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <div className="flex items-center gap-2">
                  <PhoneCall size={13} style={{ color: 'var(--color-violet)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Today's Calls</p>
                  {todayCalls.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>
                      {todayCalls.length}
                    </span>
                  )}
                </div>
                <Link href="/telemarketer/leads" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-violet)' }}>
                  My leads <ChevronRight size={11} />
                </Link>
              </div>

              {todayCalls.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.07)', color: 'var(--color-text3)' }}>
                    <Phone size={18} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>No calls logged yet</p>
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text3)' }}>
                    Start calling to see your activity here
                  </p>
                  <Link href="/telemarketer/leads"
                    className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-2 !px-4">
                    <Phone size={12} /> Go to My Leads
                  </Link>
                </div>
              ) : (
                <div>
                  {todayCalls.map((call, i) => {
                    const oc = outcomeStyle(call.outcome);
                    const initials = (call.leads?.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const time = new Date(call.called_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={call.id}
                        className="flex items-center gap-3 px-5 py-3 transition-colors cursor-default"
                        style={{ borderBottom: i < todayCalls.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                          {initials}
                        </div>
                        {/* Name + company */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                            {call.leads?.name ?? '—'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>
                            {call.leads?.company}
                          </p>
                        </div>
                        {/* Time + outcome */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono" style={{ color: 'var(--color-text3)' }}>{time}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: oc.bg, border: `1px solid ${oc.border}`, color: oc.color }}>
                            {call.outcome}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Launch */}
            <div className="lg:col-span-2 bento-card p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <Zap size={13} style={{ color: '#FBBF24' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Quick Launch</p>
              </div>
              <div className="p-2.5 space-y-0.5">
                {[
                  { label: 'My Leads',          sub: `${s.leads.total} total`,               href: '/telemarketer/leads',      color: '#A78BFA', rgb: '167,139,250', icon: Filter     },
                  { label: 'Follow-Ups',         sub: `${s.activity.followUpsDue} due today`, href: '/telemarketer/follow-ups', color: '#FBBF24', rgb: '251,191,36',  icon: Calendar   },
                  { label: 'My Clients',         sub: `${s.clients.live} live`,               href: '/telemarketer/clients',    color: '#34D399', rgb: '52,211,153',  icon: Users2     },
                  ...(isSuperAdmin ? [{ label: 'Commission Centre', sub: fmt(s.earnings.commissionEarned), href: '/telemarketer/commission', color: '#10B981', rgb: '16,185,129', icon: DollarSign }] : []),
                  { label: 'Analytics',          sub: 'Performance overview',                 href: '/telemarketer/analytics',  color: '#60A5FA', rgb: '96,165,250',  icon: TrendingUp },
                  { label: 'Statements',         sub: 'Download payslips',                    href: '/telemarketer/statements', color: '#FB923C', rgb: '251,146,60',  icon: Banknote   },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group cursor-pointer"
                    style={{ color: 'var(--color-text2)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `rgba(${a.rgb},0.08)`; el.style.color = a.color; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--color-text2)'; }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `rgba(${a.rgb},0.10)`, color: a.color }}>
                      <a.icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight">{a.label}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-text3)' }}>{a.sub}</p>
                    </div>
                    <ChevronRight size={12}
                      className="shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
