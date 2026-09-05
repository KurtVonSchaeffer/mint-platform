'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertCircle, Building2, Mail, User2, Send, Clock,
} from 'lucide-react';
import { Shell } from '@/components/Shell';

interface Ticket {
  id:                 string;
  subject:            string;
  message:            string;
  category:           string;
  priority:           string;
  status:             string;
  submitted_by_name:  string | null;
  submitted_by_email: string | null;
  created_at:         string;
  clients: { id: string; name: string; contact_email: string | null; contact_name: string | null } | null;
}

interface Reply {
  id:           string;
  author_type:  'client' | 'admin';
  author_name:  string | null;
  author_email: string | null;
  message:      string;
  created_at:   string;
}

const STATUSES  = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [ticket,  setTicket]  = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [sending,  setSending]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await fetch(`/api/admin/support-tickets/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
      setReplies(data.replies ?? []);
    } else {
      setError('Failed to load ticket');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function updateField(field: 'status' | 'priority', value: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/support-tickets/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: value }),
    });
    if (res.ok) setTicket(t => t ? { ...t, [field]: value } : t);
    setSaving(false);
  }

  async function sendReply() {
    if (!replyMsg.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/support-tickets/${id}/reply`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: replyMsg.trim() }),
    });
    if (res.ok) {
      const { reply } = await res.json();
      setReplies(r => [...r, reply]);
      setReplyMsg('');
      if (ticket?.status === 'open') setTicket(t => t ? { ...t, status: 'in_progress' } : t);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <Shell>
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading ticket…</p>
      </div>
      </Shell>
    );
  }

  if (error || !ticket) {
    return (
      <Shell>
      <div className="bento-card p-4 flex items-center gap-3 max-w-2xl" style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
        <AlertCircle size={15} style={{ color: '#F87171', flexShrink: 0 }} />
        <p className="text-sm" style={{ color: '#F87171' }}>{error ?? 'Ticket not found'}</p>
      </div>
      </Shell>
    );
  }

  return (
    <Shell>
    <div className="space-y-6 page-enter max-w-3xl">

      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/support')}
          className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)', background: 'var(--color-surface)' }}
          aria-label="Back to tickets"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="eyebrow mb-1.5">Support ticket</p>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {ticket.subject}
          </h1>
        </div>
      </div>

      {/* Meta row: client + submitter + controls */}
      <div className="bento-card p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[160px]"
            style={{ background: 'var(--color-ink)', border: '1px solid var(--color-border2)' }}>
            <Building2 size={12} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--color-text3)' }}>Client</p>
              <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{ticket.clients?.name ?? 'Unknown'}</p>
            </div>
          </div>
          {ticket.submitted_by_name && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[160px]"
              style={{ background: 'var(--color-ink)', border: '1px solid var(--color-border2)' }}>
              <User2 size={12} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--color-text3)' }}>Submitted by</p>
                <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{ticket.submitted_by_name}</p>
              </div>
            </div>
          )}
          {ticket.submitted_by_email && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[160px]"
              style={{ background: 'var(--color-ink)', border: '1px solid var(--color-border2)' }}>
              <Mail size={12} style={{ color: 'var(--color-text3)', flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--color-text3)' }}>Email</p>
                <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{ticket.submitted_by_email}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Status</label>
            <select
              className="field-input cursor-pointer w-full"
              value={ticket.status}
              disabled={saving}
              onChange={e => updateField('status', e.target.value)}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Priority</label>
            <select
              className="field-input cursor-pointer w-full"
              value={ticket.priority}
              disabled={saving}
              onChange={e => updateField('priority', e.target.value)}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--color-text3)' }}>Category</p>
            <p className="text-sm font-semibold capitalize py-2" style={{ color: 'var(--color-text)' }}>
              {ticket.category.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {/* Original message */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
              {ticket.submitted_by_name ?? ticket.clients?.name ?? 'Client'}
            </p>
            <span className="text-[10px] inline-flex items-center gap-1" style={{ color: 'var(--color-text3)' }}>
              <Clock size={9} /> {fmtDT(ticket.created_at)}
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text2)' }}>
            {ticket.message}
          </p>
        </div>

        {/* Replies */}
        {replies.map(r => (
          <div
            key={r.id}
            className="bento-card p-5"
            style={r.author_type === 'admin' ? { background: 'rgba(124,58,237,0.04)', borderColor: 'rgba(124,58,237,0.15)' } : undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold" style={{ color: r.author_type === 'admin' ? 'var(--color-violet)' : 'var(--color-text)' }}>
                {r.author_name ?? (r.author_type === 'admin' ? 'AlgoLend Support' : 'Client')}
              </p>
              <span className="text-[10px] inline-flex items-center gap-1" style={{ color: 'var(--color-text3)' }}>
                <Clock size={9} /> {fmtDT(r.created_at)}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text2)' }}>
              {r.message}
            </p>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="bento-card p-5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text3)' }}>
          Reply to {ticket.submitted_by_name ?? ticket.clients?.name ?? 'client'}
        </label>
        <textarea
          value={replyMsg}
          onChange={e => setReplyMsg(e.target.value)}
          rows={4}
          placeholder="Write a reply…"
          className="field-input w-full text-sm resize-none mb-3"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
            {ticket.submitted_by_email ? `Emailed to ${ticket.submitted_by_email}` : 'No submitter email on file — reply is saved but not emailed'}
          </p>
          <button
            onClick={sendReply}
            disabled={sending || !replyMsg.trim()}
            className="btn-purple btn-shine inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
    </Shell>
  );
}
