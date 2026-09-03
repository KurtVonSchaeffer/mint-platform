'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LifeBuoy, Loader2, RefreshCw, AlertCircle, Building2, Clock, ChevronRight,
} from 'lucide-react';

interface Ticket {
  id:         string;
  subject:    string;
  category:   string;
  priority:   string;
  status:     string;
  created_at: string;
  clients:    { id: string; name: string } | null;
}

const STATUS_TABS = [
  { id: 'open',        label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved',    label: 'Resolved' },
  { id: 'closed',      label: 'Closed' },
  { id: 'all',         label: 'All' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:        { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA' },
  in_progress: { bg: 'rgba(251,191,36,0.12)',  color: '#d97706' },
  resolved:    { bg: 'rgba(52,211,153,0.12)',  color: '#34D399' },
  closed:      { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' },
};

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  urgent: { bg: 'rgba(220,38,38,0.12)',  color: '#dc2626' },
  high:   { bg: 'rgba(251,191,36,0.12)', color: '#d97706' },
  normal: { bg: 'rgba(124,58,237,0.1)',  color: 'var(--color-violet)' },
  low:    { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' },
};

function fmtTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block"
      style={{ background: style.bg, color: style.color }}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status,  setStatus]  = useState('open');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    setLoading(true); setError(null);
    const res = await fetch(`/api/admin/support-tickets?status=${s}`);
    if (res.ok) setTickets((await res.json()).tickets ?? []);
    else setError('Failed to load support tickets');
    setLoading(false);
  }, []);

  useEffect(() => { load(status); }, [load, status]);

  return (
    <div className="space-y-6 page-enter">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1.5">Support</p>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
            Client Support Tickets
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            Problems reported by clients from their own AlgoLend deployments
          </p>
        </div>
        <button
          onClick={() => load(status)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)', background: 'var(--color-surface)' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: status === t.id ? 'var(--color-violet)' : 'var(--color-surface)',
              color:      status === t.id ? '#fff' : 'var(--color-text3)',
              border:     status === t.id ? '1px solid var(--color-violet)' : '1px solid var(--color-border2)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bento-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
          <AlertCircle size={15} style={{ color: '#F87171', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading tickets…</p>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="bento-card flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <LifeBuoy size={24} style={{ color: 'var(--color-violet)' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>No tickets here</p>
          <p className="text-sm max-w-xs" style={{ color: 'var(--color-text3)' }}>
            Nothing in this queue right now. New tickets submitted by clients will show up automatically.
          </p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="bento-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {tickets.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/support/${t.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-row-border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5 w-8">
                      <span className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ background: PRIORITY_STYLE[t.priority]?.color ?? '#94A3B8' }} />
                    </td>
                    <td className="px-2 py-3.5 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{t.subject}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Building2 size={10} style={{ color: 'var(--color-text3)' }} />
                        <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{t.clients?.name ?? 'Unknown client'}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <Badge label={t.category} style={{ bg: 'rgba(124,58,237,0.08)', color: 'var(--color-text3)' }} />
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge label={t.priority} style={PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.normal} />
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge label={t.status} style={STATUS_STYLE[t.status] ?? STATUS_STYLE.open} />
                    </td>
                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--color-text3)' }}>
                        <Clock size={10} />
                        {fmtTimeAgo(t.created_at)}
                      </span>
                    </td>
                    <td className="pl-1 pr-4 py-3.5 w-6">
                      <ChevronRight size={14} style={{ color: 'var(--color-text3)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
