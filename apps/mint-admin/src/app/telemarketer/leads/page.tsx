'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Filter, Plus, Phone, ChevronDown, Loader2, X, Clock,
  Mail, Building2, FileText, MessageSquare, Calendar,
  FileUp, RefreshCw,
} from 'lucide-react';

type LeadStatus =
  // Current pipeline stages
  | 'New Lead' | 'Attempted Contact' | 'Contacted' | 'Interested'
  | 'Demo Scheduled' | 'Demo Completed' | 'Proposal Requested' | 'Proposal Sent'
  | 'Negotiation' | 'Won' | 'Lost' | 'Not Qualified'
  // Legacy statuses (still in DB — displayed but not offered in dropdown)
  | 'Pending' | 'Call Again' | 'Call Back' | 'Unreachable'
  | 'Demo Booked' | 'Quoted' | 'Converted' | 'Not Interested';

interface Lead {
  id: string;
  clientName: string;
  company: string;
  phone: string;
  email: string;
  dateAdded: string;
  status: LeadStatus;
  nextFollowUp: string | null;
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
  'Not Qualified':      { bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.15)',color: '#6B7280' },
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
  'Negotiation', 'Won', 'Lost', 'Not Qualified',
];

import { SESSION_KEY_AGENT } from '@/components/TelemarketerShell';

const ALL_STATUSES = Object.keys(STATUS_CFG) as LeadStatus[];

function StatusBadge({ status, onChange }: { status: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[status];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        {status} <ChevronDown size={8} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden min-w-[180px]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
            {PIPELINE_STATUSES.map(s => {
              const c = STATUS_CFG[s];
              return (
                <button key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
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
          </div>
        </>
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ clientName: '', company: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const agentId = sessionStorage.getItem(SESSION_KEY_AGENT) ?? 'tm-1';
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

// Map a raw Supabase lead row to the telemarketer Lead shape
function mapLead(raw: Record<string, string>): Lead {
  return {
    id:           raw.id,
    clientName:   raw.name,
    company:      raw.company   ?? '',
    phone:        raw.phone     ?? '',
    email:        raw.email     ?? '',
    dateAdded:    raw.created_at ?? raw.dateAdded ?? '',
    status:       (raw.tm_status as LeadStatus) || 'Pending',
    nextFollowUp: raw.next_follow_up ?? null,
  };
}

export default function TelemarketerLeadsPage() {
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const agentId = sessionStorage.getItem(SESSION_KEY_AGENT) ?? 'tm-1';
    const res = await fetch(`/api/leads?assigned_to=${agentId}`);
    if (res.ok) {
      const { leads: raw } = await res.json();
      setLeads((raw ?? []).map(mapLead));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tm_status: status }),
    });
  }

  const filtered = filterStatus ? leads.filter(l => l.status === filterStatus) : leads;

  const counts = leads.reduce<Partial<Record<LeadStatus, number>>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 page-enter">
      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} onAdded={load} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
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
          <button onClick={() => setAddOpen(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Status filter strip */}
      <div className="flex gap-2 flex-wrap">
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
      </div>

      {/* Loading / empty state */}
      {loading && (
        <div className="bento-card p-12 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="bento-card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
            No leads assigned to this agent yet. Ask your admin to assign leads from the Leads page.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && leads.length > 0 && <div className="bento-card overflow-hidden p-0">
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text3)' }}>
            {filtered.length} lead{filtered.length !== 1 ? 's' : ''}{filterStatus ? ` · ${filterStatus}` : ' · all statuses'}
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
              {filtered.map(lead => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/telemarketer/leads/${lead.id}`} className="flex items-center gap-2.5 group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                        {lead.clientName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold group-hover:text-[var(--color-violet)] transition-colors" style={{ color: 'var(--color-text)' }}>{lead.clientName}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{lead.company}</p>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <a href={`tel:${lead.phone}`} className="text-sm flex items-center gap-1.5 transition-colors"
                      style={{ color: 'var(--color-text2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#34D399'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
                    >
                      <Phone size={11} style={{ opacity: 0.6 }} /> {lead.phone}
                    </a>
                  </td>
                  <td>
                    <a href={`mailto:${lead.email}`} className="text-xs transition-colors"
                      style={{ color: 'var(--color-text3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                    >
                      {lead.email}
                    </a>
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
                      <span className="text-xs" style={{ color: 'var(--color-text3)', opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <a href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}
                        title="Call"
                      >
                        <Phone size={10} /> Call
                      </a>
                      <Link href={`/telemarketer/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}
                        title="View detail"
                      >
                        <MessageSquare size={10} /> Notes
                      </Link>
                      <Link href={`/telemarketer/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.15)' }}
                        title="Schedule follow-up"
                      >
                        <Calendar size={10} /> Follow-up
                      </Link>
                      <Link href={`/telemarketer/documents?lead=${lead.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.15)' }}
                        title="Upload docs"
                      >
                        <FileUp size={10} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
