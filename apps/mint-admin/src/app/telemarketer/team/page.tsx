'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import {
  Users2, DollarSign, TrendingUp, Phone, AlertTriangle,
  Banknote, CheckCircle2, Loader2, RefreshCw, AlertCircle,
  Clock, Target, PhoneCall, ChevronRight, Activity,
  ArrowUp, ArrowDown, ArrowRight,
} from 'lucide-react';
import { Sparkline } from '@/components/Sparkline';

interface Agent {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  leadsTotal: number;
  leadsConverted: number;
  leadsNewLead: number;
  wonThisMonth: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  lastCalledAt: string | null;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  commissionPending: number;
  commissionReady: number;
  commissionPaid: number;
}

interface RecentCall {
  id: string;
  agent_id: string;
  outcome: string;
  duration: number | null;
  notes: string | null;
  called_at: string;
  lead_id: string | null;
  leads: { name: string; company: string } | null;
}

// Dot-grid + color-wash card — inspired by Progress Metric Card (21st.dev)
function DotGridCard({ color, rgb, children }: { color: string; rgb: string; children: React.ReactNode }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="bento-card p-4 relative overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
      {/* color wash */}
      <div className="absolute inset-y-0 right-0 w-2/3 pointer-events-none"
        style={{ background: `linear-gradient(to left, rgba(${rgb},0.07), transparent)` }} />
      {/* dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.08 }}>
        <svg width="100%" height="100%" aria-hidden>
          <defs>
            <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill={color} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const GRAD = [
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#0EA5E9,#38BDF8)',
  'linear-gradient(135deg,#10B981,#34D399)',
  'linear-gradient(135deg,#F59E0B,#FCD34D)',
  'linear-gradient(135deg,#EC4899,#F472B6)',
  'linear-gradient(135deg,#6366F1,#818CF8)',
];

const OUTCOME_CFG: Record<string, { color: string; bg: string }> = {
  'Answered':        { color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  'Voicemail':       { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)'  },
  'No Answer':       { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  'Callback':        { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  'Not Interested':  { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
};

function fmt(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type SortKey = 'calls_today' | 'calls_week' | 'converted' | 'overdue' | 'name';

export default function TeamPage() {
  const [agents,         setAgents]         = useState<Agent[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentCall[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [sortBy,         setSortBy]         = useState<SortKey>('calls_today');
  const [agentNames,     setAgentNames]     = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/team');
    if (res.ok) {
      const { agents: data, recentActivity: activity } = await res.json();
      const list: Agent[] = data ?? [];
      setAgents(list);
      setRecentActivity(activity ?? []);
      const names: Record<string, string> = {};
      list.forEach((a: Agent) => { names[a.id] = a.name; });
      setAgentNames(names);
    } else {
      setError('Failed to load team data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...agents].sort((a, b) => {
    if (sortBy === 'calls_today')  return b.callsToday - a.callsToday;
    if (sortBy === 'calls_week')   return b.callsThisWeek - a.callsThisWeek;
    if (sortBy === 'converted')    return b.wonThisMonth - a.wonThisMonth;
    if (sortBy === 'overdue')      return b.overdueFollowUps - a.overdueFollowUps;
    return a.name.localeCompare(b.name);
  });

  const totals = {
    callsToday:  agents.reduce((s, a) => s + a.callsToday, 0),
    callsMonth:  agents.reduce((s, a) => s + a.callsThisMonth, 0),
    wonMonth:    agents.reduce((s, a) => s + a.wonThisMonth, 0),
    overdue:     agents.reduce((s, a) => s + a.overdueFollowUps, 0),
    pending:     agents.reduce((s, a) => s + a.commissionPending, 0),
    ready:       agents.reduce((s, a) => s + a.commissionReady, 0),
    paid:        agents.reduce((s, a) => s + a.commissionPaid, 0),
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'calls_today', label: 'Calls Today' },
    { key: 'calls_week',  label: 'Calls This Week' },
    { key: 'converted',   label: 'Won This Month' },
    { key: 'overdue',     label: 'Overdue Follow-ups' },
    { key: 'name',        label: 'Name' },
  ];

  return (
    <div className="space-y-6 page-enter">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Management</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
            Team Performance
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            Live activity, calls, conversions &amp; commission across all telemarketers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="field-input text-xs py-1.5 pr-7"
            style={{ minWidth: 160 }}
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>Sort: {o.label}</option>)}
          </select>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Team totals strip — dot-grid + color wash from Progress Metric Card */}
      {!loading && agents.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Team Calls Today',   value: totals.callsToday, color: '#60A5FA', rgb: '96,165,250',  icon: PhoneCall,    suffix: ' calls',   spark: agents.map(a => a.callsToday) },
            { label: 'Calls This Month',   value: totals.callsMonth, color: '#A78BFA', rgb: '167,139,250', icon: Phone,        suffix: ' total',   spark: agents.map(a => a.callsThisMonth) },
            { label: 'Won This Month',     value: totals.wonMonth,   color: '#34D399', rgb: '52,211,153',  icon: Target,       suffix: ' clients', spark: agents.map(a => a.wonThisMonth) },
            { label: 'Overdue Follow-ups', value: totals.overdue,    color: totals.overdue > 0 ? '#F87171' : '#34D399', rgb: totals.overdue > 0 ? '248,113,113' : '52,211,153', icon: AlertTriangle, suffix: ' overdue', spark: agents.map(a => a.overdueFollowUps) },
          ].map(k => (
            <DotGridCard key={k.label} color={k.color} rgb={k.rgb}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `rgba(${k.rgb},0.12)`, color: k.color }}>
                  <k.icon size={13} />
                </div>
                <Sparkline data={k.spark.length >= 2 ? k.spark : [0, k.value]} color={k.color} width={56} height={28} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text3)' }}>{k.label}</p>
              <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-text)' }}>
                {k.value}<span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text3)' }}>{k.suffix}</span>
              </p>
            </DotGridCard>
          ))}
        </div>
      )}

      {/* Commission totals */}
      {!loading && agents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Commission Pending', value: fmt(totals.pending), color: '#FBBF24', rgb: '251,191,36',  icon: Clock,      spark: agents.map(a => a.commissionPending) },
            { label: 'Payroll Ready',      value: fmt(totals.ready),   color: '#A78BFA', rgb: '167,139,250', icon: Banknote,   spark: agents.map(a => a.commissionReady) },
            { label: 'All-Time Paid',      value: fmt(totals.paid),    color: '#10B981', rgb: '16,185,129',  icon: TrendingUp, spark: agents.map(a => a.commissionPaid) },
          ].map(k => (
            <DotGridCard key={k.label} color={k.color} rgb={k.rgb}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `rgba(${k.rgb},0.12)`, color: k.color }}>
                  <k.icon size={13} />
                </div>
                <Sparkline data={k.spark.length >= 2 ? k.spark : [0, 1]} color={k.color} width={56} height={28} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text3)' }}>{k.label}</p>
              <p className="text-base font-bold font-mono" style={{ color: 'var(--color-text)' }}>{k.value}</p>
            </DotGridCard>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {error && (
        <div className="bento-card p-6 flex items-center justify-center gap-2">
          <AlertCircle size={16} style={{ color: '#F87171' }} />
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="bento-card p-12 text-center">
          <Users2 size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No telemarketer accounts yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
            Create users with role <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>telemarketer</code> from the Users page.
          </p>
        </div>
      )}

      {/* ── Agent cards ──────────────────────────────────────────── */}
      {!loading && sorted.map((agent, i) => {
        const grad           = GRAD[i % GRAD.length];
        const conversionRate = agent.leadsTotal > 0 ? Math.round((agent.leadsConverted / agent.leadsTotal) * 100) : 0;
        const activeToday    = agent.callsToday > 0;
        const goalPct        = Math.min(Math.round((agent.wonThisMonth / 8) * 100), 100);

        return (
          <div key={agent.id} className="bento-card overflow-hidden p-0"
            style={{ animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both` }}>

            {/* Agent header */}
            <div className="flex items-center gap-4 p-5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: grad }}>
                  {agent.initials}
                </div>
                {/* Live / idle indicator */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface)]`}
                  style={{ background: activeToday ? '#34D399' : '#6B7280' }}
                  title={activeToday ? 'Called today' : 'No calls today'} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold" style={{ color: 'var(--color-text)' }}>{agent.name}</p>
                  {agent.overdueFollowUps > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                      {agent.overdueFollowUps} overdue
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{agent.email}</p>
                {agent.lastCalledAt && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
                    Last call: {timeAgo(agent.lastCalledAt)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Monthly goal mini-bar */}
                <div className="hidden lg:block text-right" style={{ minWidth: 90 }}>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text3)' }}>
                    Monthly goal {agent.wonThisMonth}/8
                  </p>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface2)', width: 90 }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${goalPct}%`,
                        background: goalPct >= 100 ? '#34D399' : 'linear-gradient(90deg,#7C3AED,#A78BFA)',
                      }} />
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {conversionRate >= 15
                      ? <ArrowUp size={11} style={{ color: '#34D399' }} />
                      : conversionRate >= 5
                        ? <ArrowRight size={11} style={{ color: '#FBBF24' }} />
                        : <ArrowDown size={11} style={{ color: '#F87171' }} />}
                    <p className="text-xs font-semibold"
                      style={{ color: conversionRate >= 15 ? '#34D399' : conversionRate >= 5 ? '#FBBF24' : '#F87171' }}>
                      {conversionRate}%
                    </p>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>conversion</p>
                </div>

                <Link
                  href={`/payroll?agent=${agent.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}>
                  Payroll <ChevronRight size={11} />
                </Link>
              </div>
            </div>

            {/* Stats grid — two rows */}
            <div className="grid grid-cols-3 lg:grid-cols-6" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              {[
                { label: 'Calls Today',    value: agent.callsToday,      color: agent.callsToday > 0 ? '#60A5FA' : 'var(--color-text3)', icon: PhoneCall },
                { label: 'Calls / Week',   value: agent.callsThisWeek,   color: '#A78BFA', icon: Phone    },
                { label: 'Calls / Month',  value: agent.callsThisMonth,  color: '#A78BFA', icon: Activity },
                { label: 'Total Leads',    value: agent.leadsTotal,      color: 'var(--color-text2)', icon: Users2 },
                { label: 'New Leads',      value: agent.leadsNewLead,    color: agent.leadsNewLead > 0 ? '#FBBF24' : 'var(--color-text3)', icon: Target },
                { label: 'Won This Month', value: agent.wonThisMonth,    color: agent.wonThisMonth > 0 ? '#34D399' : 'var(--color-text3)', icon: CheckCircle2 },
              ].map((s, si) => (
                <div key={s.label} className="p-3 flex items-center gap-2.5"
                  style={{
                    borderRight: si < 5 ? '1px solid var(--color-border2)' : 'none',
                  }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-surface2)', color: s.color }}>
                    <s.icon size={11} />
                  </div>
                  <div>
                    <p className="text-base font-bold font-mono leading-none" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Commission + follow-up row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 p-0">
              {[
                { label: 'Comm. Pending',    value: fmt(agent.commissionPending), color: '#FBBF24' },
                { label: 'Payroll Ready',    value: fmt(agent.commissionReady),   color: '#A78BFA' },
                { label: 'All-Time Paid',    value: fmt(agent.commissionPaid),    color: '#10B981' },
                { label: 'Follow-ups Today', value: agent.dueTodayFollowUps,      color: agent.dueTodayFollowUps > 0 ? '#60A5FA' : 'var(--color-text3)' },
                { label: 'Overdue',          value: agent.overdueFollowUps,       color: agent.overdueFollowUps > 0 ? '#F87171' : '#34D399' },
              ].map((s, si) => (
                <div key={s.label} className="p-3"
                  style={{ borderRight: si < 4 ? '1px solid var(--color-border2)' : 'none' }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                  <p className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Recent Call Activity — Chrono Board timeline ────────── */}
      {!loading && recentActivity.length > 0 && (
        <div className="bento-card overflow-hidden p-0">
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <Activity size={14} style={{ color: 'var(--color-violet)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Recent Call Activity</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
              style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
              Last {recentActivity.length} calls
            </span>
          </div>
          <div className="px-5 py-4 space-y-0">
            {recentActivity.map((call, idx) => {
              const cfg = OUTCOME_CFG[call.outcome] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
              const agentName = agentNames[call.agent_id] ?? 'Unknown';
              const isLast = idx === recentActivity.length - 1;
              return (
                <div key={call.id} className="group relative flex items-start gap-4">
                  {/* Vertical connector line */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px"
                      style={{ background: 'var(--color-border2)' }} />
                  )}
                  {/* Outcome dot */}
                  <div className="relative z-10 shrink-0 mt-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}30` }}>
                    <PhoneCall size={12} style={{ color: cfg.color }} />
                  </div>
                  {/* Card */}
                  <div className="flex-1 min-w-0 mb-4 rounded-xl p-3 transition-all"
                    style={{ background: 'var(--color-surface2)', border: '1px solid transparent' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.border = `1px solid ${cfg.color}30`;
                      (e.currentTarget as HTMLElement).style.background = `${cfg.bg}`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-surface2)';
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                            {call.leads?.name ?? 'Unknown lead'}
                          </p>
                          {call.leads?.company && (
                            <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>
                              · {call.leads.company}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
                          <span style={{ color: 'var(--color-text2)', fontWeight: 600 }}>{agentName}</span>
                          {call.duration ? ` · ${call.duration} min` : ''}
                          {call.notes ? ` · "${call.notes.slice(0, 55)}${call.notes.length > 55 ? '…' : ''}"` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          {call.outcome}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>
                          {timeAgo(call.called_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
