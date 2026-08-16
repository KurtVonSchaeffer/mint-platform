'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, Minus,
         Phone, Users, Trophy, BarChart2, ArrowRight } from 'lucide-react';

interface Kpis {
  leadsTotal: number;
  callsTotal: number;
  won: number;
  convRate: number;
  contacted: number;
}

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  pct: number;
}

interface Source {
  source: string;
  label: string;
  count: number;
}

interface CallOutcome {
  outcome: string;
  count: number;
}

interface AgentRow {
  id: string;
  name: string;
  email: string;
  callsThisMonth: number;
  leadsAssigned: number;
  won: number;
  convRate: number;
}

interface PeriodData {
  label: string;
  kpis: Kpis;
  funnel: FunnelStage[];
  sources: Source[];
  callOutcomes: CallOutcome[];
}

interface ReportData {
  thisMonth: PeriodData;
  lastMonth: PeriodData;
  agents: AgentRow[];
}

const FUNNEL_COLORS = [
  '#A78BFA', '#60A5FA', '#34D399', '#FBBF24', '#FB923C', '#F472B6', '#94A3B8',
];

function delta(curr: number, prev: number) {
  if (prev === 0) return null;
  return Math.round((curr - prev) / prev * 100);
}

function DeltaBadge({ curr, prev, suffix = '' }: { curr: number; prev: number; suffix?: string }) {
  const d = delta(curr, prev);
  if (d === null) return null;
  const up = d > 0;
  const same = d === 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={same
        ? { background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }
        : up
        ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' }
        : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
      {same ? <Minus size={9} /> : up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {same ? 'flat' : `${up ? '+' : ''}${d}%${suffix}`}
    </span>
  );
}

function KpiCard({ icon, label, thisVal, lastVal, format = (v: number) => String(v) }: {
  icon: React.ReactNode;
  label: string;
  thisVal: number;
  lastVal: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="bento-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--color-text3)' }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text3)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>{format(thisVal)}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>vs {format(lastVal)} last month</span>
        <DeltaBadge curr={thisVal} prev={lastVal} />
      </div>
    </div>
  );
}

function FunnelBar({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={s.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text2)' }}>{s.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>{s.count}</span>
              <span className="text-[9px]" style={{ color: 'var(--color-text3)' }}>{s.pct}%</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--color-surface2)' }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(s.count / max) * 100}%`, background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function exportCSV(data: ReportData, label: string) {
  const rows: string[][] = [];

  rows.push([`Weekly Report — ${label}`], []);

  rows.push(['KPIs', 'This Month', 'Last Month']);
  rows.push(['Leads', String(data.thisMonth.kpis.leadsTotal), String(data.lastMonth.kpis.leadsTotal)]);
  rows.push(['Calls Made', String(data.thisMonth.kpis.callsTotal), String(data.lastMonth.kpis.callsTotal)]);
  rows.push(['Won', String(data.thisMonth.kpis.won), String(data.lastMonth.kpis.won)]);
  rows.push(['Conversion Rate', `${data.thisMonth.kpis.convRate}%`, `${data.lastMonth.kpis.convRate}%`]);
  rows.push([]);

  rows.push(['Pipeline Funnel (This Month)']);
  rows.push(['Stage', 'Count', '%']);
  data.thisMonth.funnel.forEach(f => rows.push([f.label, String(f.count), `${f.pct}%`]));
  rows.push([]);

  rows.push(['Pipeline Funnel (Last Month)']);
  rows.push(['Stage', 'Count', '%']);
  data.lastMonth.funnel.forEach(f => rows.push([f.label, String(f.count), `${f.pct}%`]));
  rows.push([]);

  rows.push(['Team Performance (This Month)']);
  rows.push(['Name', 'Calls', 'Leads Assigned', 'Won', 'Conv Rate']);
  data.agents.forEach(a => rows.push([a.name, String(a.callsThisMonth), String(a.leadsAssigned), String(a.won), `${a.convRate}%`]));
  rows.push([]);

  rows.push(['Lead Sources (This Month)']);
  rows.push(['Source', 'Count']);
  data.thisMonth.sources.forEach(s => rows.push([s.label, String(s.count)]));

  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `algolend-report-${label.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function monthParam(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0); // 0 = current month, -1 = prev, etc.

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?month=${monthParam(offset)}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Weekly Report</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
            Pipeline & team performance — {data?.thisMonth.label ?? '…'} vs {data?.lastMonth.label ?? '…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month navigation */}
          <div className="flex items-center gap-1 rounded-xl px-1 py-1" style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
            <button onClick={() => setOffset(o => o - 1)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--color-text3)' }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: 'var(--color-text)' }}>
              {data?.thisMonth.label ?? '—'}
            </span>
            <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset === 0}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-30" style={{ color: 'var(--color-text3)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          {data && (
            <button
              onClick={() => exportCSV(data, data.thisMonth.label)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-px"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-violet)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Users size={14} />}     label="Leads"       thisVal={data.thisMonth.kpis.leadsTotal} lastVal={data.lastMonth.kpis.leadsTotal} />
            <KpiCard icon={<Phone size={14} />}     label="Calls Made"  thisVal={data.thisMonth.kpis.callsTotal} lastVal={data.lastMonth.kpis.callsTotal} />
            <KpiCard icon={<Trophy size={14} />}    label="Won"         thisVal={data.thisMonth.kpis.won}        lastVal={data.lastMonth.kpis.won} />
            <KpiCard icon={<BarChart2 size={14} />} label="Conv Rate"   thisVal={data.thisMonth.kpis.convRate}   lastVal={data.lastMonth.kpis.convRate}   format={v => `${v}%`} />
          </div>

          {/* Pipeline funnel — this month vs last month */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bento-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Pipeline</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(167,139,250,0.08)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                  {data.thisMonth.label}
                </span>
              </div>
              <FunnelBar stages={data.thisMonth.funnel} />
            </div>
            <div className="bento-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Pipeline</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
                  {data.lastMonth.label}
                </span>
              </div>
              <FunnelBar stages={data.lastMonth.funnel} />
            </div>
          </div>

          {/* Team performance */}
          <div className="bento-card p-5">
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>
              Team Performance — {data.thisMonth.label}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border2)' }}>
                    {['Agent', 'Calls Made', 'Leads Assigned', 'Won', 'Conv Rate'].map(h => (
                      <th key={h} className="pb-2 text-left font-semibold pr-4 last:pr-0"
                        style={{ color: 'var(--color-text3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: i < data.agents.length - 1 ? '1px solid var(--color-border2)' : 'none' }}>
                      <td className="py-3 pr-4 font-semibold" style={{ color: 'var(--color-text)' }}>{a.name}</td>
                      <td className="py-3 pr-4 tabular-nums font-bold" style={{ color: '#60A5FA' }}>{a.callsThisMonth}</td>
                      <td className="py-3 pr-4 tabular-nums" style={{ color: 'var(--color-text2)' }}>{a.leadsAssigned}</td>
                      <td className="py-3 pr-4 tabular-nums font-bold" style={{ color: '#34D399' }}>{a.won}</td>
                      <td className="py-3 tabular-nums" style={{ color: a.convRate > 0 ? '#A78BFA' : 'var(--color-text3)' }}>
                        {a.convRate}%
                      </td>
                    </tr>
                  ))}
                  {data.agents.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center" style={{ color: 'var(--color-text3)' }}>No agents found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sources + Call outcomes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sources */}
            <div className="bento-card p-5">
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Lead Sources</h2>
              <div className="space-y-3">
                {data.thisMonth.sources.map((s, i) => {
                  const max = data.thisMonth.sources[0]?.count ?? 1;
                  return (
                    <div key={s.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium" style={{ color: 'var(--color-text2)' }}>{s.label}</span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>{s.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-surface2)' }}>
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(s.count / max) * 100}%`, background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Call outcomes */}
            <div className="bento-card p-5">
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Call Outcomes</h2>
              <div className="space-y-2.5">
                {data.thisMonth.callOutcomes.map((o, i) => {
                  const max = data.thisMonth.callOutcomes[0]?.count ?? 1;
                  return (
                    <div key={o.outcome} className="flex items-center gap-3">
                      <span className="text-[11px] w-28 truncate font-medium" style={{ color: 'var(--color-text2)' }}>{o.outcome}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--color-surface2)' }}>
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(o.count / max) * 100}%`, background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }} />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: 'var(--color-text)' }}>{o.count}</span>
                    </div>
                  );
                })}
                {data.thisMonth.callOutcomes.length === 0 && (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text3)' }}>No calls this month</p>
                )}
              </div>
            </div>
          </div>

          {/* Process narrative — month over month */}
          <div className="bento-card p-5">
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Month-over-Month Summary</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {data.thisMonth.funnel.map((stage, i) => {
                const last = data.lastMonth.funnel.find(s => s.key === stage.key);
                const d = last ? delta(stage.count, last.count) : null;
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center rounded-xl px-3 py-2.5 min-w-[90px]"
                      style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                      <span className="text-[9px] uppercase tracking-wider mb-1 font-semibold" style={{ color: 'var(--color-text3)' }}>{stage.label}</span>
                      <span className="text-base font-bold tabular-nums" style={{ color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}>{stage.count}</span>
                      {d !== null && (
                        <span className="text-[9px] mt-0.5 font-semibold" style={{ color: d > 0 ? '#34D399' : d < 0 ? '#F87171' : '#94A3B8' }}>
                          {d > 0 ? '+' : ''}{d}%
                        </span>
                      )}
                    </div>
                    {i < data.thisMonth.funnel.length - 1 && (
                      <ArrowRight size={12} style={{ color: 'var(--color-text3)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
