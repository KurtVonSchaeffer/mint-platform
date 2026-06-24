'use client';

import { useState } from 'react';
import { Shell } from '@/components/Shell';
import {
  FileText, Search, Plus, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Download, RefreshCw,
} from 'lucide-react';

type ContractStatus = 'active' | 'pending' | 'expiring' | 'expired';

interface Contract {
  id: string;
  client: string;
  type: string;
  startDate: string;
  endDate: string;
  value: string;
  status: ContractStatus;
}

const MOCK_CONTRACTS: Contract[] = [
  { id: 'C-001', client: 'Zwane Capital',       type: 'Platform Subscription',   startDate: '2025-01-01', endDate: '2026-01-01', value: 'R 9,500/mo',  status: 'active'   },
  { id: 'C-002', client: 'Bonani Lending',       type: 'Platform Subscription',   startDate: '2025-03-01', endDate: '2026-03-01', value: 'R 7,200/mo',  status: 'active'   },
  { id: 'C-003', client: 'Khaya Finance',        type: 'Platform Subscription',   startDate: '2025-06-01', endDate: '2026-06-01', value: 'R 8,800/mo',  status: 'active'   },
  { id: 'C-004', client: 'Siyanda MicroCredit',  type: 'Setup & Integration',     startDate: '2025-09-01', endDate: '2025-12-31', value: 'R 45,000',    status: 'expiring' },
  { id: 'C-005', client: 'Ubuntu Credit Union',  type: 'Platform Subscription',   startDate: '2024-10-01', endDate: '2025-10-01', value: 'R 6,500/mo',  status: 'pending'  },
];

const STATUS_CONFIG: Record<ContractStatus, { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string; bg: string }> = {
  active:   { label: 'Active',   icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
  pending:  { label: 'Pending',  icon: Clock,        color: '#D97706', bg: 'rgba(217,119,6,0.1)'   },
  expiring: { label: 'Expiring', icon: AlertCircle,  color: '#DC2626', bg: 'rgba(220,38,38,0.1)'   },
  expired:  { label: 'Expired',  icon: AlertCircle,  color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function ContractsPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<ContractStatus | 'all'>('all');

  const filtered = MOCK_CONTRACTS.filter(c => {
    const matchQ = !q || c.client.toLowerCase().includes(q.toLowerCase()) || c.type.toLowerCase().includes(q.toLowerCase());
    const matchF = filter === 'all' || c.status === filter;
    return matchQ && matchF;
  });

  const counts = {
    active:   MOCK_CONTRACTS.filter(c => c.status === 'active').length,
    expiring: MOCK_CONTRACTS.filter(c => c.status === 'expiring').length,
    pending:  MOCK_CONTRACTS.filter(c => c.status === 'pending').length,
  };

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Contracts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text3)' }}>
            Client agreements, subscriptions and renewals
          </p>
        </div>
        <button
          className="btn-teal btn-shine inline-flex items-center gap-2 !py-2 !px-4 !text-sm"
        >
          <Plus size={14} />
          New contract
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active',    value: counts.active,   color: '#059669', bg: 'rgba(5,150,105,0.08)'   },
          { label: 'Expiring',  value: counts.expiring, color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },
          { label: 'Pending',   value: counts.pending,  color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border2)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.value}</span>
            </div>
            <p className="text-3xl font-bold mt-2" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text3)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search contracts…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl field-input"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border2)', color: 'var(--color-text)' }}
          />
        </div>
        {(['all', 'active', 'expiring', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all capitalize"
            style={filter === f
              ? { background: 'rgba(5,150,105,0.12)', color: '#059669', border: '1px solid rgba(5,150,105,0.25)' }
              : { background: 'var(--color-card)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Contracts table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border2)', background: 'var(--color-card)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border2)' }}>
              {['Client', 'Type', 'Start', 'End', 'Value', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const s = STATUS_CONFIG[c.status];
              const StatusIcon = s.icon;
              return (
                <tr
                  key={c.id}
                  className="transition-colors"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                        {c.client.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.client}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text2)' }}>
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} style={{ color: 'var(--color-text3)' }} />
                      {c.type}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>{c.startDate}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>{c.endDate}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.value}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
                      <StatusIcon size={10} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      {c.status === 'expiring' && (
                        <button
                          className="p-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                          style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                          title="Renew contract"
                        >
                          <RefreshCw size={12} />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text3)' }}
                        title="Download"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#059669'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text3)' }}
                        title="View details"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#059669'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
                  No contracts match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
