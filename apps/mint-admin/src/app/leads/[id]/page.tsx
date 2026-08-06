'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import {
  ChevronLeft, Building2, Phone, Mail, MessageSquare, Calendar,
  Video, FileText, Loader2, Pencil, Trash2, UserPlus, FileText as QuoteIcon,
  Banknote, Percent, Users, MapPin, Briefcase, Globe, X, ChevronDown,
  RefreshCw,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'other';

interface LeadData {
  id: string; ref_id: string | null;
  name: string; company: string; phone: string | null; email: string | null;
  message: string | null; source: string | null; status: AdminStatus;
  tm_status: string | null; assigned_to: string | null; created_at: string;
  // Qualification
  trading_name?: string | null; contact_person?: string | null; position?: string | null;
  website?: string | null; industry?: string | null; province?: string | null;
  existing_platform?: string | null; num_branches?: number | null; num_employees?: number | null;
  monthly_applications?: number | null; monthly_volume?: number | null; pain_points?: string | null;
  interest_marketplace?: boolean; interest_white_label?: boolean; interest_debicheck?: boolean;
  interest_credit_life?: boolean; interest_collections?: boolean; interest_compliance?: boolean;
  interest_open_banking?: boolean; potential_setup_fee?: number | null;
  potential_monthly_sub?: number | null; estimated_deal_value?: number | null;
  estimated_annual_revenue?: number | null; expected_close_date?: string | null;
  deal_probability?: number | null;
}

interface Note      { id: string; content: string; agent_id: string; created_at: string }
interface CallLog   { id: string; outcome: string; duration: string | null; notes: string | null; called_at: string }
interface FollowUp  { id: string; follow_up_type: string; scheduled_at: string; note: string | null; completed: boolean }
interface Demo      { id: string; demo_date: string; demo_time: string | null; platform: string | null; presenter: string | null; meeting_link: string | null; status: string; notes: string | null }
interface Proposal  { id: string; title: string; amount_cents: number | null; status: string; notes: string | null; sent_at: string | null; created_at: string }
interface Agent     { id: string; name: string }

type TEvent = {
  id: string; sortDate: Date; timestamp: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  title: string; body?: string; sub?: string;
  badge?: { label: string; bg: string; color: string };
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_STATUS_CFG: Record<AdminStatus, { label: string; bg: string; color: string; border: string }> = {
  new:       { label: 'New',       bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', border: 'rgba(251,191,36,0.25)'  },
  contacted: { label: 'Contacted', bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', border: 'rgba(96,165,250,0.25)'  },
  qualified: { label: 'Qualified', bg: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)', border: 'rgba(124,58,237,0.3)' },
  won:       { label: 'Won',       bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.25)'  },
  lost:      { label: 'Lost',      bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.25)' },
  other:     { label: 'Other',     bg: 'rgba(156,163,175,0.1)', color: '#9CA3AF', border: 'rgba(156,163,175,0.25)' },
};

const TM_STATUS_COLORS: Record<string, string> = {
  'New Lead': '#8B90B4', 'Attempted Contact': '#9CA3AF', 'Contacted': '#60A5FA',
  'Interested': '#A78BFA', 'Demo Scheduled': '#34D399', 'Demo Completed': '#10B981',
  'Proposal Requested': '#FBBF24', 'Proposal Sent': '#FB923C', 'Negotiation': '#F472B6',
  'Won': '#34D399', 'Lost': '#F87171', 'Other': '#6B7280', 'Not Qualified': '#6B7280',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtD(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ lead, onClose, onSaved }: {
  lead: LeadData;
  onClose: () => void;
  onSaved: (patch: Partial<LeadData>) => void;
}) {
  const [form, setForm] = useState({
    name: lead.name, company: lead.company,
    email: lead.email ?? '', phone: lead.phone ?? '', message: lead.message ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, company: form.company,
        email: form.email || null, phone: form.phone || null, message: form.message || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({ name: form.name, company: form.company, email: form.email || null, phone: form.phone || null, message: form.message || null });
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Edit lead</h2>
          <button onClick={onClose} style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: 'Name',    key: 'name'    as const, type: 'text',  required: true  },
            { label: 'Company', key: 'company' as const, type: 'text',  required: true  },
            { label: 'Email',   key: 'email'   as const, type: 'email', required: false },
            { label: 'Phone',   key: 'phone'   as const, type: 'tel',   required: false },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>{label}</label>
              <input type={type} required={required} className="field-input"
                value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Message</label>
            <textarea className="field-input" rows={3} value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onClose, onConfirm, deleting }: {
  name: string; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(248,113,113,0.12)' }}>
          <Trash2 size={20} style={{ color: '#F87171' }} />
        </div>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Delete lead?</h3>
        <p className="text-xs mb-5" style={{ color: 'var(--color-text3)' }}>
          <span className="font-medium" style={{ color: 'var(--color-text2)' }}>{name}</span> and all associated activity will be permanently removed.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [lead,      setLead]      = useState<LeadData | null>(null);
  const [notes,     setNotes]     = useState<Note[]>([]);
  const [callLogs,  setCallLogs]  = useState<CallLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [demos,     setDemos]     = useState<Demo[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [agents,    setAgents]    = useState<Agent[]>([]);

  const [loading,   setLoading]   = useState(true);
  const [editOpen,  setEditOpen]  = useState(false);
  const [deleteOpen,setDeleteOpen]= useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [assignOpen,setAssignOpen]= useState(false);
  const [statusOpen,setStatusOpen]= useState(false);
  const [refreshing,setRefreshing]= useState(false);

  const loadActivity = useCallback(async () => {
    const [notesRes, callsRes, fuRes, demosRes, propsRes] = await Promise.all([
      fetch(`/api/telemarketer/notes?lead_id=${id}`).then(r => r.json()),
      fetch(`/api/telemarketer/call-logs?lead_id=${id}`).then(r => r.json()),
      fetch(`/api/telemarketer/follow-ups?lead_id=${id}`).then(r => r.json()),
      fetch(`/api/telemarketer/demos?lead_id=${id}`).then(r => r.ok ? r.json() : { demos: [] }),
      fetch(`/api/telemarketer/proposals?lead_id=${id}`).then(r => r.ok ? r.json() : { proposals: [] }),
    ]);
    setNotes(notesRes.notes ?? []);
    setCallLogs(callsRes.call_logs ?? []);
    setFollowUps(fuRes.follow_ups ?? []);
    setDemos(demosRes.demos ?? []);
    setProposals(propsRes.proposals ?? []);
  }, [id]);

  useEffect(() => {
    async function init() {
      const [leadRes, agentsRes] = await Promise.all([
        fetch(`/api/leads/${id}`).then(r => r.json()),
        fetch('/api/telemarketer/agents').then(r => r.json()),
      ]);
      if (leadRes.lead) setLead(leadRes.lead as LeadData);
      setAgents(agentsRes.users ?? []);
      await loadActivity();
      setLoading(false);
    }
    init();
  }, [id, loadActivity]);

  const timeline = useMemo((): TEvent[] => {
    const events: TEvent[] = [];

    for (const n of notes) {
      events.push({
        id: `note-${n.id}`, sortDate: new Date(n.created_at),
        timestamp: fmtDT(n.created_at),
        icon: <MessageSquare size={13} />,
        iconBg: 'rgba(124,58,237,0.14)', iconColor: 'var(--color-violet)',
        title: 'Note', body: n.content,
      });
    }
    for (const c of callLogs) {
      const spoke = c.outcome === 'Spoke';
      events.push({
        id: `call-${c.id}`, sortDate: new Date(c.called_at),
        timestamp: fmtDT(c.called_at),
        icon: <Phone size={13} />,
        iconBg: spoke ? 'rgba(52,211,153,0.14)' : 'rgba(248,113,113,0.14)',
        iconColor: spoke ? '#34D399' : '#F87171',
        title: `Call — ${c.outcome}`,
        body: c.notes ?? undefined,
        sub: c.duration ? `Duration: ${c.duration}` : undefined,
        badge: { label: c.outcome, bg: spoke ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: spoke ? '#34D399' : '#F87171' },
      });
    }
    for (const f of followUps) {
      events.push({
        id: `fu-${f.id}`, sortDate: new Date(f.scheduled_at),
        timestamp: fmtD(f.scheduled_at),
        icon: <Calendar size={13} />,
        iconBg: 'rgba(96,165,250,0.14)', iconColor: '#60A5FA',
        title: `Follow-Up — ${f.follow_up_type}`,
        body: f.note ?? undefined,
        badge: f.completed
          ? { label: 'Done',     bg: 'rgba(52,211,153,0.1)', color: '#34D399' }
          : { label: 'Upcoming', bg: 'rgba(96,165,250,0.1)', color: '#60A5FA' },
      });
    }
    for (const d of demos) {
      const demoTime = d.demo_time ? ` at ${d.demo_time.slice(0, 5)}` : '';
      events.push({
        id: `demo-${d.id}`, sortDate: new Date(d.demo_date),
        timestamp: fmtD(d.demo_date) + demoTime,
        icon: <Video size={13} />,
        iconBg: 'rgba(244,114,182,0.14)', iconColor: '#F472B6',
        title: `Demo${d.platform ? ` — ${d.platform}` : ''}`,
        body: d.notes ?? undefined,
        sub: d.presenter ? `Presenter: ${d.presenter}` : undefined,
        badge: {
          label: d.status,
          bg:    d.status === 'Completed' ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)',
          color: d.status === 'Completed' ? '#34D399' : '#60A5FA',
        },
      });
    }
    for (const p of proposals) {
      events.push({
        id: `prop-${p.id}`, sortDate: new Date(p.sent_at ?? p.created_at),
        timestamp: fmtD(p.sent_at ?? p.created_at),
        icon: <FileText size={13} />,
        iconBg: 'rgba(251,146,60,0.14)', iconColor: '#FB923C',
        title: p.title,
        body: p.notes ?? undefined,
        sub: p.amount_cents != null
          ? `R ${(p.amount_cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
          : undefined,
        badge: { label: p.status, bg: 'rgba(251,146,60,0.1)', color: '#FB923C' },
      });
    }

    return events.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [notes, callLogs, followUps, demos, proposals]);

  async function changeAdminStatus(s: AdminStatus) {
    setStatusOpen(false);
    setLead(l => l ? { ...l, status: s } : l);
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    });
  }

  async function reassign(agentId: string | null) {
    setAssignOpen(false);
    setLead(l => l ? { ...l, assigned_to: agentId } : l);
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: agentId }),
    });
  }

  async function deleteLead() {
    setDeleting(true);
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    router.push('/leads');
  }

  function createQuote() {
    if (!lead) return;
    sessionStorage.setItem('new_quote_prefill', JSON.stringify({
      client: lead.company, contact: lead.name, email: lead.email,
    }));
    router.push('/quotes?new=1');
  }

  async function refresh() {
    setRefreshing(true);
    const [leadRes] = await Promise.all([
      fetch(`/api/leads/${id}`).then(r => r.json()),
      loadActivity(),
    ]);
    if (leadRes.lead) setLead(leadRes.lead as LeadData);
    setRefreshing(false);
  }

  const assignedAgent = agents.find(a => a.id === lead?.assigned_to);
  const adminCfg = lead ? ADMIN_STATUS_CFG[lead.status] : null;
  const tmColor  = lead?.tm_status ? (TM_STATUS_COLORS[lead.tm_status] ?? '#9CA3AF') : null;

  if (loading) {
    return (
      <Shell>
        <div className="space-y-6">
          {/* back bar */}
          <div className="flex items-center justify-between">
            <div className="skeleton-pulse h-3 w-20 rounded" />
            <div className="skeleton-pulse h-7 w-20 rounded-lg" />
          </div>
          {/* header card */}
          <div className="bento-card p-6">
            <div className="flex items-start gap-4">
              <div className="skeleton-pulse w-14 h-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-pulse h-5 w-48 rounded" />
                <div className="flex gap-3">
                  <div className="skeleton-pulse h-3 w-32 rounded" />
                  <div className="skeleton-pulse h-3 w-28 rounded" />
                </div>
                <div className="flex gap-2 mt-1">
                  <div className="skeleton-pulse h-5 w-20 rounded-full" />
                  <div className="skeleton-pulse h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          {/* body */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="bento-card p-6 space-y-4">
              <div className="skeleton-pulse h-4 w-40 rounded" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="skeleton-pulse w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="skeleton-pulse h-3 w-32 rounded" />
                    <div className="skeleton-pulse h-3 w-full rounded" />
                    <div className="skeleton-pulse h-3 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="bento-card p-5 space-y-3">
                <div className="skeleton-pulse h-4 w-24 rounded" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="skeleton-pulse h-3 w-16 rounded" />
                    <div className="skeleton-pulse h-3 w-24 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (!lead) {
    return (
      <Shell>
        <div className="bento-card p-12 text-center">
          <p className="text-sm mb-2" style={{ color: 'var(--color-text3)' }}>Lead not found.</p>
          <Link href="/leads" className="text-xs" style={{ color: 'var(--color-violet)' }}>← All Leads</Link>
        </div>
      </Shell>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Shell>
      {editOpen   && <EditModal lead={lead} onClose={() => setEditOpen(false)} onSaved={p => setLead(l => l ? { ...l, ...p } : l)} />}
      {deleteOpen && <DeleteConfirm name={lead.name} onClose={() => setDeleteOpen(false)} onConfirm={deleteLead} deleting={deleting} />}

      <div className="space-y-6 page-enter">

        {/* ── Back + refresh ── */}
        <div className="flex items-center justify-between">
          <Link href="/leads"
            className="inline-flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
            <ChevronLeft size={13} /> All Leads
          </Link>
          <button onClick={refresh} disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* ── Header card ── */}
        <div className="bento-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">

            {/* Left: identity */}
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
                {initials(lead.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>{lead.name}</h1>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded select-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
                    {lead.ref_id ?? `#${id.slice(0, 8)}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap text-sm" style={{ color: 'var(--color-text3)' }}>
                  <span className="inline-flex items-center gap-1.5"><Building2 size={11} />{lead.company}</span>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 transition-colors"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#34D399'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
                      <Phone size={11} />{lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 transition-colors"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
                      <Mail size={11} />{lead.email}
                    </a>
                  )}
                </div>

                {/* Qual chips */}
                {(() => {
                  const chips = [
                    lead.industry         && { icon: Briefcase, label: lead.industry,                                                         color: '#FBBF24' },
                    lead.province         && { icon: MapPin,    label: lead.province,                                                         color: '#60A5FA' },
                    lead.website          && { icon: Globe,     label: lead.website.replace(/^https?:\/\//, ''),                              color: '#A78BFA' },
                    lead.num_employees    != null && { icon: Users,     label: `${lead.num_employees} employees`,                            color: '#A78BFA' },
                    lead.deal_probability != null && { icon: Percent,   label: `${lead.deal_probability}% probability`,                     color: '#34D399' },
                    lead.estimated_deal_value != null && { icon: Banknote, label: `R ${lead.estimated_deal_value.toLocaleString('en-ZA')}`, color: '#34D399' },
                  ].filter(Boolean) as { icon: React.ComponentType<{ size?: number }>; label: string; color: string }[];
                  if (!chips.length) return null;
                  return (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {chips.map((chip, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: `${chip.color}14`, color: chip.color, border: `1px solid ${chip.color}28` }}>
                          <chip.icon size={9} />{chip.label}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right: status + actions */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* TM pipeline status — read-only */}
              {lead.tm_status && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ background: `${tmColor}14`, color: tmColor ?? '#9CA3AF', border: `1px solid ${tmColor}28` }}>
                  TM: {lead.tm_status}
                </span>
              )}

              {/* Assigned agent */}
              <div className="relative">
                <button onClick={() => setAssignOpen(o => !o)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text2)', border: '1px solid var(--color-border2)' }}>
                  <UserPlus size={11} />
                  {assignedAgent ? assignedAgent.name : 'Unassigned'}
                  <ChevronDown size={10} />
                </button>
                {assignOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAssignOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden min-w-[160px]"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
                      <button onClick={() => reassign(null)}
                        className="w-full text-left px-3 py-2 text-xs transition-colors"
                        style={{ color: !lead.assigned_to ? 'var(--color-violet)' : 'var(--color-text3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        Unassigned
                      </button>
                      {agents.map(a => (
                        <button key={a.id} onClick={() => reassign(a.id)}
                          className="w-full text-left px-3 py-2 text-xs transition-colors"
                          style={{ color: a.id === lead.assigned_to ? 'var(--color-violet)' : 'var(--color-text2)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Admin status */}
              {adminCfg && (
                <div className="relative">
                  <button onClick={() => setStatusOpen(o => !o)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
                    style={{ background: adminCfg.bg, color: adminCfg.color, border: `1px solid ${adminCfg.border}` }}>
                    {adminCfg.label} <ChevronDown size={10} />
                  </button>
                  {statusOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden min-w-[140px]"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
                        {(Object.entries(ADMIN_STATUS_CFG) as [AdminStatus, typeof ADMIN_STATUS_CFG[AdminStatus]][]).map(([s, c]) => (
                          <button key={s} onClick={() => changeAdminStatus(s)}
                            className="w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{ color: s === lead.status ? c.color : 'var(--color-text2)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: c.color }} />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <button onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.15)' }}>
                <Pencil size={11} /> Edit
              </button>

              <button onClick={createQuote}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
                <QuoteIcon size={11} /> Quote
              </button>

              <button onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.15)' }}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>

          {/* Message / initial note */}
          {lead.message && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm italic"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text2)', borderLeft: '2px solid var(--color-border2)' }}>
              {lead.message}
            </div>
          )}
        </div>

        {/* ── Two-column: timeline + qual ── */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* Activity timeline */}
          <div className="bento-card p-6">
            <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--color-text)' }}>
              Activity Timeline
              <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text3)' }}>
                {timeline.length} events
              </span>
            </h2>

            {timeline.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No activity yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text3)', opacity: 0.6 }}>TM notes, calls & follow-ups will appear here</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ background: 'var(--color-border2)' }} />
                <div className="space-y-5">
                  {timeline.map((ev, idx) => (
                    <div key={ev.id} className="flex gap-4"
                      style={{ animation: 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(idx * 50, 400)}ms` }}>
                      <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: ev.iconBg, color: ev.iconColor, border: '1px solid rgba(255,255,255,0.06)' }}>
                        {ev.icon}
                      </div>
                      <div className="min-w-0 pt-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{ev.title}</span>
                          {ev.badge && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: ev.badge.bg, color: ev.badge.color }}>
                              {ev.badge.label}
                            </span>
                          )}
                          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text3)' }}>{ev.timestamp}</span>
                        </div>
                        {ev.body && (
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text2)' }}>{ev.body}</p>
                        )}
                        {ev.sub && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{ev.sub}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Qualification sidebar */}
          <div className="space-y-4">
            <div className="bento-card p-5">
              <h3 className="text-xs font-bold mb-4" style={{ color: 'var(--color-text)' }}>Lead Info</h3>
              <div className="space-y-3">
                {[
                  { label: 'Source',   value: lead.source ?? '—' },
                  { label: 'Created',  value: new Date(lead.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'Assigned', value: assignedAgent?.name ?? 'Unassigned' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{label}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text2)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Qualification data */}
            {(lead.industry || lead.province || lead.num_employees || lead.pain_points || lead.estimated_deal_value) && (
              <div className="bento-card p-5">
                <h3 className="text-xs font-bold mb-4" style={{ color: 'var(--color-text)' }}>Qualification</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Industry',         value: lead.industry },
                    { label: 'Province',         value: lead.province },
                    { label: 'Trading Name',     value: lead.trading_name },
                    { label: 'Contact Person',   value: lead.contact_person },
                    { label: 'Position',         value: lead.position },
                    { label: 'Website',          value: lead.website },
                    { label: 'Existing Platform',value: lead.existing_platform },
                    { label: 'Branches',         value: lead.num_branches != null ? String(lead.num_branches) : null },
                    { label: 'Employees',        value: lead.num_employees != null ? String(lead.num_employees) : null },
                    { label: 'Monthly Apps',     value: lead.monthly_applications != null ? String(lead.monthly_applications) : null },
                    { label: 'Deal Probability', value: lead.deal_probability != null ? `${lead.deal_probability}%` : null },
                    { label: 'Est. Deal Value',  value: lead.estimated_deal_value != null ? `R ${lead.estimated_deal_value.toLocaleString('en-ZA')}` : null },
                    { label: 'Close Date',       value: lead.expected_close_date ? fmtD(lead.expected_close_date) : null },
                  ].filter(r => r.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text3)' }}>{label}</span>
                      <span className="text-[10px] font-medium text-right" style={{ color: 'var(--color-text2)' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Interest areas */}
                {(() => {
                  const interests = [
                    lead.interest_marketplace  && 'Marketplace',
                    lead.interest_white_label  && 'White Label',
                    lead.interest_debicheck    && 'DebiCheck',
                    lead.interest_credit_life  && 'Credit Life',
                    lead.interest_collections  && 'Collections',
                    lead.interest_compliance   && 'Compliance',
                    lead.interest_open_banking && 'Open Banking',
                  ].filter(Boolean) as string[];
                  if (!interests.length) return null;
                  return (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                      <p className="text-[10px] mb-2" style={{ color: 'var(--color-text3)' }}>Interests</p>
                      <div className="flex flex-wrap gap-1">
                        {interests.map(i => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {lead.pain_points && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
                    <p className="text-[10px] mb-1.5" style={{ color: 'var(--color-text3)' }}>Pain Points</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text2)' }}>{lead.pain_points}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
