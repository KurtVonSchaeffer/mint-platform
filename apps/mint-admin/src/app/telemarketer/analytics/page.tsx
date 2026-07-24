'use client';

import { useState, useEffect } from 'react';
import {
  Phone, MessageSquare, Calendar, Video, FileText,
  TrendingUp, Target, CheckCircle2, Clock, Loader2,
  ArrowUpRight, BarChart3, Zap,
} from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';

const R = (n: number) =>
  `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface WeekDay { day: string; date: string; calls: number; spoke: number }

interface Analytics {
  activity:  { callsToday: number; callsWeek: number; callsMonth: number; spokeTo: number; contactRate: number; notesMonth: number };
  followUps: { completed: number; pending: number; dueToday: number };
  demos:     { completed: number; booked: number };
  proposals: { sent: number; accepted: number; rate: number; valueCents: number };
  pipeline:  { byStage: Record<string, { count: number; value: number }>; wonValue: number; weightedValue: number; totalLeads: number };
  chart:     WeekDay[];
}

const PIPELINE_ORDER = [
  'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
  'Demo Scheduled', 'Demo Completed', 'Proposal Requested', 'Proposal Sent',
  'Negotiation', 'Won',
];

const STAGE_COLOR: Record<string, string> = {
  'New Lead':          '#9CA3AF',
  'Attempted Contact': '#FBBF24',
  'Contacted':         '#60A5FA',
  'Interested':        '#A78BFA',
  'Demo Scheduled':    '#F472B6',
  'Demo Completed':    '#F472B6',
  'Proposal Requested':'#FB923C',
  'Proposal Sent':     '#FB923C',
  'Negotiation':       '#34D399',
  'Won':               '#10B981',
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function WeekChart({ data }: { data: WeekDay[] }) {
  const maxCalls = Math.max(...data.map(d => d.calls), 1);
  const today    = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map(d => {
        const isToday = d.date === today;
        const pct     = d.calls / maxCalls;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5" title={`${d.calls} calls, ${d.spoke} spoke`}>
            <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
              <div className="w-full rounded-t-lg transition-all duration-500 relative overflow-hidden"
                style={{ height: `${Math.max(pct * 64, d.calls > 0 ? 8 : 2)}px`, background: isToday ? 'var(--color-violet)' : 'rgba(124,58,237,0.3)' }}>
                {d.spoke > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 rounded-t-lg"
                    style={{ height: `${(d.spoke / d.calls) * 100}%`, background: isToday ? '#A78BFA' : 'rgba(167,139,250,0.5)' }} />
                )}
              </div>
            </div>
            <span className="text-[9px] font-medium" style={{ color: isToday ? 'var(--color-violet)' : 'var(--color-text3)' }}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const agentId = await getAgentId();
      const res = await fetch(`/api/telemarketer/analytics?agent_id=${agentId}`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bento-card p-12 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Could not load analytics.</p>
      </div>
    );
  }

  const { activity, followUps, demos, proposals, pipeline, chart } = data;

  const kpis = [
    { label: 'Calls this month',   value: activity.callsMonth,    sub: `${activity.callsToday} today`,           color: '#34D399', rgb: '52,211,153',   icon: Phone      },
    { label: 'Contact rate',       value: `${activity.contactRate}%`, sub: `${activity.spokeTo} connected`,      color: '#60A5FA', rgb: '96,165,250',   icon: Zap        },
    { label: 'Proposals sent',     value: proposals.sent,         sub: `${proposals.rate}% accepted`,            color: '#FB923C', rgb: '251,146,60',   icon: FileText   },
    { label: 'Pipeline value',     value: R(pipeline.weightedValue), sub: 'probability-weighted',                color: 'var(--color-violet)', rgb: '124,58,237', icon: TrendingUp },
    { label: 'Won deals',          value: pipeline.wonValue > 0 ? R(pipeline.wonValue) : pipeline.byStage['Won']?.count ?? 0,
      sub: `${pipeline.byStage['Won']?.count ?? 0} won`,                                                         color: '#10B981', rgb: '16,185,129',   icon: Target     },
    { label: 'Follow-ups due',     value: followUps.dueToday,     sub: `${followUps.pending} total pending`,     color: '#FBBF24', rgb: '251,191,36',   icon: Clock      },
  ];

  const stageData = PIPELINE_ORDER
    .map(s => ({ stage: s, ...(pipeline.byStage[s] ?? { count: 0, value: 0 }), color: STAGE_COLOR[s] ?? '#9CA3AF' }))
    .filter(s => s.count > 0 || ['New Lead', 'Contacted', 'Won'].includes(s.stage));
  const maxStageCount = Math.max(...stageData.map(s => s.count), 1);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">Performance</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
          My Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
          Personal stats — calls, pipeline, proposals and conversion
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map(({ label, value, sub, color, rgb, icon: Icon }) => (
          <div key={label} className="bento-card p-5" style={{ borderLeft: `3px solid ${color}` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `rgba(${rgb},0.12)`, color }}>
                <Icon size={15} />
              </div>
              <ArrowUpRight size={12} style={{ color: 'var(--color-text3)' }} />
            </div>
            <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color, letterSpacing: '-0.02em' }}>
              {value}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text3)' }}>
              {label}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weekly call chart */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Calls — last 7 days</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                <span style={{ color: 'var(--color-violet)' }}>■</span> Total&nbsp;&nbsp;
                <span style={{ color: 'rgba(167,139,250,0.7)' }}>■</span> Spoke
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold" style={{ color: 'var(--color-violet)' }}>{activity.callsWeek}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>this week</p>
            </div>
          </div>
          <WeekChart data={chart} />
        </div>

        {/* Activity breakdown */}
        <div className="bento-card p-5">
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Activity breakdown</h2>
          <div className="space-y-3.5">
            {[
              { label: 'Calls this month',    value: activity.callsMonth,    max: Math.max(activity.callsMonth, 50), color: '#34D399', icon: Phone         },
              { label: 'Notes added',         value: activity.notesMonth,    max: Math.max(activity.notesMonth, 20), color: 'var(--color-violet)', icon: MessageSquare },
              { label: 'Follow-ups completed',value: followUps.completed,    max: Math.max(followUps.completed + followUps.pending, 10), color: '#60A5FA', icon: CheckCircle2  },
              { label: 'Demos completed',     value: demos.completed,        max: Math.max(demos.completed + demos.booked, 5), color: '#F472B6', icon: Video         },
              { label: 'Proposals sent',      value: proposals.sent,         max: Math.max(proposals.sent, 5),       color: '#FB923C', icon: FileText      },
            ].map(({ label, value, max, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, color }}>
                  <Icon size={11} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--color-text2)' }}>{label}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
                  </div>
                  <MiniBar value={value} max={max} color={color} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline funnel */}
      <div className="bento-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Pipeline funnel</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
              {pipeline.totalLeads} total leads · weighted value {R(pipeline.weightedValue)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 size={13} style={{ color: 'var(--color-text3)' }} />
          </div>
        </div>
        <div className="space-y-2.5">
          {stageData.map(({ stage, count, value, color }) => (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                <span className="text-[11px] font-medium truncate block" style={{ color: 'var(--color-text2)' }}>{stage}</span>
              </div>
              <div className="flex-1 h-6 rounded-lg overflow-hidden relative" style={{ background: 'var(--color-surface2)' }}>
                <div className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                  style={{ width: `${Math.max((count / maxStageCount) * 100, count > 0 ? 8 : 0)}%`, background: `${color}22`, borderLeft: `3px solid ${color}` }}>
                </div>
              </div>
              <span className="text-xs font-bold tabular-nums w-6 text-right shrink-0" style={{ color }}>{count}</span>
              {value > 0 && (
                <span className="text-[10px] font-mono w-20 text-right shrink-0" style={{ color: 'var(--color-text3)' }}>
                  {R(value)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Proposals & demos summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bento-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.1)', color: '#FB923C' }}>
              <FileText size={13} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Proposals</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Sent',     value: proposals.sent,     color: '#60A5FA' },
              { label: 'Accepted', value: proposals.accepted, color: '#34D399' },
              { label: 'Rate',     value: `${proposals.rate}%`, color: '#FB923C' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--color-surface2)' }}>
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{label}</p>
              </div>
            ))}
          </div>
          {proposals.valueCents > 0 && (
            <p className="text-xs mt-3 text-center font-semibold" style={{ color: '#34D399' }}>
              {R(proposals.valueCents / 100)} accepted value
            </p>
          )}
        </div>

        <div className="bento-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.1)', color: '#F472B6' }}>
              <Video size={13} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Demos & follow-ups</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Demos done',    value: demos.completed,    color: '#F472B6' },
              { label: 'Demos booked',  value: demos.booked,       color: '#60A5FA' },
              { label: 'FU completed',  value: followUps.completed,color: '#34D399' },
              { label: 'FU due today',  value: followUps.dueToday, color: '#FBBF24' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--color-surface2)' }}>
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
