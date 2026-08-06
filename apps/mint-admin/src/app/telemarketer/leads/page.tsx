'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Plus, Phone, ChevronDown, Loader2, X, Clock,
  MessageSquare, Calendar, FileUp, RefreshCw, Search, Check, Download, PhoneCall,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];

function ShimmerRow() {
  return (
    <tr style={{ position: 'relative' }}>
      {[36, 160, 110, 90, 90, 80, 60].map((w, i) => (
        <td key={i} style={{ padding: '10px 14px' }}>
          <motion.div
            style={{
              height: 12, width: w, borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden', position: 'relative',
            }}
          >
            <motion.div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.05 }}
            />
          </motion.div>
        </td>
      ))}
    </tr>
  );
}

type LeadStatus =
  // Current pipeline stages
  | 'New Lead' | 'Attempted Contact' | 'Contacted' | 'Interested'
  | 'Demo Scheduled' | 'Demo Completed' | 'Proposal Requested' | 'Proposal Sent'
  | 'Negotiation' | 'Won' | 'Lost' | 'Other'
  // Legacy statuses (still in DB — displayed but not offered in dropdown)
  | 'Pending' | 'Call Again' | 'Call Back' | 'Unreachable'
  | 'Demo Booked' | 'Quoted' | 'Converted' | 'Not Interested';

interface Lead {
  id: string;
  refId: string | null;
  clientName: string;
  company: string;
  phone: string;
  email: string | null;
  dateAdded: string;
  updatedAt: string;
  status: LeadStatus;
  nextFollowUp: string | null;
}

const STALE_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TERMINAL: LeadStatus[] = ['Won', 'Lost', 'Other', 'Converted', 'Not Interested'];
function isStale(lead: Lead) {
  if (!lead.updatedAt || TERMINAL.includes(lead.status)) return false;
  return Date.now() - new Date(lead.updatedAt).getTime() > STALE_DAYS_MS;
}

const STATUS_CFG: Record<LeadStatus, { bg: string; border: string; color: string }> = {
  // Pipeline stages
  'New Lead':           { bg: 'rgba(139,144,180,0.1)', border: 'rgba(139,144,180,0.2)', color: '#8B90B4' },
  'Attempted Contact':  { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', color: '#9CA3AF' },
  'Contacted':          { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  color: '#60A5FA' },
  'Interested':         { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', color: '#A78BFA' },
  'Demo Scheduled':     { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  color: '#34D399' },
  'Demo Completed':     { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  color: '#10B981' },
  'Proposal Requested': { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)',  color: '#FBBF24' },
  'Proposal Sent':      { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)',  color: '#FB923C' },
  'Negotiation':        { bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)', color: '#F472B6' },
  'Won':                { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', color: '#34D399' },
  'Lost':               { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', color: '#F87171' },
  'Other':              { bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.15)',color: '#6B7280' },
  // Legacy — still in DB, shown if present
  'Pending':        { bg: 'rgba(139,144,180,0.1)', border: 'rgba(139,144,180,0.2)', color: '#8B90B4' },
  'Call Again':     { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  color: '#60A5FA' },
  'Call Back':      { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', color: '#A78BFA' },
  'Unreachable':    { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', color: '#9CA3AF' },
  'Demo Booked':    { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  color: '#34D399' },
  'Quoted':         { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  color: '#10B981' },
  'Converted':      { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', color: '#34D399' },
  'Not Interested': { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', color: '#F87171' },
};

// Only offer new pipeline stages in the dropdown — legacy values stay readable but aren't selectable
const PIPELINE_STATUSES: LeadStatus[] = [
  'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
  'Demo Scheduled', 'Demo Completed', 'Proposal Requested', 'Proposal Sent',
  'Negotiation', 'Won', 'Lost', 'Other',
];

import { getAgentId } from '@/lib/telemarketer-agent';

const ALL_STATUSES = Object.keys(STATUS_CFG) as LeadStatus[];

type SortOption = 'newest' | 'oldest' | 'name' | 'followup';

const SORT_LABELS: Record<SortOption, string> = {
  newest:  'Newest First',
  oldest:  'Oldest First',
  name:    'Name A→Z',
  followup: 'Follow-up Date',
};

const CALL_OUTCOMES = ['Answered', 'Voicemail', 'No Answer', 'Callback', 'Not Interested'] as const;

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, onChange }: { status: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CFG[status] ?? STATUS_CFG['New Lead'];

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        {status} <ChevronDown size={8} />
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          className="fixed rounded-xl overflow-hidden min-w-[180px]"
          style={{ top: pos.top, left: pos.left, zIndex: 9999, background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
        >
          {PIPELINE_STATUSES.map(s => {
            const c = STATUS_CFG[s];
            return (
              <button key={s}
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                style={{ color: s === status ? c.color : 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                {s}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── AddLeadModal ─────────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ clientName: '', company: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const agentId = await getAgentId();
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        form.clientName,
        company:     form.company,
        phone:       form.phone,
        email:       form.email,
        source:      'manual',
        assigned_to: agentId,
      }),
    });
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Add New Lead</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { key: 'clientName', label: 'Contact Name', type: 'text' },
            { key: 'company',    label: 'Company',      type: 'text' },
            { key: 'phone',      label: 'Phone',        type: 'tel' },
            { key: 'email',      label: 'Email',        type: 'email' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>{f.label}</label>
              <input
                type={f.type}
                required
                className="field-input"
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CallLogModal ─────────────────────────────────────────────────────────────

function CallLogModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [outcome, setOutcome] = useState<string>('Answered');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/telemarketer/call-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id:  lead.id,
        outcome,
        duration: duration !== '' ? Number(duration) : null,
        notes,
      }),
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-sm p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Log Call</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>

        {/* Phone number dial block */}
        <div className="rounded-xl p-4 mb-5 flex items-center justify-between gap-3"
          style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)' }}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(52,211,153,0.6)' }}>
              {lead.clientName}
            </p>
            {lead.phone
              ? <p className="text-xl font-bold font-mono tracking-wide" style={{ color: '#34D399' }}>{lead.phone}</p>
              : <p className="text-sm italic" style={{ color: 'var(--color-text3)' }}>No phone on file</p>
            }
          </div>
          {lead.phone && (
            <a href={`tel:${lead.phone}`}
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}
              title={`Call ${lead.phone}`}>
              <PhoneCall size={18} />
            </a>
          )}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Outcome</label>
            <select
              required
              className="field-input"
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
            >
              {CALL_OUTCOMES.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Duration (minutes)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="field-input"
              placeholder="e.g. 5"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes</label>
            <textarea
              className="field-input resize-none"
              rows={3}
              placeholder="What was discussed…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
              {saving ? 'Saving…' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DemoModal ────────────────────────────────────────────────────────────────

function DemoModal({ lead, onClose, onBooked }: { lead: Lead; onClose: () => void; onBooked: () => void }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDt = tomorrow.toISOString().slice(0, 16);
  const [dt,    setDt]    = useState(defaultDt);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await Promise.all([
      fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tm_status: 'Demo Scheduled' }),
      }),
      fetch('/api/telemarketer/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, follow_up_type: 'Demo Booked', scheduled_at: dt, note: notes || 'Demo scheduled' }),
      }),
    ]);
    setSaving(false);
    onBooked();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-sm p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Book Demo</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--color-text3)' }}>
          {lead.clientName} &middot; {lead.company}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Demo date &amp; time</label>
            <input type="datetime-local" required className="field-input" value={dt} onChange={e => setDt(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes (optional)</label>
            <textarea className="field-input resize-none" rows={2} placeholder="What to cover in the demo…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <p className="text-[10px]" style={{ color: 'var(--color-text3)', opacity: 0.7 }}>
            Lead status will be set to <strong>Demo Scheduled</strong> and a follow-up will be created.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
              {saving ? 'Booking…' : 'Book Demo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapLead(raw: Record<string, string>): Lead {
  return {
    id:           raw.id,
    refId:        raw.ref_id        ?? null,
    clientName:   raw.name,
    company:      raw.company   ?? '',
    phone:        raw.phone     ?? '',
    email:        raw.email     ?? '',
    dateAdded:    raw.created_at ?? raw.dateAdded ?? '',
    status:       (raw.tm_status as LeadStatus) || 'Pending',
    nextFollowUp: raw.next_follow_up ?? null,
    updatedAt:    raw.updated_at     ?? '',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TelemarketerLeadsPage() {
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);

  // Search + sort
  const [search,   setSearch]   = useState('');
  const [sortBy,   setSortBy]   = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving,  setBulkSaving]  = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Quick call log
  const [callLogLead, setCallLogLead] = useState<Lead | null>(null);

  // Demo booking
  const [demoLead, setDemoLead] = useState<Lead | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const agentId = await getAgentId();
    const res = await fetch(`/api/leads?assigned_to=${agentId}`);
    if (res.ok) {
      const { leads: raw } = await res.json();
      setLeads((raw ?? []).map(mapLead));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ID', 'Name', 'Company', 'Phone', 'Email', 'TM Status', 'Date Added', 'Next Follow-Up'],
      ...leads.map(l => [
        l.id, l.clientName, l.company, l.phone ?? '', l.email ?? '',
        l.status, l.dateAdded, l.nextFollowUp ?? '',
      ]),
    ].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `my-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Status update ───────────────────────────────────────────────────────────

  async function updateStatus(id: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tm_status: status }),
    });
    const autoOutcome =
      status === 'Contacted'         ? 'Spoke'     :
      status === 'Attempted Contact' ? 'No Answer' : null;
    if (autoOutcome) {
      const agentId = await getAgentId();
      if (agentId) {
        fetch('/api/telemarketer/call-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: id, agent_id: agentId, outcome: autoOutcome }),
        });
      }
    }
  }

  // ── Filtered + sorted view ──────────────────────────────────────────────────

  const displayed = useMemo(() => {
    let result = leads;

    // 1. Status filter
    if (filterStatus) result = result.filter(l => l.status === filterStatus);

    // 2. Search filter (name, company, phone)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(l =>
        (l.refId?.toLowerCase().includes(q) ?? false) ||
        l.clientName.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q)
      );
    }

    // 3. Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        case 'name':
          return a.clientName.localeCompare(b.clientName);
        case 'followup': {
          if (!a.nextFollowUp && !b.nextFollowUp) return 0;
          if (!a.nextFollowUp) return 1;
          if (!b.nextFollowUp) return -1;
          return new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime();
        }
        default: // newest
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });
  }, [leads, filterStatus, search, sortBy]);

  // ── Checkbox state ──────────────────────────────────────────────────────────

  const allSelected  = displayed.length > 0 && displayed.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  // Drive the native indeterminate property
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map(l => l.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Bulk mark contacted ─────────────────────────────────────────────────────

  async function bulkMarkContacted() {
    setBulkSaving(true);
    const ids = [...selectedIds];
    await Promise.all(ids.map(id =>
      fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tm_status: 'Contacted' }),
      })
    ));
    setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status: 'Contacted' as LeadStatus } : l));
    setSelectedIds(new Set());
    setBulkSaving(false);
  }

  // ── Status counts for filter strip ──────────────────────────────────────────

  const counts = leads.reduce<Partial<Record<LeadStatus, number>>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 page-enter">
      {addOpen      && <AddLeadModal onClose={() => setAddOpen(false)} onAdded={load} />}
      {callLogLead  && <CallLogModal lead={callLogLead} onClose={() => setCallLogLead(null)} />}
      {demoLead     && <DemoModal lead={demoLead} onClose={() => setDemoLead(null)} onBooked={load} />}

      {/* Floating bulk action toolbar */}
      <AnimatePresence>
      {someSelected && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{    opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
          }}
        >
          <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--color-border2)', flexShrink: 0 }} />
          <button
            onClick={bulkMarkContacted}
            disabled={bulkSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            {bulkSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Mark as Contacted
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center px-1.5 py-1.5 rounded-xl text-xs transition-all"
            style={{ color: 'var(--color-text3)' }}
            title="Clear selection"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        className="flex items-start justify-between gap-4 flex-wrap"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}>
        <div>
          <p className="eyebrow mb-1">Sales pipeline</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>My Leads</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
            {loading ? 'Loading…' : `${leads.length} leads total · ${leads.filter(l => l.status === 'Won' || l.status === 'Converted').length} won`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </motion.div>

      {/* Status filter strip */}
      <motion.div className="flex gap-2 flex-wrap"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.12, ease: EASE }}>
        <button
          onClick={() => setFilterStatus(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={filterStatus === null
            ? { background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.3)' }
            : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
        >
          All ({leads.length})
        </button>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CFG[s];
          const count = counts[s] ?? 0;
          if (count === 0) return null;
          return (
            <button key={s}
              onClick={() => setFilterStatus(prev => prev === s ? null : s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filterStatus === s
                ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
            >
              {s} ({count})
            </button>
          );
        })}
      </motion.div>

      {/* Search + sort controls */}
      {!loading && leads.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
            <input
              type="text"
              placeholder="Search by name, company, or phone…"
              className="field-input"
              style={{ paddingLeft: 32 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text3)' }}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)', background: 'var(--color-surface2)' }}
            >
              <span className="text-xs">{SORT_LABELS[sortBy]}</span>
              <ChevronDown size={13} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden min-w-[160px]"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
                >
                  {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setSortOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                      style={{ color: sortBy === key ? 'var(--color-violet)' : 'var(--color-text2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: sortBy === key ? 'var(--color-violet)' : 'transparent' }}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading state — shimmer table skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div key="leads-shimmer" className="bento-card overflow-hidden p-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            <div className="overflow-x-auto">
              <table className="data-table">
                <tbody>{[0,1,2,3,4,5,6].map(i => <ShimmerRow key={i} />)}</tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty: no leads at all */}
      {!loading && leads.length === 0 && (
        <div className="bento-card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            No leads assigned to this agent yet. Ask your admin to assign leads from the Leads page.
          </p>
        </div>
      )}

      {/* Empty: leads exist but nothing matches current filters/search */}
      {!loading && leads.length > 0 && displayed.length === 0 && (
        <div className="bento-card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            No leads match your current filters.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && leads.length > 0 && displayed.length > 0 && (
        <div className="bento-card overflow-hidden p-0">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text3)' }}>
              {displayed.length} lead{displayed.length !== 1 ? 's' : ''}
              {filterStatus ? ` · ${filterStatus}` : search.trim() ? ` matching “${search.trim()}”` : ' · all statuses'}
            </p>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus(null)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: STATUS_CFG[filterStatus].bg, color: STATUS_CFG[filterStatus].color, border: `1px solid ${STATUS_CFG[filterStatus].border}` }}
              >
                <X size={8} /> clear filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                      style={{ accentColor: 'var(--color-violet)' }}
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Date Added</th>
                  <th>Status</th>
                  <th>Next Follow-Up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((lead, rowIdx) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(rowIdx * 0.04, 0.6), ease: EASE }}
                    style={selectedIds.has(lead.id) ? { background: 'rgba(124,58,237,0.04)' } : undefined}
                  >
                    <td style={{ paddingLeft: 16 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        className="w-3.5 h-3.5 rounded cursor-pointer"
                        style={{ accentColor: 'var(--color-violet)' }}
                      />
                    </td>
                    <td>
                      <Link href={`/telemarketer/leads/${lead.id}`} className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                          {lead.clientName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold group-hover:text-[var(--color-violet)] transition-colors" style={{ color: 'var(--color-text)' }}>{lead.clientName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{lead.company}</p>
                          {isStale(lead) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                              style={{ background: 'rgba(251,146,60,0.12)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.2)' }}>
                              Stale
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      {lead.phone
                        ? <a href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1.5 font-mono font-semibold transition-colors"
                            style={{ color: '#34D399', fontSize: 12 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          >
                            <Phone size={11} /> {lead.phone}
                          </a>
                        : <span className="text-xs italic" style={{ color: 'var(--color-text3)', opacity: 0.4 }}>—</span>
                      }
                    </td>
                    <td>
                      {lead.email
                        ? <a href={`mailto:${lead.email}`} className="text-xs transition-colors"
                            style={{ color: 'var(--color-text3)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                          >
                            {lead.email}
                          </a>
                        : <span className="text-xs" style={{ color: 'var(--color-text3)', opacity: 0.4, fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(lead.dateAdded).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} onChange={s => updateStatus(lead.id, s)} />
                    </td>
                    <td>
                      {lead.nextFollowUp ? (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>
                          <Clock size={10} />
                          {new Date(lead.nextFollowUp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text3)', opacity: 0.4 }}>&mdash;</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCallLogLead(lead)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}
                          title="Log call"
                        >
                          <Phone size={10} /> Call
                        </button>
                        <Link href={`/telemarketer/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}
                          title="View detail"
                        >
                          <MessageSquare size={10} /> Notes
                        </Link>
                        <button
                          onClick={() => setDemoLead(lead)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}
                          title="Book demo"
                        >
                          <Calendar size={10} /> Demo
                        </button>
                        <Link href={`/telemarketer/documents?lead=${lead.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.15)' }}
                          title="Upload docs"
                        >
                          <FileUp size={10} />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
