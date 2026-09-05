'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import {
  TrendingUp, Users2, Trophy, Target, DollarSign, Loader2, RefreshCw,
  BarChart3, TrendingDown, Download,
} from 'lucide-react';

interface FunnelStage {
  stage: string;
  count: number;
  totalValue: number;
  weightedValue: number;
}

interface AgentRow {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  leadsTotal: number;
  won: number;
  demosScheduled: number;
  proposalsSent: number;
  callsToday: number;
  totalCalls: number;
  convRate: number;
  pipelineValue: number;
  commPending: number;
  commPaid: number;
}

interface Summary {
  totalLeads: number;
  totalWon: number;
  totalLost: number;
  totalPipeline: number;
  weightedPipeline: number;
  activeTelemarketers: number;
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `R ${(n / 1_000).toFixed(0)}k`;
  return `R ${Math.round(n).toLocaleString('en-ZA')}`;
}

const STAGE_COLORS: Record<string, string> = {
  'New Lead':           '#A78BFA',
  'Attempted Contact':  '#60A5FA',
  'Contacted':          '#38BDF8',
  'Interested':         '#FBBF24',
  'Demo Scheduled':     '#FB923C',
  'Demo Completed':     '#F472B6',
  'Proposal Requested': '#818CF8',
  'Proposal Sent':      '#C084FC',
  'Negotiation':        '#34D399',
  'Won':                '#10B981',
  'Lost':               '#F87171',
  'Other':              '#6B7280',
  'Not Qualified':      '#6B7280',
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const ACTIVE_STAGES = ['New Lead','Attempted Contact','Contacted','Interested','Demo Scheduled','Demo Completed','Proposal Requested','Proposal Sent','Negotiation'];

export default function SalesDashboardPage() {
  const [loading,  setLoading]  = useState(true);
  const [funnel,   setFunnel]   = useState<FunnelStage[]>([]);
  const [agents,   setAgents]   = useState<AgentRow[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/sales-dashboard');
    if (res.ok) {
      const d = await res.json();
      setFunnel(d.funnel ?? []);
      setAgents(d.agents ?? []);
      setSummary(d.summary ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function downloadCSV() {
    const headers = ['Name','Email','Leads','Won','Demos','Proposals','Calls Today','Total Calls','Conv %','Pipeline (R)','Comm Pending (R)','Comm Paid (R)'];
    const rows = agents.map(a => [
      a.name, a.email, a.leadsTotal, a.won, a.demosScheduled, a.proposalsSent,
      a.callsToday, a.totalCalls, a.convRate.toFixed(1), a.pipelineValue,
      a.commPending, a.commPaid,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-dashboard-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxFunnelCount = Math.max(...funnel.map(s => s.count), 1);
  const activeFunnel   = funnel.filter(s => ACTIVE_STAGES.includes(s.stage));
  const closedFunnel   = funnel.filter(s => !ACTIVE_STAGES.includes(s.stage));

  return (
    <Shell>
      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-1">Sales Intelligence</p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
              Sales Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              Pipeline health and telemarketer performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadCSV} disabled={loading || agents.length === 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
              <Download size={13} /> Export CSV
            </button>
            <button onClick={load}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: 'Active Leads',
                  value: summary?.totalLeads ?? 0,
                  icon: Target,
                  color: '#A78BFA',
                  sub: `${summary?.activeTelemarketers ?? 0} agents`,
                  isMoney: false,
                },
                {
                  label: 'Deals Won',
                  value: summary?.totalWon ?? 0,
                  icon: Trophy,
                  color: '#10B981',
                  sub: `${summary?.totalLost ?? 0} lost`,
                  isMoney: false,
                },
                {
                  label: 'Pipeline Value',
                  value: summary?.totalPipeline ?? 0,
                  icon: DollarSign,
                  color: '#60A5FA',
                  sub: 'Active stages only',
                  isMoney: true,
                },
                {
                  label: 'Weighted Value',
                  value: summary?.weightedPipeline ?? 0,
                  icon: BarChart3,
                  color: '#FBBF24',
                  sub: 'Probability-adjusted',
                  isMoney: true,
                },
              ].map(({ label, value, icon: Icon, color, sub, isMoney }) => (
                <div key={label} className="bento-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${hexToRgb(color)},0.1)` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold leading-none truncate" style={{ color, fontFamily: 'var(--font-mono)' }}>
                      {isMoney ? fmtMoney(value as number) : (value as number).toLocaleString('en-ZA')}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text3)', opacity: 0.6 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              {/* Pipeline funnel */}
              <div className="lg:col-span-2 bento-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Pipeline Funnel</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#A78BFA' }} /><span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Active</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#6B7280' }} /><span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Closed</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[...activeFunnel, ...closedFunnel].map(stage => {
                    const pct = Math.round((stage.count / maxFunnelCount) * 100);
                    const color = STAGE_COLORS[stage.stage] ?? '#A78BFA';
                    const rgb = hexToRgb(color);
                    return (
                      <div key={stage.stage} className="flex items-center gap-3">
                        <div className="w-28 shrink-0 text-right">
                          <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{stage.stage}</span>
                        </div>
                        <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
                          <div
                            className="h-full rounded-lg transition-all duration-700"
                            style={{
                              width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%`,
                              background: `linear-gradient(90deg,rgba(${rgb},0.9),rgba(${rgb},0.5))`,
                            }}
                          />
                        </div>
                        <div className="w-24 shrink-0 flex items-center gap-1.5 justify-end">
                          <span className="text-xs font-bold font-mono" style={{ color }}>{stage.count}</span>
                          {stage.totalValue > 0 && (
                            <span className="text-[9px]" style={{ color: 'var(--color-text3)' }}>{fmtMoney(stage.totalValue)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick stats */}
              <div className="space-y-3">
                <div className="bento-card p-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>Conversion Health</p>
                  {summary && (
                    <div className="space-y-3">
                      {[
                        { label: 'Win Rate', value: summary.totalLeads > 0 ? Math.round((summary.totalWon / summary.totalLeads) * 100) : 0, color: '#10B981', icon: TrendingUp },
                        { label: 'Loss Rate', value: summary.totalLeads > 0 ? Math.round((summary.totalLost / summary.totalLeads) * 100) : 0, color: '#F87171', icon: TrendingDown },
                      ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Icon size={11} style={{ color }} />
                              <span className="text-xs" style={{ color: 'var(--color-text2)' }}>{label}</span>
                            </div>
                            <span className="text-xs font-bold font-mono" style={{ color }}>{value}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bento-card p-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>Stage Breakdown</p>
                  <div className="space-y-1.5">
                    {funnel.filter(s => s.count > 0).slice(0, 5).map(s => {
                      const color = STAGE_COLORS[s.stage] ?? '#A78BFA';
                      const pct = Math.round((s.count / (summary?.totalLeads || 1)) * 100);
                      return (
                        <div key={s.stage} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-[10px]" style={{ color: 'var(--color-text2)' }}>{s.stage}</span>
                          </div>
                          <span className="text-[10px] font-mono" style={{ color }}>{s.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Leaderboard */}
            <div className="bento-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Telemarketer Leaderboard</h2>
                <span className="text-xs" style={{ color: 'var(--color-text3)' }}>Ranked by deals won</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border2)' }}>
                      {['#', 'Agent', 'Leads', 'Calls Today', 'Demos', 'Proposals', 'Won', 'Conv %', 'Pipeline', 'Commission'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                          style={{ color: 'var(--color-text3)', fontSize: 10, letterSpacing: '0.05em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, i) => (
                      <tr
                        key={agent.id}
                        style={{ borderBottom: '1px solid var(--color-row-border)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          {i === 0 ? <span className="text-sm">🥇</span>
                           : i === 1 ? <span className="text-sm">🥈</span>
                           : i === 2 ? <span className="text-sm">🥉</span>
                           : <span className="font-mono text-[10px]" style={{ color: 'var(--color-text3)' }}>#{i + 1}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ background: `linear-gradient(135deg,${agent.color},${agent.color}88)` }}>
                              {agent.initials}
                            </div>
                            <div>
                              <p className="font-semibold leading-none" style={{ color: 'var(--color-text)' }}>{agent.name.split(' ')[0]}</p>
                              <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{agent.email.split('@')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text2)' }}>{agent.leadsTotal}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const pct = Math.min(agent.callsToday / 80 * 100, 100);
                            const color = agent.callsToday >= 80 ? '#10B981' : agent.callsToday >= 50 ? '#FBBF24' : '#F87171';
                            return (
                              <div className="flex flex-col gap-1 min-w-[72px]">
                                <div className="flex items-baseline gap-1">
                                  <span className="font-mono font-bold text-sm" style={{ color }}>{agent.callsToday}</span>
                                  <span className="font-mono text-[9px]" style={{ color: 'var(--color-text3)' }}>/ 80</span>
                                </div>
                                <div style={{ background: 'var(--color-fill-subtle)', borderRadius: 4, width: 72, height: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`, height: '100%', borderRadius: 4, background: color }} />
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text2)' }}>{agent.demosScheduled}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text2)' }}>{agent.proposalsSent}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold font-mono" style={{ color: '#10B981' }}>{agent.won}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${agent.convRate}%`, background: agent.color }} />
                            </div>
                            <span className="font-mono text-[10px]" style={{ color: agent.color }}>{agent.convRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color: '#60A5FA' }}>
                          {agent.pipelineValue > 0 ? fmtMoney(agent.pipelineValue) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color: '#FBBF24' }}>
                          {agent.commPending > 0 ? fmtMoney(agent.commPending) : '—'}
                        </td>
                      </tr>
                    ))}
                    {agents.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-14 text-center text-xs" style={{ color: 'var(--color-text3)' }}>
                          No telemarketer data yet. Add telemarketers in Users and assign them leads.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
