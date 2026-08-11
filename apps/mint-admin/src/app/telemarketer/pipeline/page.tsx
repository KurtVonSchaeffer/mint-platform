'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Loader2, Phone, Calendar, Building2, Plus, RefreshCw,
  TrendingUp, Trophy, Target, Clock, Sparkles, MessageSquare,
  Star, CalendarClock, CalendarCheck2, FileText, Scale, XCircle,
  PhoneOutgoing, ArrowRight, ChevronRight, ChevronDown, ChevronsRight,
  EyeOff, MoreHorizontal,
} from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';

interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string | null;
  email: string;
  tm_status: string | null;
  next_follow_up: string | null;
  created_at: string;
}

const STAGES = [
  { id: 'New Lead',          color: '#A78BFA', rgb: '167,139,250', icon: Sparkles,        tip: 'Fresh leads to reach out to'       },
  { id: 'Attempted Contact', color: '#60A5FA', rgb: '96,165,250',  icon: PhoneOutgoing,   tip: 'Called but no connection yet'      },
  { id: 'Contacted',         color: '#38BDF8', rgb: '56,189,248',  icon: MessageSquare,   tip: 'Spoke with the lead'               },
  { id: 'Interested',        color: '#FBBF24', rgb: '251,191,36',  icon: Star,            tip: 'Showing genuine interest'          },
  { id: 'Demo Scheduled',    color: '#FB923C', rgb: '251,146,60',  icon: CalendarClock,   tip: 'Demo booked and confirmed'         },
  { id: 'Demo Completed',    color: '#F472B6', rgb: '244,114,182', icon: CalendarCheck2,  tip: 'Demo done, following up'           },
  { id: 'Proposal Sent',     color: '#818CF8', rgb: '129,140,248', icon: FileText,        tip: 'Proposal delivered'                },
  { id: 'Negotiation',       color: '#34D399', rgb: '52,211,153',  icon: Scale,           tip: 'Working out the details'           },
  { id: 'Won',               color: '#10B981', rgb: '16,185,129',  icon: Trophy,          tip: 'Deal closed. Commission incoming.' },
  { id: 'Lost',              color: '#F87171', rgb: '248,113,113', icon: XCircle,         tip: 'Mark as lost and move on'          },
  { id: 'Other',             color: '#6B7280', rgb: '107,114,128', icon: MoreHorizontal,  tip: 'Does not fit any other stage'      },
];

const LEGACY_MAP: Record<string, string> = {
  Pending:          'New Lead',
  'Call Again':     'Contacted',
  'Call Back':      'Contacted',
  Unreachable:      'Attempted Contact',
  'Demo Booked':    'Demo Scheduled',
  Quoted:           'Proposal Sent',
  Converted:        'Won',
  'Not Interested': 'Lost',
  'Not Qualified':  'Other',
};

function normalizeStatus(status: string | null): string {
  if (!status) return 'New Lead';
  return LEGACY_MAP[status] ?? status;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function isOverdue(iso: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function isDueToday(iso: string | null) {
  if (!iso) return false;
  return iso.startsWith(new Date().toISOString().split('T')[0]);
}

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const STAGE_SCORES: Record<string, number> = {
  'New Lead': 10, 'Attempted Contact': 20, 'Contacted': 35, 'Interested': 50,
  'Demo Scheduled': 65, 'Demo Completed': 72, 'Proposal Sent': 80,
  'Negotiation': 90, 'Won': 100, 'Lost': 5,
};

function leadScore(lead: Lead): number {
  let score = STAGE_SCORES[normalizeStatus(lead.tm_status)] ?? 10;
  const daysOld = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86_400_000);
  if (daysOld < 7) score = Math.min(100, score + 5);
  if (isOverdue(lead.next_follow_up)) score = Math.max(0, score - 10);
  else if (lead.next_follow_up) score = Math.min(100, score + 5);
  return score;
}

function scoreColor(s: number) {
  if (s >= 90) return '#A78BFA';
  if (s >= 70) return '#34D399';
  if (s >= 40) return '#FBBF24';
  return '#F87171';
}

// Mini inline funnel bar — shows lead distribution across stages
function PipelineFunnel({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  if (total === 0) return null;

  const counts = STAGES.map(s => ({
    ...s,
    count: leads.filter(l => normalizeStatus(l.tm_status) === s.id).length,
  })).filter(s => s.count > 0);

  return (
    <div className="bento-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text3)' }}>
          Pipeline Distribution
        </p>
        <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{total} total leads</p>
      </div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {counts.map(s => (
          <div
            key={s.id}
            title={`${s.id}: ${s.count}`}
            style={{
              flex: s.count,
              background: s.color,
              opacity: 0.85,
              minWidth: 4,
              transition: 'flex 0.6s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {counts.map(s => (
          <div key={s.id} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[9px]" style={{ color: 'var(--color-text3)' }}>
              {s.id} <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads,          setLeads]          = useState<Lead[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [dragging,       setDragging]       = useState<string | null>(null);
  const [dragOver,       setDragOver]       = useState<string | null>(null);
  const [stagePicker,    setStagePicker]    = useState<string | null>(null);
  const [hideEmpty,      setHideEmpty]      = useState(true);
  const agentIdRef = useRef<string>('');

  // Close stage picker on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-stage-picker]')) setStagePicker(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const agentId = await getAgentId();
    agentIdRef.current = agentId;
    if (!agentId) { setLoading(false); return; }
    const res = await fetch(`/api/leads?assigned_to=${agentId}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function moveToStage(leadId: string, newStage: string) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tm_status: newStage } : l));
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tm_status: newStage }),
    });
    const autoOutcome =
      newStage === 'Contacted'         ? 'Spoke'     :
      newStage === 'Attempted Contact' ? 'No Answer' :
      newStage === 'Other'             ? 'No Answer' : null;
    if (autoOutcome && agentIdRef.current) {
      fetch('/api/telemarketer/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, agent_id: agentIdRef.current, outcome: autoOutcome }),
      });
    }
  }

  function getLeadsForStage(stageId: string) {
    return leads.filter(l => normalizeStatus(l.tm_status) === stageId);
  }

  const totalLeads = leads.length;
  const wonLeads   = leads.filter(l => normalizeStatus(l.tm_status) === 'Won').length;
  const convRate   = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const overdueAll = leads.filter(l => isOverdue(l.next_follow_up)).length;
  const dueToday   = leads.filter(l => isDueToday(l.next_follow_up)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Sales Pipeline</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
            My Pipeline
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text3)' }}>
            Click <strong style={{ color: 'var(--color-text2)' }}>Move</strong> on a card to advance it. No dragging needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideEmpty(h => !h)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
            style={{
              border: '1px solid var(--color-border2)',
              color: hideEmpty ? 'var(--color-violet)' : 'var(--color-text2)',
              background: hideEmpty ? 'rgba(124,58,237,0.08)' : 'transparent',
            }}
          >
            <EyeOff size={13} /> {hideEmpty ? 'Empty hidden' : 'Show empty'}
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <Link
            href="/telemarketer/leads"
            className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-2 !px-3"
          >
            <Plus size={12} /> Add Lead
          </Link>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Leads',
            value: totalLeads,
            sub: 'In your pipeline',
            color: '#A78BFA', rgb: '167,139,250',
            icon: Target,
          },
          {
            label: 'Won',
            value: wonLeads,
            sub: 'Deals closed',
            color: '#10B981', rgb: '16,185,129',
            icon: Trophy,
          },
          {
            label: 'Conversion',
            value: `${convRate}%`,
            sub: 'Lead → Client',
            color: '#FBBF24', rgb: '251,191,36',
            icon: TrendingUp,
          },
          {
            label: overdueAll > 0 ? `${overdueAll} Overdue` : 'Follow-ups Due',
            value: dueToday,
            sub: overdueAll > 0 ? 'Needs attention now' : 'Due today',
            color: overdueAll > 0 ? '#F87171' : '#60A5FA',
            rgb:   overdueAll > 0 ? '248,113,113' : '96,165,250',
            icon: Clock,
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bento-card p-4 relative overflow-hidden"
              style={{ borderTop: `3px solid ${s.color}` }}
            >
              <div className="absolute -top-6 -right-4 w-16 h-16 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, rgba(${s.rgb},0.15) 0%, transparent 70%)` }} />
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${s.rgb},0.12)`, color: s.color }}>
                  <Icon size={15} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: s.color, opacity: 0.6 }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Pipeline funnel ──────────────────────────────── */}
      {leads.length > 0 && <PipelineFunnel leads={leads} />}

      {/* ── Kanban Board ─────────────────────────────────── */}
      <div
        className="flex gap-3 overflow-x-auto pb-6"
        style={{ minHeight: '64vh' }}
        onDragOver={e => e.preventDefault()}
      >
        {STAGES.filter(stage => !hideEmpty || getLeadsForStage(stage.id).length > 0).map(stage => {
          const stageLeads = getLeadsForStage(stage.id);
          const isDragTarget = dragOver === stage.id;
          const StageIcon = stage.icon;
          const isWon  = stage.id === 'Won';
          const isLost = stage.id === 'Lost';

          return (
            <div
              key={stage.id}
              className="shrink-0 flex flex-col rounded-2xl transition-all duration-200"
              style={{
                width: 228,
                background: isDragTarget
                  ? `rgba(${stage.rgb},0.07)`
                  : isWon
                    ? 'rgba(16,185,129,0.04)'
                    : isLost
                      ? 'rgba(248,113,113,0.04)'
                      : 'var(--color-surface2)',
                border: `1px solid ${
                  isDragTarget
                    ? `rgba(${stage.rgb},0.45)`
                    : isWon
                      ? 'rgba(16,185,129,0.22)'
                      : isLost
                        ? 'rgba(248,113,113,0.18)'
                        : 'var(--color-border2)'
                }`,
                boxShadow: isDragTarget
                  ? `0 0 0 2px rgba(${stage.rgb},0.25), 0 8px 32px rgba(${stage.rgb},0.12)`
                  : isWon
                    ? '0 0 24px rgba(16,185,129,0.07)'
                    : undefined,
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
              }}
              onDrop={e => {
                e.preventDefault();
                const leadId = e.dataTransfer.getData('lead_id');
                if (leadId) moveToStage(leadId, stage.id);
                setDragging(null);
                setDragOver(null);
              }}
            >
              {/* Column header */}
              <div
                className="px-3 pt-3 pb-2.5 rounded-t-2xl"
                style={{
                  borderBottom: `1px solid rgba(${stage.rgb},0.14)`,
                  background: `linear-gradient(180deg, rgba(${stage.rgb},0.10) 0%, transparent 100%)`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `rgba(${stage.rgb},0.18)`, color: stage.color }}
                    >
                      <StageIcon size={12} />
                    </div>
                    <p className="text-[11px] font-bold" style={{ color: stage.color }}>{stage.id}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{
                      background: `rgba(${stage.rgb},0.18)`,
                      color: stage.color,
                    }}
                  >
                    {stageLeads.length}
                  </span>
                </div>
                <p className="text-[9px] leading-tight pl-8" style={{ color: `rgba(${stage.rgb},0.65)` }}>
                  {stage.tip}
                </p>
              </div>

              {/* Cards area */}
              <div className="flex-1 p-2 space-y-2 min-h-[40px]">
                {stageLeads.map(lead => {
                  const overdueLead  = isOverdue(lead.next_follow_up);
                  const dueTodayLead = isDueToday(lead.next_follow_up);
                  const isDraggingThis = dragging === lead.id;

                  const score = leadScore(lead);
                  const sColor = scoreColor(score);

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('lead_id', lead.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragging(lead.id);
                      }}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      className="rounded-xl p-3 cursor-grab active:cursor-grabbing select-none transition-all group"
                      style={{
                        background: isDraggingThis
                          ? `rgba(${stage.rgb},0.08)`
                          : 'var(--color-surface)',
                        border: `1px solid ${
                          isDraggingThis
                            ? `rgba(${stage.rgb},0.45)`
                            : overdueLead
                              ? 'rgba(248,113,113,0.3)'
                              : 'var(--color-border2)'
                        }`,
                        opacity: isDraggingThis ? 0.4 : 1,
                        transform: isDraggingThis ? 'rotate(2deg) scale(0.97)' : undefined,
                        boxShadow: isDraggingThis
                          ? `0 16px 40px rgba(${stage.rgb},0.3)`
                          : '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Avatar + name */}
                      <div className="flex items-start gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                          style={{ background: `linear-gradient(135deg, ${stage.color}cc, ${stage.color}88)` }}
                        >
                          {initials(lead.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/telemarketer/leads/${lead.id}`}
                            onClick={e => e.stopPropagation()}
                            draggable={false}
                            className="block text-xs font-bold truncate leading-tight hover:underline"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {lead.name}
                          </Link>
                          {lead.company && (
                            <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-text3)' }}>
                              <Building2 size={9} className="shrink-0" />
                              <span className="text-[10px] truncate">{lead.company}</span>
                            </div>
                          )}
                        </div>
                        {/* Score badge */}
                        <div
                          className="shrink-0 flex flex-col items-center justify-center rounded-lg px-1.5 py-1 mt-0.5 cursor-help"
                          style={{ background: `${sColor}18`, color: sColor, minWidth: 36 }}
                          title={
                            score >= 90 ? `Lead score: ${score}/100. Hot. Close this now.` :
                            score >= 70 ? `Lead score: ${score}/100. Warm. Keep the momentum.` :
                            score >= 40 ? `Lead score: ${score}/100. Lukewarm. Needs attention.` :
                                          `Lead score: ${score}/100. Cold. Re-engage ASAP.`
                          }
                        >
                          <span className="text-[10px] font-black leading-none">{score}</span>
                          <span className="text-[8px] font-semibold leading-none opacity-70 mt-0.5">score</span>
                        </div>
                      </div>

                      {/* Follow-up date */}
                      {lead.next_follow_up && (
                        <div
                          className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md mb-2"
                          style={{
                            background: overdueLead ? 'rgba(248,113,113,0.10)' : dueTodayLead ? 'rgba(251,191,36,0.10)' : 'rgba(0,0,0,0.08)',
                            color: overdueLead ? '#F87171' : dueTodayLead ? '#FBBF24' : 'var(--color-text3)',
                          }}
                        >
                          <Calendar size={8} />
                          {fmtDate(lead.next_follow_up)}
                          {overdueLead && <span className="text-[8px] font-black ml-0.5">!</span>}
                        </div>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center gap-1.5">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            draggable={false}
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                            style={{ background: `rgba(${stage.rgb},0.14)`, color: stage.color }}
                          >
                            <Phone size={8} /> Call
                          </a>
                        )}
                        <Link
                          href={`/telemarketer/leads/${lead.id}`}
                          onClick={e => e.stopPropagation()}
                          draggable={false}
                          className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)' }}
                        >
                          <ChevronRight size={8} /> View
                        </Link>

                        {/* Quick-advance: move to next stage in one click */}
                        {(() => {
                          const currentIdx = STAGES.findIndex(s => s.id === normalizeStatus(lead.tm_status));
                          const nextStage  = STAGES[currentIdx + 1];
                          return nextStage ? (
                            <button
                              onClick={e => { e.stopPropagation(); moveToStage(lead.id, nextStage.id); }}
                              draggable={false}
                              title={`Advance to: ${nextStage.id}`}
                              className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                              style={{ background: `rgba(${nextStage.rgb},0.13)`, color: nextStage.color }}
                            >
                              <ChevronsRight size={8} /> {nextStage.id}
                            </button>
                          ) : null;
                        })()}
                      </div>

                      {/* Stage picker */}
                      <div className="mt-1.5 relative" data-stage-picker draggable={false} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setStagePicker(stagePicker === lead.id ? null : lead.id)}
                          draggable={false}
                          className="w-full inline-flex items-center justify-between gap-1 text-[9px] font-semibold px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                          style={{
                            background: 'rgba(0,0,0,0.06)',
                            color: 'var(--color-text3)',
                            border: '1px solid var(--color-border2)',
                          }}
                        >
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stage.color }} />
                            {normalizeStatus(lead.tm_status)}
                          </span>
                          <ChevronDown size={8} style={{ opacity: 0.5, transform: stagePicker === lead.id ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
                        </button>

                        {stagePicker === lead.id && (
                          <div
                            className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-y-auto shadow-2xl"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', maxHeight: 220 }}
                            draggable={false}
                          >
                            {STAGES.map(s => {
                              const isCurrent = s.id === normalizeStatus(lead.tm_status);
                              return (
                                <button
                                  key={s.id}
                                  draggable={false}
                                  onMouseDown={e => e.stopPropagation()}
                                  onClick={e => { e.stopPropagation(); moveToStage(lead.id, s.id); setStagePicker(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-left transition-colors"
                                  style={{
                                    color: isCurrent ? s.color : 'var(--color-text2)',
                                    background: isCurrent ? `rgba(${s.rgb},0.08)` : 'transparent',
                                  }}
                                  onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                  onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                  {s.id}
                                  {isCurrent && <span className="ml-auto text-[8px] opacity-50">current</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Drop zone */}
                {isDragTarget && stageLeads.length === 0 && (
                  <div
                    className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all"
                    style={{
                      height: 72,
                      borderColor: stage.color,
                      background: `rgba(${stage.rgb},0.06)`,
                    }}
                  >
                    <ArrowRight size={14} style={{ color: stage.color }} />
                    <p className="text-[9px] font-bold" style={{ color: stage.color }}>Drop here</p>
                  </div>
                )}

                {isDragTarget && stageLeads.length > 0 && (
                  <div
                    className="rounded-xl border-2 border-dashed flex items-center justify-center transition-all"
                    style={{
                      height: 44,
                      borderColor: stage.color,
                      background: `rgba(${stage.rgb},0.04)`,
                    }}
                  >
                    <p className="text-[9px] font-bold" style={{ color: stage.color }}>Drop here</p>
                  </div>
                )}

                {/* Empty state */}
                {stageLeads.length === 0 && !isDragTarget && (
                  <div
                    className="rounded-xl py-6 px-3 text-center"
                    style={{ border: `1px dashed rgba(${stage.rgb},0.18)` }}
                  >
                    <StageIcon size={16} className="mx-auto mb-1.5" style={{ color: `rgba(${stage.rgb},0.35)` }} />
                    <p className="text-[9px] font-semibold" style={{ color: `rgba(${stage.rgb},0.45)` }}>
                      No leads here
                    </p>
                    <p className="text-[8px] mt-0.5" style={{ color: 'var(--color-text3)', opacity: 0.6 }}>
                      Drag a card to move it
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
