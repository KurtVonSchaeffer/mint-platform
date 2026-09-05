'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Phone, Calendar, Clock, AlertCircle, CheckCircle2, RefreshCw, Loader2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';
import { TwilioCallButton } from '@/components/TwilioCallButton';

function hasRealTime(iso: string): boolean {
  const inSAST = new Date(new Date(iso).getTime() + 2 * 60 * 60 * 1000);
  return !(inSAST.getUTCHours() === 0 && inSAST.getUTCMinutes() === 0);
}

function timeUntil(iso: string): { label: string; urgent: boolean } | null {
  if (!hasRealTime(iso)) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const absMins = Math.round(Math.abs(diff) / 60000);
  if (diff > 0) {
    if (absMins < 60) return { label: `In ${absMins} min`, urgent: absMins <= 15 };
    return { label: `In ${Math.round(absMins / 60)} hr`, urgent: false };
  } else {
    if (absMins < 60) return { label: `${absMins} min ago`, urgent: true };
    return { label: `${Math.round(absMins / 60)} hr ago`, urgent: true };
  }
}

interface FollowUp {
  id: string;
  leadId: string;
  client: string;
  company: string;
  phone: string;
  status: string;
  statusColor: string;
  nextFollowUp: string;   // SAST date YYYY-MM-DD, used for bucketing/calendar
  scheduledAt: string;    // full ISO string, used for time display
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
    nextFollowUp: toSASTDate(f.scheduled_at),
    scheduledAt:  f.scheduled_at,
    note:         f.note ?? '',
  };
}

function toSASTDate(iso: string): string {
  // Shift UTC timestamp to SAST (+02:00) before extracting date
  return new Date(new Date(iso).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// --- Week helpers ---
function getWeekDays(offset: number): Date[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Reschedule modal ─────────────────────────────────────────────────────────

function RescheduleModal({ fu, onClose, onRescheduled }: {
  fu: FollowUp;
  onClose: () => void;
  onRescheduled: (id: string, newIso: string) => void;
}) {
  const current = fu.scheduledAt.length === 16 ? fu.scheduledAt : new Date(new Date(fu.scheduledAt).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value) return;
    setSaving(true);
    const scheduled_at = `${value}:00+02:00`;
    await fetch(`/api/telemarketer/follow-ups?id=${fu.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at }),
    });
    onRescheduled(fu.id, scheduled_at);
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-sm p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>Reschedule Follow-Up</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text3)' }}>{fu.client} — {fu.status}</p>
        <input type="datetime-local" className="field-input w-full mb-4" value={value} onChange={e => setValue(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button onClick={save} disabled={saving || !value}
            className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
            {saving ? 'Saving…' : 'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── List-view components ──────────────────────────────────────────────────────

function FollowUpCard({ fu, section, onComplete, onReschedule }: {
  fu: FollowUp;
  section: 'today' | 'overdue' | 'upcoming';
  onComplete: (id: string) => void;
  onReschedule: (fu: FollowUp) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const bgColor     = section === 'overdue' ? 'rgba(248,113,113,0.04)' : section === 'today' ? 'rgba(251,191,36,0.04)' : 'transparent';
  const countdown   = timeUntil(fu.scheduledAt);

  async function handleComplete() {
    setCompleting(true);
    await fetch(`/api/telemarketer/follow-ups?id=${fu.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    onComplete(fu.id);
  }

  return (
    <div className="bento-card p-4 transition-all"
      style={{ background: bgColor }}>
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
              {countdown && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: countdown.urgent ? 'rgba(251,191,36,0.12)' : 'rgba(167,139,250,0.10)',
                    color: countdown.urgent ? '#FBBF24' : '#A78BFA',
                    border: `1px solid ${countdown.urgent ? 'rgba(251,191,36,0.25)' : 'rgba(167,139,250,0.20)'}`,
                  }}>
                  <Clock size={9} /> {countdown.label}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{fu.company}</p>
            {fu.note && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text3)' }}>
                <Clock size={10} />
                {new Date(fu.scheduledAt).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {' · '}{fu.note}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {fu.phone && (
            <TwilioCallButton
              leadId={fu.leadId}
              phone={fu.phone}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}
            >
              <Phone size={11} /> Call Now
            </TwilioCallButton>
          )}
          <Link href={`/telemarketer/leads/${fu.leadId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.15)' }}>
            <Calendar size={11} /> Log Call
          </Link>
          <button onClick={() => onReschedule(fu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(167,139,250,0.08)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.15)' }}>
            <Pencil size={11} /> Reschedule
          </button>
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

function SectionBlock({ title, items, section, color, icon: Icon, onComplete, onReschedule }: {
  title: string;
  items: FollowUp[];
  section: 'today' | 'overdue' | 'upcoming';
  color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  onComplete: (id: string) => void;
  onReschedule: (fu: FollowUp) => void;
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
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>All clear. Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(fu => (
            <FollowUpCard key={fu.id} fu={fu} section={section} onComplete={onComplete} onReschedule={onReschedule} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Week-view components ─────────────────────────────────────────────────────

function WeekCard({ fu, onComplete }: { fu: FollowUp; onComplete: (id: string) => void }) {
  const [completing, setCompleting] = useState(false);

  async function handleDone() {
    setCompleting(true);
    await fetch('/api/telemarketer/follow-ups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fu.id, completed: true }),
    });
    onComplete(fu.id);
  }

  return (
    <div className="rounded-lg p-2.5 transition-all"
      style={{
        background: 'var(--color-surface2)',
        border: '1px solid var(--color-border2)',
      }}>
      <Link
        href={`/telemarketer/leads/${fu.leadId}`}
        className="text-[11px] font-semibold leading-tight block mb-1 hover:underline"
        style={{ color: 'var(--color-text)' }}>
        {fu.client}
      </Link>
      {fu.note && (
        <p className="text-[10px] leading-snug mb-2"
          style={{
            color: 'var(--color-text3)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
          {fu.note}
        </p>
      )}
      <button
        onClick={handleDone}
        disabled={completing}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
        style={{
          background: 'rgba(52,211,153,0.08)',
          color: '#34D399',
          border: '1px solid rgba(52,211,153,0.2)',
          opacity: completing ? 0.5 : 1,
        }}>
        {completing ? <Loader2 size={8} className="animate-spin" /> : <CheckCircle2 size={8} />} Done
      </button>
    </div>
  );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeekView({ followUps, weekOffset, setWeekOffset, onComplete }: {
  followUps: FollowUp[];
  weekOffset: number;
  setWeekOffset: (n: number) => void;
  onComplete: (id: string) => void;
}) {
  const days = getWeekDays(weekOffset);
  const todayYMD = toYMD(new Date());

  const rangeLabel =
    days[0].toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) +
    ' – ' +
    days[6].toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  const navBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid var(--color-border2)',
    color: 'var(--color-text2)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  } as React.CSSProperties;

  return (
    <div>
      {/* Week navigation header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button style={navBtn}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          onClick={() => setWeekOffset(weekOffset - 1)}
          aria-label="Previous week">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold flex-1 text-center" style={{ color: 'var(--color-text)' }}>
          {rangeLabel}
        </span>
        <button style={navBtn}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          onClick={() => setWeekOffset(weekOffset + 1)}
          aria-label="Next week">
          <ChevronRight size={14} />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
            style={{
              border: '1px solid var(--color-violet)',
              color: 'var(--color-violet)',
              background: 'transparent',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            Today
          </button>
        )}
      </div>

      {/* 7-column calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
        {days.map((day, i) => {
          const ymd = toYMD(day);
          const dayFUs = followUps.filter(f => f.nextFollowUp === ymd);
          const isToday = ymd === todayYMD;
          const isPast = ymd < todayYMD;
          const hasOverdue = isPast && dayFUs.length > 0;

          const topBorderColor = hasOverdue ? '#F87171' : isToday ? '#FBBF24' : 'var(--color-border2)';
          const columnBg = hasOverdue
            ? 'rgba(248,113,113,0.03)'
            : isToday
            ? 'rgba(251,191,36,0.03)'
            : 'transparent';

          return (
            <div key={ymd}
              className="bento-card p-3 flex flex-col gap-2"
              style={{
                borderTop: `2px solid ${topBorderColor}`,
                background: columnBg,
                minHeight: 140,
              }}>
              {/* Day header */}
              <div className="text-center pb-2" style={{ borderBottom: '1px solid var(--color-row-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: isToday ? '#FBBF24' : 'var(--color-text3)' }}>
                  {DAY_LABELS[i]}
                </p>
                <p className="text-xl font-bold mt-0.5 leading-none"
                  style={{ color: isToday ? '#FBBF24' : hasOverdue ? '#F87171' : 'var(--color-text)' }}>
                  {day.getDate()}
                </p>
                {hasOverdue && (
                  <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                    <AlertCircle size={7} /> overdue
                  </span>
                )}
              </div>

              {/* Follow-up cards */}
              {dayFUs.length === 0 ? (
                <p className="text-[10px] text-center my-auto" style={{ color: 'var(--color-text3)', opacity: 0.5 }}>
                  No follow-ups
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayFUs.map(fu => (
                    <WeekCard key={fu.id} fu={fu} onComplete={onComplete} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'list' | 'week';

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [weekOffset, setWeekOffset] = useState(0);
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(null);

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

  function handleRescheduled(id: string, newIso: string) {
    setFollowUps(prev => prev.map(f =>
      f.id === id
        ? { ...f, scheduledAt: newIso, nextFollowUp: toSASTDate(newIso) }
        : f
    ));
  }

  const today    = toSASTDate(new Date().toISOString());
  const dueToday = followUps.filter(f => f.nextFollowUp === today).map(f => ({ ...f, overdue: false }));
  const overdue  = followUps.filter(f => f.nextFollowUp < today).map(f => ({ ...f, overdue: true as const }));
  const upcoming = followUps.filter(f => f.nextFollowUp > today).map(f => ({ ...f, overdue: false }));

  const total = followUps.length;

  return (
    <div className="space-y-8 page-enter">
      {/* Page header */}
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

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
        {(['list', 'week'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
            style={{
              background: activeTab === tab ? 'var(--color-violet)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--color-text2)',
            }}>
            {tab === 'list' ? 'List' : 'Week'}
          </button>
        ))}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {/* Content */}
      {!loading && activeTab === 'list' && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Due Today', count: dueToday.length, color: '#FBBF24' },
              { label: 'Overdue',   count: overdue.length,  color: '#F87171' },
              { label: 'Upcoming',  count: upcoming.length, color: '#60A5FA' },
            ].map(s => (
              <div key={s.label} className="bento-card p-4">
                <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'var(--font-mono)' }}>{s.count}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <SectionBlock title="Due Today" items={dueToday} section="today"    color="#FBBF24" icon={Clock}       onComplete={handleComplete} onReschedule={setRescheduleTarget} />
          <SectionBlock title="Overdue"   items={overdue}   section="overdue"  color="#F87171" icon={AlertCircle} onComplete={handleComplete} onReschedule={setRescheduleTarget} />
          <SectionBlock title="Upcoming"  items={upcoming}  section="upcoming" color="#60A5FA" icon={Calendar}    onComplete={handleComplete} onReschedule={setRescheduleTarget} />
        </>
      )}

      {!loading && activeTab === 'week' && (
        <WeekView
          followUps={followUps}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          onComplete={handleComplete}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          fu={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={handleRescheduled}
        />
      )}
    </div>
  );
}
