'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Loader2, Phone, Calendar, Building2, Plus, RefreshCw,
  TrendingUp, Trophy, Target, Clock,
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
  { id: 'New Lead',           color: '#A78BFA', rgb: '167,139,250', emoji: '🌱' },
  { id: 'Attempted Contact',  color: '#60A5FA', rgb: '96,165,250',  emoji: '📞' },
  { id: 'Contacted',          color: '#38BDF8', rgb: '56,189,248',  emoji: '💬' },
  { id: 'Interested',         color: '#FBBF24', rgb: '251,191,36',  emoji: '⚡' },
  { id: 'Demo Scheduled',     color: '#FB923C', rgb: '251,146,60',  emoji: '📅' },
  { id: 'Demo Completed',     color: '#F472B6', rgb: '244,114,182', emoji: '✅' },
  { id: 'Proposal Sent',      color: '#818CF8', rgb: '129,140,248', emoji: '📄' },
  { id: 'Negotiation',        color: '#34D399', rgb: '52,211,153',  emoji: '🤝' },
  { id: 'Won',                color: '#10B981', rgb: '16,185,129',  emoji: '🏆' },
  { id: 'Lost',               color: '#F87171', rgb: '248,113,113', emoji: '❌' },
];

// Map legacy statuses to current pipeline stages
const LEGACY_MAP: Record<string, string> = {
  Pending:          'New Lead',
  'Call Again':     'Contacted',
  'Call Back':      'Contacted',
  Unreachable:      'Attempted Contact',
  'Demo Booked':    'Demo Scheduled',
  Quoted:           'Proposal Sent',
  Converted:        'Won',
  'Not Interested': 'Lost',
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

export default function PipelinePage() {
  const [leads,    setLeads]    = useState<Lead[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const agentIdRef = useRef<string>('');

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
  }

  function getLeadsForStage(stageId: string) {
    return leads.filter(l => normalizeStatus(l.tm_status) === stageId);
  }

  const totalLeads = leads.length;
  const wonLeads   = leads.filter(l => normalizeStatus(l.tm_status) === 'Won').length;
  const convRate   = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const dueToday   = leads.filter(l => isDueToday(l.next_follow_up)).length;
  const overdue    = leads.filter(l => isOverdue(l.next_follow_up)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 page-enter">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Sales Pipeline</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
            My Pipeline
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <Link href="/telemarketer/leads"
            className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-2 !px-3">
            <Plus size={12} /> Add Lead
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads',    value: totalLeads, color: '#A78BFA', icon: Target },
          { label: 'Won',            value: wonLeads,   color: '#10B981', icon: Trophy },
          { label: 'Conversion',     value: `${convRate}%`, color: '#FBBF24', icon: TrendingUp },
          { label: 'Follow-ups Due', value: dueToday + (overdue > 0 ? ` (+${overdue} late)` : ''), color: overdue > 0 ? '#F87171' : '#60A5FA', icon: Clock },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bento-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `rgba(${s.color.replace('#','').match(/../g)!.map(h=>parseInt(h,16)).join(',')},0.1)` }}>
                <Icon size={16} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban board */}
      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ minHeight: '60vh' }}
        onDragOver={e => e.preventDefault()}
      >
        {STAGES.map(stage => {
          const stageLeads = getLeadsForStage(stage.id);
          const isDragTarget = dragOver === stage.id;

          return (
            <div
              key={stage.id}
              className="shrink-0 flex flex-col"
              style={{ width: 220 }}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={e => {
                // Only clear if leaving the column entirely
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOver(null);
                }
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
                className="rounded-xl p-3 mb-2 transition-all"
                style={{
                  background: isDragTarget
                    ? `rgba(${stage.rgb},0.15)`
                    : `rgba(${stage.rgb},0.07)`,
                  border: `1px solid rgba(${stage.rgb},${isDragTarget ? '0.4' : '0.18'})`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                    <p className="text-[11px] font-bold" style={{ color: stage.color }}>{stage.id}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{ background: `rgba(${stage.rgb},0.15)`, color: stage.color }}
                  >
                    {stageLeads.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 min-h-[40px]">
                {stageLeads.map(lead => {
                  const overdueLead = isOverdue(lead.next_follow_up);
                  const dueTodayLead = isDueToday(lead.next_follow_up);
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
                      className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all select-none"
                      style={{
                        background: 'var(--color-surface)',
                        border: `1px solid ${dragging === lead.id
                          ? `rgba(${stage.rgb},0.5)`
                          : 'var(--color-border2)'}`,
                        opacity: dragging === lead.id ? 0.45 : 1,
                        transform: dragging === lead.id ? 'scale(0.97)' : undefined,
                        boxShadow: dragging === lead.id
                          ? `0 12px 32px rgba(${stage.rgb},0.25)`
                          : undefined,
                      }}
                    >
                      <Link
                        href={`/telemarketer/leads/${lead.id}`}
                        onClick={e => e.stopPropagation()}
                        className="block"
                        draggable={false}
                      >
                        <p className="text-xs font-bold truncate mb-0.5 hover:underline"
                          style={{ color: 'var(--color-text)' }}>
                          {lead.name}
                        </p>
                      </Link>

                      {lead.company && (
                        <div className="flex items-center gap-1 text-[10px] mb-2.5" style={{ color: 'var(--color-text3)' }}>
                          <Building2 size={9} className="shrink-0" />
                          <span className="truncate">{lead.company}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            draggable={false}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition-opacity hover:opacity-80"
                            style={{ background: `rgba(${stage.rgb},0.12)`, color: stage.color }}
                          >
                            <Phone size={8} /> Call
                          </a>
                        )}
                        {lead.next_follow_up && (
                          <div
                            className="inline-flex items-center gap-1 text-[9px] ml-auto"
                            style={{
                              color: overdueLead ? '#F87171' : dueTodayLead ? '#FBBF24' : 'var(--color-text3)',
                              fontWeight: (overdueLead || dueTodayLead) ? 600 : 400,
                            }}
                          >
                            <Calendar size={8} />
                            {fmtDate(lead.next_follow_up)}
                            {overdueLead && <span className="text-[8px]">!</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Drop zone placeholder */}
                {isDragTarget && (
                  <div
                    className="rounded-xl border-2 border-dashed flex items-center justify-center"
                    style={{
                      height: 56,
                      borderColor: stage.color,
                      background: `rgba(${stage.rgb},0.05)`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <p className="text-[9px] font-bold" style={{ color: stage.color }}>Drop here</p>
                  </div>
                )}

                {stageLeads.length === 0 && !isDragTarget && (
                  <div className="rounded-xl py-5 text-center"
                    style={{ border: `1px dashed rgba(${stage.rgb},0.12)` }}>
                    <p className="text-[9px]" style={{ color: 'var(--color-text3)' }}>Empty</p>
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
