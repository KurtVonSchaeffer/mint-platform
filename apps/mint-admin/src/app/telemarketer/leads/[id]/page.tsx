'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone, Mail, Building2, Users, Clock, Calendar, FileUp,
  MessageSquare, ChevronLeft, ChevronDown, Plus, CheckCircle2, XCircle,
  Loader2, RefreshCw, Globe, MapPin, Briefcase, Percent, Video, Save,
  FileText, Send, Copy, Timer, PhoneOff, Banknote, Pencil, MicOff, Mic,
} from 'lucide-react';
import { getAgentId } from '@/lib/telemarketer-agent';
import { useTwilioDevice } from '@/hooks/useTwilioDevice';

type LeadStatus =
  | 'New Lead' | 'Attempted Contact' | 'Contacted' | 'Interested'
  | 'Demo Scheduled' | 'Demo Completed' | 'Proposal Requested' | 'Proposal Sent'
  | 'Negotiation' | 'Won' | 'Lost' | 'Not Interested' | 'Other'
  // Legacy values
  | 'Pending' | 'Call Again' | 'Call Back' | 'Unreachable' | 'Demo Booked' | 'Quoted' | 'Converted';

const PIPELINE_STATUSES: LeadStatus[] = [
  'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
  'Demo Scheduled', 'Demo Completed', 'Proposal Requested', 'Proposal Sent',
  'Negotiation', 'Won', 'Lost', 'Not Interested', 'Other',
];

const TIMELINE_STEPS = [
  'New Lead', 'Contacted', 'Interested', 'Demo', 'Proposal', 'Won',
];

const STATUS_TO_STEP: Record<string, number> = {
  'New Lead':           0,
  'Attempted Contact':  0,
  'Contacted':          1,
  'Call Again':         1,
  'Call Back':          1,
  'Unreachable':        0,
  'Pending':            0,
  'Interested':         2,
  'Demo Scheduled':     3,
  'Demo Completed':     3,
  'Demo Booked':        3,
  'Proposal Requested': 4,
  'Proposal Sent':      4,
  'Quoted':             4,
  'Negotiation':        4,
  'Won':                5,
  'Converted':          5,
  'Lost':               5,
  'Other':              5,
};

interface LeadNote   { id: string; content: string; agent_id: string; created_at: string }
interface CallLog    { id: string; outcome: string; duration: string | null; notes: string | null; called_at: string }
interface FollowUp   { id: string; follow_up_type: string; scheduled_at: string; note: string | null; completed: boolean }
interface Demo       { id: string; demo_date: string; demo_time: string | null; platform: string | null; presenter: string | null; meeting_link: string | null; status: string; notes: string | null }
interface Proposal   { id: string; title: string; amount_cents: number | null; status: string; notes: string | null; sent_at: string | null; expires_at: string | null; created_at: string }
interface LeadData {
  id: string; ref_id: string | null; name: string; company: string; phone: string | null; email: string; tm_status: string | null;
  // Qualification fields
  trading_name?: string | null; contact_person?: string | null; position?: string | null; website?: string | null;
  industry?: string | null; province?: string | null; existing_platform?: string | null;
  num_branches?: number | null; num_employees?: number | null;
  monthly_applications?: number | null; monthly_volume?: number | null; pain_points?: string | null;
  interest_marketplace?: boolean; interest_white_label?: boolean; interest_debicheck?: boolean;
  interest_credit_life?: boolean; interest_collections?: boolean; interest_compliance?: boolean; interest_open_banking?: boolean;
  potential_setup_fee?: number | null; potential_monthly_sub?: number | null;
  estimated_deal_value?: number | null; estimated_annual_revenue?: number | null;
  expected_close_date?: string | null; deal_probability?: number | null;
}

interface QualForm {
  trading_name: string; contact_person: string; position: string; website: string;
  industry: string; province: string; existing_platform: string;
  num_branches: string; num_employees: string; monthly_applications: string; monthly_volume: string; pain_points: string;
  interest_marketplace: boolean; interest_white_label: boolean; interest_debicheck: boolean;
  interest_credit_life: boolean; interest_collections: boolean; interest_compliance: boolean; interest_open_banking: boolean;
  potential_setup_fee: string; potential_monthly_sub: string; estimated_deal_value: string;
  estimated_annual_revenue: string; expected_close_date: string; deal_probability: string;
}

const EMPTY_QUAL: QualForm = {
  trading_name: '', contact_person: '', position: '', website: '',
  industry: '', province: '', existing_platform: '',
  num_branches: '', num_employees: '', monthly_applications: '', monthly_volume: '', pain_points: '',
  interest_marketplace: false, interest_white_label: false, interest_debicheck: false,
  interest_credit_life: false, interest_collections: false, interest_compliance: false, interest_open_banking: false,
  potential_setup_fee: '', potential_monthly_sub: '', estimated_deal_value: '',
  estimated_annual_revenue: '', expected_close_date: '', deal_probability: '',
};

const INTEREST_AREAS: { key: keyof QualForm; label: string }[] = [
  { key: 'interest_marketplace',   label: 'Marketplace'          },
  { key: 'interest_white_label',   label: 'White Label'          },
  { key: 'interest_debicheck',     label: 'DebiCheck'            },
  { key: 'interest_credit_life',   label: 'Credit Life'          },
  { key: 'interest_collections',   label: 'Collections'          },
  { key: 'interest_compliance',    label: 'Compliance Automation'},
  { key: 'interest_open_banking',  label: 'Open Banking'         },
];

const SA_PROVINCES = ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Free State','Mpumalanga','North West','Northern Cape','Limpopo'];
const INDUSTRIES   = ['Microfinance','Retail Lending','Credit Union','Commercial Bank','Insurance','Fintech','SACCO','Debt Counsellor','Other'];

// ── Timeline helpers ──────────────────────────────────────────────────────────
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtD(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

type TEvent = {
  id: string; sortDate: Date; timestamp: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  title: string; body?: string; sub?: string;
  badge?: { label: string; bg: string; color: string };
  link?: { href: string; label: string };
};

function LogCallModal({ leadId, agentId, onClose, onSaved, initialDuration }: {
  leadId: string; agentId: string; onClose: () => void; onSaved: () => void; initialDuration?: string;
}) {
  const [form, setForm]   = useState({ outcome: 'Spoke', duration: initialDuration ?? '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch('/api/telemarketer/call-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, agent_id: agentId, ...form }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Log Call</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Outcome</label>
            <select className="field-input" value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}>
              {['Spoke', 'No Answer', 'Left Voicemail', 'Number Incorrect', 'Busy', 'Called Back Later'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Duration (e.g. 3:45)</label>
            <input className="field-input" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="0:00" />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes</label>
            <textarea className="field-input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="What happened on the call?" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
            {saving ? 'Saving…' : 'Log Call'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({ leadId, agentId, onClose, onSaved }: {
  leadId: string; agentId: string; onClose: () => void; onSaved: () => void;
}) {
  const [content, setContent]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [withFollowUp, setWithFollowUp] = useState(false);
  const [fuDate, setFuDate]       = useState(() => {
    const d = new Date(Date.now() + 3 * 86400000);
    d.setUTCHours(7, 0, 0, 0); // 07:00 UTC = 09:00 SAST
    return new Date(d.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
  });

  async function submit() {
    if (!content.trim()) return;
    setSaving(true);
    await fetch('/api/telemarketer/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, agent_id: agentId, content }),
    });
    if (withFollowUp && fuDate) {
      const scheduled_at = fuDate.length === 16 ? `${fuDate}:00+02:00` : fuDate;
      await fetch('/api/telemarketer/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, agent_id: agentId, follow_up_type: 'Call Back', scheduled_at, note: content }),
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Add Note</h3>
        <textarea className="field-input w-full" rows={5} value={content} onChange={e => setContent(e.target.value)} placeholder="Add your interaction note here…" />

        {/* Follow-up toggle */}
        <button
          onClick={() => setWithFollowUp(v => !v)}
          className="flex items-center gap-2.5 mt-4 w-full text-left"
        >
          <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
            style={{
              background: withFollowUp ? 'var(--color-violet)' : 'transparent',
              border: `1.5px solid ${withFollowUp ? 'var(--color-violet)' : 'var(--color-border2)'}`,
            }}>
            {withFollowUp && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-sm" style={{ color: withFollowUp ? 'var(--color-text)' : 'var(--color-text3)' }}>
            Schedule a follow-up
          </span>
        </button>

        {withFollowUp && (
          <input
            type="datetime-local"
            className="field-input w-full mt-3"
            value={fuDate}
            onChange={e => setFuDate(e.target.value)}
          />
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button onClick={submit} disabled={saving || !content.trim() || (withFollowUp && !fuDate)}
            className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
            {saving ? 'Saving…' : withFollowUp ? 'Save & Schedule' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({ leadId, agentId, onClose, onSaved }: {
  leadId: string; agentId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm]   = useState({ follow_up_type: 'Call Back', scheduled_at: '', note: '' });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.scheduled_at) return;
    setSaving(true);
    // Append SAST offset so DB stores a proper timestamptz
    const scheduled_at = form.scheduled_at.length === 16
      ? `${form.scheduled_at}:00+02:00`
      : form.scheduled_at;
    await fetch('/api/telemarketer/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, agent_id: agentId, ...form, scheduled_at }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Schedule Follow-Up</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Type</label>
            <select className="field-input" value={form.follow_up_type} onChange={e => setForm(p => ({ ...p, follow_up_type: e.target.value }))}>
              {['Call Back', 'Demo Follow-Up', 'Send Quote', 'Follow Up Email', 'Other'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Date & Time</label>
            <input type="datetime-local" className="field-input" min={new Date(Date.now() - 60000).toISOString().slice(0, 16)} value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Note</label>
            <input className="field-input" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Optional note…" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button onClick={submit} disabled={saving || !form.scheduled_at} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
            {saving ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookDemoModal({ leadId, agentId, onClose, onSaved }: {
  leadId: string; agentId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ demo_date: '', demo_time: '', platform: 'Google Meet', presenter: '', meeting_link: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.demo_date) return;
    setSaving(true);
    await fetch('/api/telemarketer/demos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, agent_id: agentId, ...form }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Book Demo</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Date *</label>
              <input type="date" className="field-input" value={form.demo_date} onChange={e => setForm(p => ({ ...p, demo_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Time</label>
              <input type="time" className="field-input" value={form.demo_time} onChange={e => setForm(p => ({ ...p, demo_time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Platform</label>
              <select className="field-input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                {['Google Meet','Zoom','Microsoft Teams','In Person'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Presenter</label>
              <input className="field-input" value={form.presenter} onChange={e => setForm(p => ({ ...p, presenter: e.target.value }))} placeholder="Sales rep name" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Meeting Link</label>
            <input className="field-input" value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} placeholder="https://meet.google.com/..." />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes</label>
            <textarea className="field-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Agenda, preparation notes…" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
          <button onClick={submit} disabled={saving || !form.demo_date} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
            {saving ? 'Booking…' : 'Book Demo'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PROPOSAL_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Draft:    { color: '#9CA3AF', bg: 'rgba(107,114,128,0.1)' },
  Sent:     { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)'  },
  Viewed:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  Accepted: { color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  Rejected: { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  Expired:  { color: '#FB923C', bg: 'rgba(251,146,60,0.1)'  },
};

function CreateProposalModal({ leadId, agentId, onClose, onSaved }: {
  leadId: string; agentId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: '', amount: '', notes: '', expires_at: '', markSent: false,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch('/api/telemarketer/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id:      leadId,
        agent_id:     agentId,
        title:        form.title.trim(),
        amount_cents: form.amount ? Math.round(Number(form.amount) * 100) : null,
        notes:        form.notes  || null,
        expires_at:   form.expires_at || null,
        status:       form.markSent ? 'Sent' : 'Draft',
      }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Create Proposal</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Proposal Title *</label>
            <input required className="field-input" placeholder="e.g. Core Platform Proposal" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Proposed Value (R)</label>
            <input type="number" min="0" step="0.01" className="field-input" placeholder="0.00" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Expires On</label>
            <input type="date" className="field-input" value={form.expires_at}
              onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Notes</label>
            <textarea className="field-input" rows={3} placeholder="Key points, inclusions, next steps…" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.markSent} onChange={e => setForm(p => ({ ...p, markSent: e.target.checked }))} />
            <span className="text-xs" style={{ color: 'var(--color-text2)' }}>Mark as Sent (advances lead to &quot;Proposal Sent&quot;)</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving || !form.title.trim()} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : form.markSent ? <Send size={13} /> : <FileText size={13} />}
              {saving ? 'Saving…' : form.markSent ? 'Create & Send' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLeadModal({ lead, onClose, onSaved }: {
  lead: LeadData;
  onClose: () => void;
  onSaved: (updated: Partial<LeadData>) => void;
}) {
  const [form, setForm] = useState({
    name:    lead.name,
    company: lead.company,
    email:   lead.email ?? '',
    phone:   lead.phone ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    form.name.trim()    || undefined,
        company: form.company.trim() || undefined,
        email:   form.email.trim()   || null,
        phone:   form.phone.trim()   || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({
        name:    form.name.trim(),
        company: form.company.trim(),
        email:   form.email.trim() || lead.email,
        phone:   form.phone.trim() || null,
      });
      onClose();
    }
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Edit Lead</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Name *</label>
            <input required className="field-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Company *</label>
            <input required className="field-input" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Email</label>
              <input type="email" className="field-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Phone</label>
              <input type="tel" className="field-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27..." />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving || !form.name.trim() || !form.company.trim()}
              className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Message Templates ─────────────────────────────────────────────────────────
const ALGOLEND_TEMPLATES = {
  whatsapp: [
    {
      id:    'wa-initial',
      label: 'Initial Contact',
      text:  (name: string) =>
        `Hi ${name}, this is [Agent] from AlgoLend. We help lending businesses like yours streamline operations and grow their loan book with our purpose-built platform. I'd love to schedule a quick 15-minute call to learn more about your business — would you be open to that?`,
    },
    {
      id:    'wa-followup',
      label: 'Follow-Up After Demo',
      text:  (name: string) =>
        `Hi ${name}, great connecting with you earlier! I hope the AlgoLend demo gave you a clear picture of how we can support your business. Do you have any questions, or would you like to discuss next steps? Happy to set up another call at your convenience.`,
    },
    {
      id:    'wa-closing',
      label: 'Closing: Ready to Apply',
      text:  (name: string) =>
        `Hi ${name}, just following up on our recent conversation. We're ready to move your onboarding forward — the process is straightforward and our team will guide you every step of the way. Shall we proceed?`,
    },
  ],
  email: [
    {
      id:    'em-intro',
      label: 'Introduction Email',
      text:  (name: string) =>
        `Dear ${name},\n\nThank you for your interest in AlgoLend — South Africa's leading lending management platform. We work with microfinanciers, retail lenders, and financial institutions to modernise their loan origination, management, and collections processes.\n\nI would love to schedule a brief call to understand your business needs and show you how AlgoLend can help you grow with confidence.\n\nPlease reply to this email or let me know a convenient time for a quick chat.\n\nWarm regards,\n[Agent Name]\nBusiness Development | AlgoLend`,
    },
    {
      id:    'em-app-ready',
      label: 'Application Ready',
      text:  (name: string) =>
        `Dear ${name},\n\nExcellent news — we have everything we need to move your AlgoLend onboarding forward. Your application is ready for submission.\n\nKindly review the attached proposal and confirm your acceptance at your earliest convenience. Our onboarding team will be in contact within one business day to arrange your setup and training.\n\nWe look forward to welcoming you to the AlgoLend platform.\n\nWarm regards,\n[Agent Name]\nBusiness Development | AlgoLend`,
    },
  ],
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [lead,       setLead]       = useState<LeadData | null>(null);
  const [notes,      setNotes]      = useState<LeadNote[]>([]);
  const [callLogs,   setCallLogs]   = useState<CallLog[]>([]);
  const [followUps,  setFollowUps]  = useState<FollowUp[]>([]);
  const [demos,      setDemos]      = useState<Demo[]>([]);
  const [proposals,  setProposals]  = useState<Proposal[]>([]);
  const [agentId,    setAgentId]    = useState<string>('');
  const [loading,    setLoading]    = useState(true);
  const [status,     setStatus]     = useState<LeadStatus>('New Lead');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTop,  setStatusTop]  = useState(0);
  const [statusLeft, setStatusLeft] = useState(0);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const statusDropRef = useRef<HTMLDivElement>(null);
  const [logCallOpen,   setLogCallOpen]   = useState(false);
  const [addNoteOpen,   setAddNoteOpen]   = useState(false);
  const [scheduleOpen,  setScheduleOpen]  = useState(false);
  const [bookDemoOpen,  setBookDemoOpen]  = useState(false);
  const [callDuration,  setCallDuration]  = useState('');
  const [proposalOpen,    setProposalOpen]    = useState(false);
  const [editOpen,        setEditOpen]        = useState(false);
  // Qualification form
  const [qualOpen,   setQualOpen]   = useState(false);
  const [qualForm,   setQualForm]   = useState<QualForm>(EMPTY_QUAL);
  const [qualSaving, setQualSaving] = useState(false);
  const [qualSaved,  setQualSaved]  = useState(false);

  // ── Twilio ──────────────────────────────────────────────────────────────────
  const twilio = useTwilioDevice();
  const callActive = twilio.callState === 'active' || twilio.callState === 'ringing' || twilio.callState === 'connecting';

  // ── Templates ───────────────────────────────────────────────────────────────
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [copiedId,      setCopiedId]      = useState<string | null>(null);
  const [copiedLeadId,  setCopiedLeadId]  = useState(false);
  const [smsSending,    setSmsSending]    = useState<string | null>(null);
  const [waSending,     setWaSending]     = useState<string | null>(null);
  const [waResult,      setWaResult]      = useState<{ id: string; ok: boolean } | null>(null);
  const [smsResult,     setSmsResult]     = useState<{ id: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!statusOpen) return;
    function onDown(e: MouseEvent) {
      if (
        !statusBtnRef.current?.contains(e.target as Node) &&
        !statusDropRef.current?.contains(e.target as Node)
      ) {
        setStatusOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [statusOpen]);

  const loadActivity = useCallback(async () => {
    const [notesRes, callsRes, fuRes, demosRes, proposalsRes] = await Promise.all([
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
    setProposals(proposalsRes.proposals ?? []);
  }, [id]);

  const timeline = useMemo((): TEvent[] => {
    const events: TEvent[] = [];

    for (const n of notes) {
      events.push({
        id: `note-${n.id}`, sortDate: new Date(n.created_at),
        timestamp: fmtDT(n.created_at),
        icon: <MessageSquare size={14} />,
        iconBg: 'rgba(124,58,237,0.14)', iconColor: 'var(--color-violet)',
        title: 'Note added', body: n.content,
      });
    }

    for (const c of callLogs) {
      const spoke = c.outcome === 'Spoke';
      events.push({
        id: `call-${c.id}`, sortDate: new Date(c.called_at),
        timestamp: fmtDT(c.called_at),
        icon: <Phone size={14} />,
        iconBg: spoke ? 'rgba(52,211,153,0.14)' : 'rgba(248,113,113,0.14)',
        iconColor: spoke ? '#34D399' : '#F87171',
        title: `Call: ${c.outcome}`,
        body: c.notes ?? undefined,
        sub: c.duration ? `Duration: ${c.duration}` : undefined,
        badge: { label: c.outcome, bg: spoke ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: spoke ? '#34D399' : '#F87171' },
      });
    }

    for (const f of followUps) {
      events.push({
        id: `fu-${f.id}`, sortDate: new Date(f.scheduled_at),
        timestamp: f.scheduled_at?.length > 10 ? fmtDT(f.scheduled_at) : fmtD(f.scheduled_at),
        icon: <Calendar size={14} />,
        iconBg: 'rgba(96,165,250,0.14)', iconColor: '#60A5FA',
        title: `Follow-Up: ${f.follow_up_type}`,
        body: f.note ?? undefined,
        badge: f.completed
          ? { label: 'Done', bg: 'rgba(52,211,153,0.1)', color: '#34D399' }
          : { label: 'Upcoming', bg: 'rgba(96,165,250,0.1)', color: '#60A5FA' },
      });
    }

    for (const d of demos) {
      const demoTime = d.demo_time ? ` at ${d.demo_time.slice(0, 5)}` : '';
      events.push({
        id: `demo-${d.id}`, sortDate: new Date(d.demo_date),
        timestamp: fmtD(d.demo_date) + demoTime,
        icon: <Video size={14} />,
        iconBg: 'rgba(244,114,182,0.14)', iconColor: '#F472B6',
        title: `Demo${d.platform ? `: ${d.platform}` : ''}`,
        body: d.notes ?? undefined,
        sub: d.presenter ? `Presenter: ${d.presenter}` : undefined,
        badge: {
          label: d.status,
          bg: d.status === 'Completed' ? 'rgba(52,211,153,0.1)' : d.status === 'Scheduled' ? 'rgba(96,165,250,0.1)' : 'rgba(248,113,113,0.1)',
          color: d.status === 'Completed' ? '#34D399' : d.status === 'Scheduled' ? '#60A5FA' : '#F87171',
        },
        link: d.meeting_link ? { href: d.meeting_link, label: 'Join Meeting →' } : undefined,
      });
    }

    for (const p of proposals) {
      const cfg = PROPOSAL_STATUS_CFG[p.status] ?? PROPOSAL_STATUS_CFG.Draft;
      const amtStr = p.amount_cents != null
        ? `R ${(p.amount_cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
        : undefined;
      events.push({
        id: `prop-${p.id}`, sortDate: new Date(p.sent_at ?? p.created_at),
        timestamp: fmtD(p.sent_at ?? p.created_at),
        icon: <FileText size={14} />,
        iconBg: 'rgba(251,146,60,0.14)', iconColor: '#FB923C',
        title: p.title,
        body: p.notes ?? undefined,
        sub: amtStr,
        badge: { label: p.status, bg: cfg.bg, color: cfg.color },
      });
    }

    return events.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [notes, callLogs, followUps, demos, proposals]);

  async function saveQualification() {
    setQualSaving(true);
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...qualForm,
        num_branches:        qualForm.num_branches        ? Number(qualForm.num_branches)        : null,
        num_employees:       qualForm.num_employees       ? Number(qualForm.num_employees)       : null,
        monthly_applications:qualForm.monthly_applications? Number(qualForm.monthly_applications): null,
        monthly_volume:      qualForm.monthly_volume      ? Number(qualForm.monthly_volume)      : null,
        potential_setup_fee: qualForm.potential_setup_fee ? Number(qualForm.potential_setup_fee) : null,
        potential_monthly_sub:qualForm.potential_monthly_sub?Number(qualForm.potential_monthly_sub):null,
        estimated_deal_value:qualForm.estimated_deal_value?Number(qualForm.estimated_deal_value): null,
        estimated_annual_revenue:qualForm.estimated_annual_revenue?Number(qualForm.estimated_annual_revenue):null,
        deal_probability:    qualForm.deal_probability    ? Number(qualForm.deal_probability)    : null,
        expected_close_date: qualForm.expected_close_date || null,
      }),
    });
    setQualSaving(false);
    setQualSaved(true);
    setTimeout(() => setQualSaved(false), 3000);
  }

  useEffect(() => {
    async function init() {
      const [aid, leadRes] = await Promise.all([
        getAgentId(),
        fetch(`/api/leads/${id}`).then(r => r.json()),
      ]);
      setAgentId(aid);
      if (leadRes.lead) {
        const l = leadRes.lead as LeadData;
        setLead(l);
        setStatus((l.tm_status as LeadStatus) ?? 'New Lead');
        setQualForm({
          trading_name:          l.trading_name          ?? '',
          contact_person:        l.contact_person        ?? '',
          position:              l.position              ?? '',
          website:               l.website               ?? '',
          industry:              l.industry              ?? '',
          province:              l.province              ?? '',
          existing_platform:     l.existing_platform     ?? '',
          num_branches:          l.num_branches          != null ? String(l.num_branches)          : '',
          num_employees:         l.num_employees         != null ? String(l.num_employees)         : '',
          monthly_applications:  l.monthly_applications  != null ? String(l.monthly_applications)  : '',
          monthly_volume:        l.monthly_volume        != null ? String(l.monthly_volume)        : '',
          pain_points:           l.pain_points           ?? '',
          interest_marketplace:  l.interest_marketplace  ?? false,
          interest_white_label:  l.interest_white_label  ?? false,
          interest_debicheck:    l.interest_debicheck    ?? false,
          interest_credit_life:  l.interest_credit_life  ?? false,
          interest_collections:  l.interest_collections  ?? false,
          interest_compliance:   l.interest_compliance   ?? false,
          interest_open_banking: l.interest_open_banking ?? false,
          potential_setup_fee:   l.potential_setup_fee   != null ? String(l.potential_setup_fee)   : '',
          potential_monthly_sub: l.potential_monthly_sub != null ? String(l.potential_monthly_sub) : '',
          estimated_deal_value:  l.estimated_deal_value  != null ? String(l.estimated_deal_value)  : '',
          estimated_annual_revenue: l.estimated_annual_revenue != null ? String(l.estimated_annual_revenue) : '',
          expected_close_date:   l.expected_close_date   ?? '',
          deal_probability:      l.deal_probability      != null ? String(l.deal_probability)      : '',
        });
      }
      await loadActivity();
      setLoading(false);
    }
    init();
  }, [id, loadActivity]);

  async function changeStatus(s: LeadStatus) {
    setStatus(s);
    setStatusOpen(false);
    if (s === 'Call Back') setScheduleOpen(true);
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tm_status: s }),
    });
    const autoOutcome =
      s === 'Contacted'         ? 'Spoke'          :
      s === 'Attempted Contact' ? 'No Answer'      :
      s === 'Not Interested'    ? 'Not Interested' :
      s === 'Other'             ? 'No Answer'      : null;
    if (autoOutcome && agentId) {
      await fetch('/api/telemarketer/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: id, agent_id: agentId, outcome: autoOutcome }),
      });
      loadActivity();
    }
  }

  function fmtElapsed(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function startTwilioCall() {
    if (!lead?.phone) return;
    const identity = agentId.slice(0, 8); // stable short identity for Twilio
    await twilio.makeCall(lead.phone, id, agentId, identity);
  }

  function copyTemplate(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function sendSms(templateId: string, text: string) {
    if (!lead?.phone) return;
    setSmsSending(templateId);
    setSmsResult(null);
    try {
      const res = await fetch('/api/telemarketer/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.phone, body: text }),
      });
      setSmsResult({ id: templateId, ok: res.ok });
    } catch {
      setSmsResult({ id: templateId, ok: false });
    } finally {
      setSmsSending(null);
      setTimeout(() => setSmsResult(null), 3000);
    }
  }

  async function sendWhatsApp(templateId: string, text: string) {
    if (!lead?.phone) return;
    setWaSending(templateId);
    setWaResult(null);
    try {
      const res = await fetch('/api/telemarketer/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.phone, body: text }),
      });
      setWaResult({ id: templateId, ok: res.ok });
    } catch {
      setWaResult({ id: templateId, ok: false });
    } finally {
      setWaSending(null);
      setTimeout(() => setWaResult(null), 3000);
    }
  }

  function waLink(text: string): string {
    if (!lead?.phone) return '#';
    let phone = lead.phone.replace(/\s+/g, '');
    if (phone.startsWith('+')) phone = phone.slice(1);
    else if (phone.startsWith('0')) phone = `27${phone.slice(1)}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  const isNegativeOutcome = status === 'Lost' || status === 'Not Interested';

  // For negative outcomes, derive the actual highest stage reached from activity data
  // rather than using STATUS_TO_STEP['Lost'] = 5 which falsely marks all stages green
  const currentStep = isNegativeOutcome
    ? (() => {
        if (proposals.length > 0) return 4;
        if (demos.length > 0)     return 3;
        if (callLogs.some(c => c.outcome === 'Spoke' || c.outcome === 'Interested')) return 1;
        if (callLogs.length > 0)  return 1;
        return 0;
      })()
    : (STATUS_TO_STEP[status] ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="bento-card p-12 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Lead not found.</p>
        <Link href="/telemarketer/leads" className="text-xs mt-2 inline-block" style={{ color: 'var(--color-violet)' }}>← Back to My Leads</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {logCallOpen  && <LogCallModal  leadId={id} agentId={agentId} onClose={() => { setLogCallOpen(false); setCallDuration(''); }}  onSaved={loadActivity} initialDuration={callDuration} />}
      {addNoteOpen  && <AddNoteModal  leadId={id} agentId={agentId} onClose={() => setAddNoteOpen(false)}  onSaved={loadActivity} />}
      {scheduleOpen && <ScheduleModal leadId={id} agentId={agentId} onClose={() => setScheduleOpen(false)} onSaved={loadActivity} />}
      {bookDemoOpen   && <BookDemoModal      leadId={id} agentId={agentId} onClose={() => setBookDemoOpen(false)}   onSaved={loadActivity} />}
      {proposalOpen   && <CreateProposalModal leadId={id} agentId={agentId} onClose={() => setProposalOpen(false)}   onSaved={loadActivity} />}
      {editOpen       && <EditLeadModal lead={lead} onClose={() => setEditOpen(false)} onSaved={updated => setLead(l => l ? { ...l, ...updated } : l)} />}

      {/* Back + header */}
      <div>
        <Link href="/telemarketer/leads" className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
          style={{ color: 'var(--color-text3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
          <ChevronLeft size={13} /> My Leads
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
              {lead.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>{lead.name}</h1>
                <button
                  onClick={() => { navigator.clipboard.writeText(id); setCopiedLeadId(true); setTimeout(() => setCopiedLeadId(false), 2000); }}
                  className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-md transition-all"
                  title="Copy lead ID"
                  style={{
                    background: copiedLeadId ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.06)',
                    color:      copiedLeadId ? '#34D399' : 'var(--color-text3)',
                    border:     `1px solid ${copiedLeadId ? 'rgba(52,211,153,0.25)' : 'var(--color-border2)'}`,
                  }}>
                  {copiedLeadId ? '✓ copied' : (lead?.ref_id ?? `#${id.slice(0, 8)}`)}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text3)' }}>
                  <Building2 size={12} /> {lead.company}
                </span>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--color-text3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#34D399'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
                    <Phone size={12} /> {lead.phone}
                  </a>
                )}
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--color-text3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
                  <Mail size={12} /> {lead.email}
                </a>
              </div>
              {/* Qualification quick-view — only non-empty fields */}
              {(() => {
                const items = [
                  lead.industry          && { icon: Briefcase, label: lead.industry,                                                                    color: '#FBBF24' },
                  lead.province          && { icon: MapPin,    label: lead.province,                                                                    color: '#60A5FA' },
                  lead.num_branches      != null && { icon: Building2, label: `${lead.num_branches} branch${lead.num_branches !== 1 ? 'es' : ''}`,      color: '#A78BFA' },
                  lead.num_employees     != null && { icon: Users,     label: `${lead.num_employees} employee${lead.num_employees !== 1 ? 's' : ''}`,   color: '#A78BFA' },
                  lead.deal_probability  != null && { icon: Percent,   label: `${lead.deal_probability}% probability`,                                 color: '#34D399' },
                  lead.estimated_deal_value != null && { icon: Banknote, label: `R ${lead.estimated_deal_value.toLocaleString('en-ZA')}`,               color: '#34D399' },
                ].filter(Boolean) as { icon: React.ComponentType<{ size?: number }>; label: string; color: string }[];
                if (items.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {items.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${item.color}14`, color: item.color, border: `1px solid ${item.color}28` }}>
                        <item.icon size={9} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button ref={statusBtnRef}
                onClick={() => {
                  if (statusBtnRef.current) {
                    const r = statusBtnRef.current.getBoundingClientRect();
                    setStatusTop(r.bottom + 4);
                    const dropW = 200;
                    const left = Math.min(r.left, window.innerWidth - dropW - 8);
                    setStatusLeft(Math.max(8, left));
                  }
                  setStatusOpen(o => !o);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
                {status} <ChevronDown size={10} />
              </button>
              {statusOpen && createPortal(
                <div ref={statusDropRef} className="fixed z-[9999] rounded-xl overflow-hidden min-w-[200px]"
                  style={{ top: statusTop, left: statusLeft, background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
                  {PIPELINE_STATUSES.map(s => (
                    <button key={s}
                      onMouseDown={e => { e.preventDefault(); changeStatus(s); setStatusOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: s === status ? 'var(--color-violet)' : 'var(--color-text2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      {s}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
            {twilio.error && (
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                {twilio.error}
              </span>
            )}
            {!callActive ? (
              lead.phone ? (
                <button onClick={startTwilioCall}
                  disabled={twilio.callState === 'connecting'}
                  className="btn-purple btn-shine inline-flex items-center gap-1.5 !text-xs !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Phone size={12} />
                  {twilio.callState === 'connecting' ? 'Connecting...' : 'Call Now'}
                </button>
              ) : null
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tabular-nums"
                  style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)', minWidth: 80 }}>
                  <Timer size={12} className={twilio.callState === 'active' ? 'animate-pulse' : ''} />
                  {twilio.callState === 'ringing' ? 'Ringing...' : fmtElapsed(twilio.elapsed)}
                </span>
                <button onClick={twilio.toggleMute}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: twilio.isMuted ? 'rgba(251,191,36,0.1)' : 'rgba(107,114,128,0.08)', color: twilio.isMuted ? '#FBBF24' : 'var(--color-text3)', border: `1px solid ${twilio.isMuted ? 'rgba(251,191,36,0.2)' : 'rgba(107,114,128,0.15)'}` }}>
                  {twilio.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  {twilio.isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={twilio.hangUp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <PhoneOff size={12} /> End Call
                </button>
              </>
            )}
            <button onClick={() => setAddNoteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <MessageSquare size={12} /> Add Note
            </button>
            <button onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.15)' }}>
              <Pencil size={12} /> Edit Lead
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bento-card p-6">
        <h2 className="text-sm font-bold mb-6" style={{ color: 'var(--color-text)' }}>Lead Timeline</h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {TIMELINE_STEPS.map((step, i) => {
            const isWonStep    = i === TIMELINE_STEPS.length - 1;
            const blockedWon   = isWonStep && isNegativeOutcome;
            // For negative outcomes: the step at currentStep is the "stopped here" marker
            const stoppedHere  = isNegativeOutcome && i === currentStep;
            const active       = !isNegativeOutcome && !blockedWon && i === currentStep;
            const done         = !blockedWon && !stoppedHere && !active && i < currentStep;
            const connectorFilled = i < currentStep && !isNegativeOutcome
              ? true
              : i < currentStep && isNegativeOutcome
              ? true  // steps before stopped are filled
              : false;

            return (
              <div key={step} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: blockedWon  ? 'rgba(107,114,128,0.12)'
                               : stoppedHere ? 'rgba(248,113,113,0.12)'
                               : active      ? 'var(--color-purple)'
                               : done        ? 'rgba(52,211,153,0.15)'
                               : 'var(--color-surface2)',
                      color: blockedWon  ? 'var(--color-text3)'
                           : stoppedHere ? '#F87171'
                           : active      ? 'white'
                           : done        ? '#34D399'
                           : 'var(--color-text3)',
                      boxShadow: active ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
                    }}>
                    {blockedWon || stoppedHere ? <XCircle size={16} />
                    : done                     ? <CheckCircle2 size={16} />
                    : <span className="text-[11px] font-bold">{i + 1}</span>}
                  </div>
                  <p className="text-[10px] text-center leading-tight font-medium"
                    style={{ color: blockedWon  ? 'var(--color-text3)'
                                  : stoppedHere ? '#F87171'
                                  : active      ? 'var(--color-violet)'
                                  : done        ? '#34D399'
                                  : 'var(--color-text3)' }}>
                    {step}
                    {stoppedHere && (
                      <span className="block text-[9px] font-bold mt-0.5 uppercase tracking-wide opacity-80">
                        {status === 'Lost' ? 'Lost' : 'Not interested'}
                      </span>
                    )}
                  </p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="h-0.5 w-8 mx-1 shrink-0 mt-[-18px]"
                    style={{ background: connectorFilled ? 'rgba(52,211,153,0.4)' : 'var(--color-surface2)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Qualification ─────────────────────────────────────────── */}
      {false && <div className="bento-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5 transition-colors"
          style={{ cursor: 'pointer' }}
          onClick={() => setQualOpen(o => !o)}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.03)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)' }}>
              <Briefcase size={13} style={{ color: '#FBBF24' }} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Business Qualification</h2>
            {qualSaved && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>Saved ✓</span>}
          </div>
          <ChevronDown size={14} className={`transition-transform duration-200 ${qualOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text3)' }} />
        </button>

        {qualOpen && (
          <div className="px-5 pb-6 space-y-6" style={{ borderTop: '1px solid var(--color-border2)' }}>

            {/* Business profile */}
            <div className="pt-4">
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>Business Profile</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: 'trading_name',      label: 'Trading Name',          type: 'text',   placeholder: 'Legal / trading name' },
                  { key: 'contact_person',    label: 'Decision Maker',        type: 'text',   placeholder: 'Full name' },
                  { key: 'position',          label: 'Title / Position',      type: 'text',   placeholder: 'e.g. CEO' },
                  { key: 'website',           label: 'Website',               type: 'url',    placeholder: 'https://example.co.za' },
                  { key: 'existing_platform', label: 'Current Platform',      type: 'text',   placeholder: 'e.g. Finworks, FNB, None' },
                  { key: 'num_employees',     label: 'Employees',             type: 'number', placeholder: '0' },
                  { key: 'num_branches',      label: 'Branches',              type: 'number', placeholder: '0' },
                  { key: 'monthly_applications', label: 'Monthly Applications', type: 'number', placeholder: '0' },
                  { key: 'monthly_volume',    label: 'Monthly Loan Volume (R)', type: 'number', placeholder: '0' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>{label}</label>
                    <input
                      type={type}
                      className="field-input"
                      placeholder={placeholder}
                      value={(qualForm as unknown as Record<string, string>)[key] ?? ''}
                      onChange={e => setQualForm(p => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Industry</label>
                  <select className="field-input" value={qualForm.industry} onChange={e => setQualForm(p => ({ ...p, industry: e.target.value }))}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Province</label>
                  <select className="field-input" value={qualForm.province} onChange={e => setQualForm(p => ({ ...p, province: e.target.value }))}>
                    <option value="">Select…</option>
                    {SA_PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Pain Points / Why are they looking?</label>
                <textarea
                  className="field-input w-full"
                  rows={3}
                  placeholder="What problems are they trying to solve?"
                  value={qualForm.pain_points}
                  onChange={e => setQualForm(p => ({ ...p, pain_points: e.target.value }))}
                />
              </div>
            </div>

            {/* AlgoLend interest areas */}
            <div>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>AlgoLend Interest Areas</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_AREAS.map(({ key, label }) => {
                  const active = qualForm[key] as boolean;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQualForm(p => ({ ...p, [key]: !p[key as keyof QualForm] }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={active
                        ? { background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.4)' }
                        : { background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }
                      }
                    >
                      {active && <CheckCircle2 size={11} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deal information */}
            <div>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text3)' }}>Deal Information</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: 'potential_setup_fee',    label: 'Potential Setup Fee (R)',      placeholder: '0' },
                  { key: 'potential_monthly_sub',  label: 'Potential Monthly Sub (R)',    placeholder: '0' },
                  { key: 'estimated_deal_value',   label: 'Estimated Deal Value (R)',     placeholder: '0' },
                  { key: 'estimated_annual_revenue', label: 'Est. Annual Revenue (R)',    placeholder: '0' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>{label}</label>
                    <input
                      type="number"
                      className="field-input"
                      placeholder={placeholder}
                      value={(qualForm as unknown as Record<string, string>)[key] ?? ''}
                      onChange={e => setQualForm(p => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Expected Close Date</label>
                  <input type="date" className="field-input" value={qualForm.expected_close_date}
                    onChange={e => setQualForm(p => ({ ...p, expected_close_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Deal Probability (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={0} max={100} step={5}
                      className="flex-1"
                      value={qualForm.deal_probability || '0'}
                      onChange={e => setQualForm(p => ({ ...p, deal_probability: e.target.value }))}
                    />
                    <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--color-violet)' }}>
                      {qualForm.deal_probability || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={saveQualification}
              disabled={qualSaving}
              className="btn-purple btn-shine inline-flex items-center gap-2"
            >
              {qualSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {qualSaving ? 'Saving…' : 'Save Qualification'}
            </button>
          </div>
        )}
      </div>}

      {/* ── Action Toolbar ──────────────────────────────────────────────── */}
      <div className="bento-card p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest font-semibold mr-1 shrink-0"
            style={{ color: 'var(--color-text3)' }}>Actions</span>
          <button onClick={() => setLogCallOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
            <Phone size={12} /> Log Call
          </button>
          <button onClick={() => setAddNoteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <MessageSquare size={12} /> Add Note
          </button>
          <button onClick={() => setScheduleOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.15)' }}>
            <Calendar size={12} /> Schedule
          </button>
          <button onClick={() => setBookDemoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(244,114,182,0.08)', color: '#F472B6', border: '1px solid rgba(244,114,182,0.15)' }}>
            <Video size={12} /> Book Demo
          </button>
          <button onClick={() => setProposalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(251,146,60,0.08)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.15)' }}>
            <FileText size={12} /> New Proposal
          </button>
          <div className="flex-1" />
          <Link href={`/telemarketer/documents?lead=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.15)' }}>
            <FileUp size={11} /> Docs
          </Link>
          <button onClick={loadActivity}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Message Templates ─────────────────────────────────────────── */}
      <div className="bento-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5 transition-colors"
          onClick={() => setTemplatesOpen(o => !o)}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.03)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.1)' }}>
              <Copy size={13} style={{ color: '#60A5FA' }} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Message Templates</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.15)' }}>
              5 templates
            </span>
          </div>
          <ChevronDown size={14}
            className={`transition-transform duration-200 ${templatesOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-text3)' }} />
        </button>

        {templatesOpen && (
          <div className="px-5 pb-6 space-y-5" style={{ borderTop: '1px solid var(--color-border2)' }}>

            {/* WhatsApp */}
            <div className="pt-4">
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--color-text3)' }}>
                <MessageSquare size={10} /> WhatsApp
              </p>
              <div className="space-y-2">
                {ALGOLEND_TEMPLATES.whatsapp.map(tpl => {
                  const body    = tpl.text(lead.name);
                  const copied  = copiedId === tpl.id;
                  const sending   = smsSending === tpl.id;
                  const result    = smsResult?.id === tpl.id ? smsResult : null;
                  const waSend    = waSending === tpl.id;
                  const waRes     = waResult?.id === tpl.id ? waResult : null;
                  return (
                    <div key={tpl.id} className="rounded-xl p-3.5"
                      style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                      <p className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--color-text2)' }}>{tpl.label}</p>
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap mb-3" style={{ color: 'var(--color-text3)' }}>{body}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Send WhatsApp via Twilio */}
                        {lead.phone && (
                          <button
                            onClick={() => sendWhatsApp(tpl.id, body)}
                            disabled={waSend}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                            style={waRes
                              ? { background: waRes.ok ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: waRes.ok ? '#34D399' : '#F87171', border: `1px solid ${waRes.ok ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }
                              : { background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)' }}
                          >
                            {waSend ? <Loader2 size={10} className="animate-spin" /> : <MessageSquare size={10} />}
                            {waSend ? 'Sending…' : waRes ? (waRes.ok ? 'Sent!' : 'Failed') : 'Send WhatsApp'}
                          </button>
                        )}
                        {/* WhatsApp deep-link fallback */}
                        {lead.phone && (
                          <a
                            href={waLink(body)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:-translate-y-px"
                            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
                          >
                            <MessageSquare size={10} />
                            Open App
                          </a>
                        )}
                        {/* SMS via Twilio */}
                        {lead.phone && (
                          <button
                            onClick={() => sendSms(tpl.id, body)}
                            disabled={sending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                            style={result
                              ? { background: result.ok ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: result.ok ? '#34D399' : '#F87171', border: `1px solid ${result.ok ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }
                              : { background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.15)' }}
                          >
                            {sending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                            {sending ? 'Sending…' : result ? (result.ok ? 'SMS sent!' : 'Failed') : 'Send SMS'}
                          </button>
                        )}
                        {/* Copy fallback */}
                        <button
                          onClick={() => copyTemplate(tpl.id, body)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                          style={copied
                            ? { background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }
                            : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}
                        >
                          <Copy size={10} />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--color-text3)' }}>
                <Mail size={10} /> Email
              </p>
              <div className="space-y-2">
                {ALGOLEND_TEMPLATES.email.map(tpl => {
                  const body = tpl.text(lead.name);
                  const copied = copiedId === tpl.id;
                  return (
                    <div key={tpl.id} className="rounded-xl p-3.5 relative"
                      style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--color-text2)' }}>{tpl.label}</p>
                          <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text3)' }}>{body}</p>
                        </div>
                        <button
                          onClick={() => copyTemplate(tpl.id, body)}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                          style={copied
                            ? { background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }
                            : { background: 'rgba(167,139,250,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }
                          }>
                          <Copy size={10} />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Unified Activity Timeline ──────────────────────────────────── */}
      <div className="bento-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Activity Timeline</h2>
          {timeline.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}>
              {timeline.length} event{timeline.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface2)' }}>
              <Clock size={20} style={{ color: 'var(--color-text3)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text2)' }}>No activity yet</p>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>Log a call or add a note to get started.</p>
            </div>
          </div>
        ) : (
          <div>
            {timeline.map((event, i) => {
              const isLast = i === timeline.length - 1;
              return (
                <div key={event.id} className="flex gap-4">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: event.iconBg, color: event.iconColor }}>
                      {event.icon}
                    </div>
                    {!isLast && (
                      <div className="w-px grow mt-1.5 mb-1"
                        style={{ background: 'linear-gradient(to bottom, var(--color-border2), transparent)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-5'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                            {event.title}
                          </span>
                          {event.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-[3px] rounded-full leading-none"
                              style={{ background: event.badge.bg, color: event.badge.color }}>
                              {event.badge.label}
                            </span>
                          )}
                        </div>
                        {event.body && (
                          <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--color-text2)' }}>
                            {event.body}
                          </p>
                        )}
                        {event.sub && (
                          <p className="text-[11px] font-semibold mt-1" style={{ color: event.iconColor }}>
                            {event.sub}
                          </p>
                        )}
                        {event.link && (
                          <a href={event.link.href} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-semibold mt-1 inline-block transition-opacity hover:opacity-80"
                            style={{ color: 'var(--color-violet)' }}>
                            {event.link.label}
                          </a>
                        )}
                      </div>
                      <time className="text-[10px] font-mono shrink-0 pt-0.5 tabular-nums"
                        style={{ color: 'var(--color-text3)' }}>
                        {event.timestamp}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
