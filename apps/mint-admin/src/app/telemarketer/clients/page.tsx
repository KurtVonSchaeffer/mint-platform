'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users2, CheckCircle2, AlertCircle, Zap, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';

type ClientStage =
  | 'Converted' | 'Documents Uploaded' | 'Compliance Review'
  | 'Compliance Approved' | 'First Deduction Scheduled'
  | 'First Deduction Successful' | 'Client Live';

interface Client {
  id: string; name: string; company: string;
  stage: ClientStage; convertedDate: string;
}

const PIPELINE_STAGES: { stage: ClientStage; color: string; rgb: string }[] = [
  { stage: 'Converted',                  color: '#A78BFA', rgb: '167,139,250' },
  { stage: 'Documents Uploaded',         color: '#60A5FA', rgb: '96,165,250'  },
  { stage: 'Compliance Review',          color: '#FBBF24', rgb: '251,191,36'  },
  { stage: 'Compliance Approved',        color: '#34D399', rgb: '52,211,153'  },
  { stage: 'First Deduction Scheduled',  color: '#34D399', rgb: '52,211,153'  },
  { stage: 'First Deduction Successful', color: '#10B981', rgb: '16,185,129'  },
  { stage: 'Client Live',                color: '#10B981', rgb: '16,185,129'  },
];

const STAGE_IDX = Object.fromEntries(PIPELINE_STAGES.map((s, i) => [s.stage, i]));

function mapToClient(raw: Record<string, string>): Client {
  return {
    id:            raw.id,
    name:          raw.name,
    company:       raw.company ?? '',
    stage:         (raw.client_stage as ClientStage) ?? 'Converted',
    convertedDate: raw.created_at ?? '',
  };
}

export default function MyClientsPage() {
  const [clients,     setClients]     = useState<Client[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [stageFilter, setStageFilter] = useState<ClientStage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const agentId = await getAgentId();
    const res = await fetch(`/api/leads?assigned_to=${agentId}`);
    if (res.ok) {
      const { leads } = await res.json();
      setClients(
        (leads ?? [])
          .filter((l: Record<string, string>) => l.tm_status === 'Won' || l.tm_status === 'Converted')
          .map(mapToClient),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered     = stageFilter ? clients.filter(c => c.stage === stageFilter) : clients;
  const liveCount    = clients.filter(c => c.stage === 'Client Live').length;
  const approvedCount = clients.filter(c => c.stage === 'Compliance Approved').length;
  const pendingCount  = clients.filter(c => !c.stage || c.stage === 'Converted' || c.stage === 'Documents Uploaded' || c.stage === 'Compliance Review').length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Pipeline</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>My Clients</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            {loading ? 'Loading…' : `${clients.length} converted clients · ${liveCount} live`}
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Converted',     value: clients.length, color: '#A78BFA', icon: Users2,       filter: null as ClientStage | null },
          { label: 'Pending Compliance',  value: pendingCount,   color: '#FBBF24', icon: AlertCircle,  filter: 'Compliance Review' as ClientStage },
          { label: 'Approved',            value: approvedCount,  color: '#34D399', icon: CheckCircle2, filter: 'Compliance Approved' as ClientStage },
          { label: 'Live Clients',        value: liveCount,      color: '#10B981', icon: Zap,          filter: 'Client Live' as ClientStage },
        ].map(({ label, value, color, icon: Icon, filter }) => (
          <button key={label}
            onClick={() => setStageFilter(prev => prev === filter ? null : filter)}
            className="bento-card p-4 text-left transition-all cursor-pointer"
            style={stageFilter === filter ? { borderLeft: `3px solid ${color}` } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}18`, color }}>
                <Icon size={12} />
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{loading ? '—' : value}</p>
          </button>
        ))}
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStageFilter(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={stageFilter === null
            ? { background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.3)' }
            : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
          All ({clients.length})
        </button>
        {PIPELINE_STAGES.map(({ stage, color }) => {
          const count = clients.filter(c => c.stage === stage).length;
          if (count === 0) return null;
          const active = stageFilter === stage;
          return (
            <button key={stage} onClick={() => setStageFilter(prev => prev === stage ? null : stage)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={active
                ? { background: `${color}18`, color, border: `1px solid ${color}40` }
                : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
              {stage} ({count})
            </button>
          );
        })}
      </div>

      {loading && <div className="bento-card p-12 flex items-center justify-center"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} /></div>}

      {!loading && clients.length === 0 && (
        <div className="bento-card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No converted clients yet. Mark leads as Won in My Leads to see them here.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(client => {
            const stageInfo = PIPELINE_STAGES.find(s => s.stage === client.stage) ?? PIPELINE_STAGES[0];
            const idx       = STAGE_IDX[client.stage] ?? 0;
            const pct       = Math.round((idx / (PIPELINE_STAGES.length - 1)) * 100);
            return (
              <Link key={client.id} href={`/telemarketer/clients/${client.id}`}
                className="bento-card p-5 flex items-center gap-5 transition-all hover:-translate-y-0.5 block">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                  {client.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{client.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{client.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: stageInfo.color }} />
                    </div>
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: stageInfo.color }}>{client.stage}</span>
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--color-text3)', opacity: 0.5, flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
