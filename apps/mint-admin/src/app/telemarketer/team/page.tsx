'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users2, DollarSign, TrendingUp, ChevronRight,
  Banknote, CheckCircle2, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  leadsTotal: number;
  leadsConverted: number;
  commissionPending: number;
  commissionReady: number;
  commissionPaid: number;
}

const GRAD = [
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#0EA5E9,#38BDF8)',
  'linear-gradient(135deg,#10B981,#34D399)',
  'linear-gradient(135deg,#F59E0B,#FCD34D)',
  'linear-gradient(135deg,#EC4899,#F472B6)',
  'linear-gradient(135deg,#6366F1,#818CF8)',
];

function fmt(n: number) { return `R ${n.toLocaleString('en-ZA')}`; }

export default function TeamPage() {
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/team');
    if (res.ok) {
      const { agents: data } = await res.json();
      setAgents(data ?? []);
    } else {
      setError('Failed to load team data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = {
    leads:     agents.reduce((s, a) => s + a.leadsTotal, 0),
    converted: agents.reduce((s, a) => s + a.leadsConverted, 0),
    pending:   agents.reduce((s, a) => s + a.commissionPending, 0),
    ready:     agents.reduce((s, a) => s + a.commissionReady, 0),
    paid:      agents.reduce((s, a) => s + a.commissionPaid, 0),
  };

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
            Live stats for all telemarketer accounts
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Team totals strip */}
      {!loading && agents.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Leads',     value: totals.leads,     color: '#A78BFA', icon: Users2      },
            { label: 'Converted',       value: totals.converted, color: '#34D399', icon: CheckCircle2 },
            { label: 'Commission Pending', value: fmt(totals.pending), color: '#FBBF24', icon: DollarSign },
            { label: 'Payroll Ready',   value: fmt(totals.ready), color: '#34D399', icon: Banknote    },
            { label: 'All-Time Paid',   value: fmt(totals.paid),  color: '#10B981', icon: TrendingUp  },
          ].map(k => (
            <div key={k.label} className="bento-card p-4" style={{ borderLeft: `3px solid ${k.color}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `${k.color}15`, color: k.color }}>
                <k.icon size={13} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text3)' }}>{k.label}</p>
              <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-text)' }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bento-card p-6 text-center flex items-center justify-center gap-2">
          <AlertCircle size={16} style={{ color: '#F87171' }} />
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {/* No agents */}
      {!loading && !error && agents.length === 0 && (
        <div className="bento-card p-12 text-center">
          <Users2 size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No telemarketer accounts yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>
            Create users with role <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>telemarketer</code> from the Users page.
          </p>
        </div>
      )}

      {/* Agent cards */}
      {!loading && agents.map((agent, i) => {
        const grad = GRAD[i % GRAD.length];
        const conversionRate = agent.leadsTotal > 0
          ? Math.round((agent.leadsConverted / agent.leadsTotal) * 100)
          : 0;

        return (
          <div key={agent.id} className="bento-card overflow-hidden p-0"
            style={{ animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}>

            {/* Agent header */}
            <div className="flex items-center gap-4 p-5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: grad }}>
                {agent.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ color: 'var(--color-text)' }}>{agent.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{agent.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: '#34D399' }}>{conversionRate}%</p>
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

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0"
              style={{ '--tw-divide-opacity': 1, borderColor: 'var(--color-border2)' } as React.CSSProperties}>
              {[
                { label: 'Total Leads',    value: agent.leadsTotal,                     color: '#A78BFA' },
                { label: 'Converted',      value: agent.leadsConverted,                 color: '#34D399' },
                { label: 'Comm. Pending',  value: fmt(agent.commissionPending),          color: '#FBBF24' },
                { label: 'Payroll Ready',  value: fmt(agent.commissionReady),            color: '#34D399' },
                { label: 'All-Time Paid',  value: fmt(agent.commissionPaid),             color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                  <p className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
