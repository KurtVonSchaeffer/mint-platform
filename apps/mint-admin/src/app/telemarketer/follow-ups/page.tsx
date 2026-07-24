'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Phone, Calendar, Clock, AlertCircle, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';

interface FollowUp {
  id: string;
  leadId: string;
  client: string;
  company: string;
  phone: string;
  status: string;
  statusColor: string;
  nextFollowUp: string;
  note: string;
  overdue?: boolean;
}

interface ApiFollowUp {
  id: string;
  lead_id: string;
  follow_up_type: string;
  scheduled_at: string;
  note: string | null;
  completed: boolean;
  leads: { name: string; company: string; phone: string | null } | null;
}

const TYPE_COLOR: Record<string, string> = {
  'Call Back':        '#A78BFA',
  'Call Again':       '#60A5FA',
  'Demo Booked':      '#34D399',
  'Demo Follow-Up':   '#34D399',
  'Quoted':           '#10B981',
  'Unreachable':      '#9CA3AF',
};

function mapFollowUp(f: ApiFollowUp): FollowUp {
  return {
    id:           f.id,
    leadId:       f.lead_id,
    client:       f.leads?.name ?? 'Unknown',
    company:      f.leads?.company ?? '',
    phone:        f.leads?.phone ?? '',
    status:       f.follow_up_type,
    statusColor:  TYPE_COLOR[f.follow_up_type] ?? '#9CA3AF',
    nextFollowUp: f.scheduled_at,
    note:         f.note ?? '',
  };
}

function FollowUpCard({ fu, section, onComplete }: {
  fu: FollowUp;
  section: 'today' | 'overdue' | 'upcoming';
  onComplete: (id: string) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const borderColor = section === 'overdue' ? '#F87171' : section === 'today' ? '#FBBF24' : 'var(--color-border2)';
  const bgColor     = section === 'overdue' ? 'rgba(248,113,113,0.04)' : section === 'today' ? 'rgba(251,191,36,0.04)' : 'transparent';

  async function handleComplete() {
    setCompleting(true);
    await fetch(`/api/telemarketer/follow-ups?id=${fu.id}`, { method: 'PATCH' });
    onComplete(fu.id);
  }

  return (
    <div className="bento-card p-4 transition-all"
      style={{ borderLeft: `3px solid ${borderColor}`, background: bgColor }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = fu.statusColor; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = borderColor; }}>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
            {fu.client.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/telemarketer/leads/${fu.leadId}`}
                className="text-sm font-semibold transition-colors"
                style={{ color: 'var(--color-text)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}>
                {fu.client}
              </Link>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${fu.statusColor}18`, color: fu.statusColor, border: `1px solid ${fu.statusColor}30` }}>
                {fu.status}
              </span>
              {fu.overdue && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <AlertCircle size={9} /> OVERDUE
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{fu.company}</p>
            {fu.note && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text3)' }}>
                <Clock size={10} />
                {new Date(fu.nextFollowUp + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}{fu.note}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {fu.phone && (
            <a href={`tel:${fu.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
              <Phone size={11} /> Call Now
            </a>
          )}
          <Link href={`/telemarketer/leads/${fu.leadId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.15)' }}>
            <Calendar size={11} /> Log Call
          </Link>
          <button onClick={handleComplete} disabled={completing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)', opacity: completing ? 0.5 : 1 }}>
            {completing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ title, items, section, color, icon: Icon, onComplete }: {
  title: string;
  items: FollowUp[];
  section: 'today' | 'overdue' | 'upcoming';
  color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  onComplete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
          <Icon size={14} />
        </div>
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="bento-card p-6 text-center flex items-center justify-center gap-2">
          <CheckCircle2 size={16} style={{ color: '#34D399' }} />
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>All clear — nothing here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(fu => (
            <FollowUpCard key={fu.id} fu={fu} section={section} onComplete={onComplete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const agentId = await getAgentId();
    const res = await fetch(`/api/telemarketer/follow-ups?agent_id=${agentId}`);
    if (res.ok) {
      const { follow_ups } = await res.json();
      setFollowUps(
        (follow_ups ?? [] as ApiFollowUp[])
          .filter((f: ApiFollowUp) => !f.completed)
          .map(mapFollowUp)
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleComplete(id: string) {
    setFollowUps(prev => prev.filter(f => f.id !== id));
  }

  const today    = new Date().toISOString().split('T')[0];
  const dueToday = followUps.filter(f => f.nextFollowUp === today).map(f => ({ ...f, overdue: false }));
  const overdue  = followUps.filter(f => f.nextFollowUp < today).map(f => ({ ...f, overdue: true as const }));
  const upcoming = followUps.filter(f => f.nextFollowUp > today).map(f => ({ ...f, overdue: false }));

  const total = followUps.length;

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Action items</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>Follow Ups</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            {loading ? 'Loading…' : `${total} follow-up${total !== 1 ? 's' : ''} · ${overdue.length > 0 ? `${overdue.length} overdue` : 'nothing overdue'}`}
          </p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Due Today', count: dueToday.length, color: '#FBBF24' },
              { label: 'Overdue',   count: overdue.length,  color: '#F87171' },
              { label: 'Upcoming',  count: upcoming.length, color: '#60A5FA' },
            ].map(s => (
              <div key={s.label} className="bento-card p-4" style={{ borderLeft: `3px solid ${s.color}` }}>
                <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'var(--font-mono)' }}>{s.count}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <SectionBlock title="Due Today" items={dueToday} section="today"   color="#FBBF24" icon={Clock}        onComplete={handleComplete} />
          <SectionBlock title="Overdue"   items={overdue}   section="overdue" color="#F87171" icon={AlertCircle}  onComplete={handleComplete} />
          <SectionBlock title="Upcoming"  items={upcoming}  section="upcoming" color="#60A5FA" icon={Calendar}    onComplete={handleComplete} />
        </>
      )}
    </div>
  );
}
