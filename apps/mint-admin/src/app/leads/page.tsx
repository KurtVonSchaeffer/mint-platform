'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { Inbox, RefreshCw, Mail, Building2, ChevronDown, Plus, X, Loader2, UserPlus, FileText, UserCheck, Upload, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
type LeadSource = 'marketing-site' | 'referral' | 'manual';

interface Lead {
  id:          string;
  name:        string;
  email:       string | null;
  company:     string;
  message:     string | null;
  source:      LeadSource;
  status:      LeadStatus;
  assignedTo:  string | null;
  createdAt:   string;
  tmStatus:    string | null;
}

const AGENT_COLORS = ['#A78BFA', '#34D399', '#60A5FA', '#FB923C', '#F472B6', '#FBBF24'];

type Agent = { id: string; name: string; initials: string; color: string };

const STATUS_CONFIG: Record<LeadStatus, { label: string; bg: string; border: string; color: string }> = {
  new:       { label: 'New',       bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  color: 'var(--color-amber)'  },
  contacted: { label: 'Contacted', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)'    },
  qualified: { label: 'Qualified', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)',   color: 'var(--color-violet)' },
  won:       { label: 'Won',       bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  color: 'var(--color-green)'  },
  lost:      { label: 'Lost',      bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)'    },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  'marketing-site': 'algolend.co.za',
  referral:         'referral',
  manual:           'manual entry',
};

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, status: LeadStatus) => Promise<void> }) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const cfg = STATUS_CONFIG[lead.status];

  async function pick(s: LeadStatus) {
    if (s === lead.status) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    await onUpdate(lead.id, s);
    setSaving(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        {saving ? <Loader2 size={9} className="animate-spin" /> : null}
        {cfg.label}
        <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden min-w-[140px]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([s, c]) => (
              <button
                key={s}
                onClick={() => pick(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors text-left"
                style={{ color: s === lead.status ? c.color : 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AssignDropdown({ lead, agents, onAssign }: {
  lead: Lead;
  agents: Agent[];
  onAssign: (id: string, agentId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const assigned = agents.find(t => t.id === lead.assignedTo);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        style={assigned
          ? { background: `${assigned.color}18`, border: `1px solid ${assigned.color}40`, color: assigned.color }
          : { border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
        title="Assign to telemarketer"
      >
        {assigned ? (
          <>
            <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-bold shrink-0"
              style={{ background: assigned.color, color: '#fff' }}>
              {assigned.initials}
            </span>
            {assigned.name.split(' ')[0]}
          </>
        ) : (
          <>
            <UserCheck size={11} />
            Assign
          </>
        )}
        <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden min-w-[180px]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text3)' }}>Assign to agent</p>
            </div>
            {agents.length === 0 && (
              <p className="px-3 py-3 text-xs" style={{ color: 'var(--color-text3)' }}>No telemarketer accounts yet</p>
            )}
            {agents.map(t => (
              <button
                key={t.id}
                onClick={() => { onAssign(lead.id, t.id === lead.assignedTo ? null : t.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs cursor-pointer transition-colors text-left"
                style={{ color: t.id === lead.assignedTo ? t.color : 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: t.color, color: '#fff' }}>
                  {t.initials}
                </span>
                <span className="flex-1">{t.name}</span>
                {t.id === lead.assignedTo && <span className="text-[9px]">✓</span>}
              </button>
            ))}
            {lead.assignedTo && (
              <>
                <div style={{ borderTop: '1px solid var(--color-border2)' }} />
                <button
                  onClick={() => { onAssign(lead.id, null); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors text-left"
                  style={{ color: 'var(--color-text3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <X size={10} /> Unassign
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm]   = useState({ name: '', email: '', company: '', message: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, source: 'manual' }),
    });
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bento-card w-full max-w-md p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Add lead</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {(['name', 'email', 'company'] as const).map(f => (
            <div key={f}>
              <label className="block text-[10px] font-medium mb-1.5 capitalize" style={{ color: 'var(--color-text3)' }}>{f}</label>
              <input
                type={f === 'email' ? 'email' : 'text'}
                required
                className="field-input"
                value={form[f]}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Message (optional)</label>
            <textarea className="field-input" rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm cursor-pointer" style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addOpen, setAddOpen]     = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [toast, setToast]         = useState<{ kind: ToastKind; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | null>(null);
  const [agentFilter,  setAgentFilter]  = useState<string | null>(null);

  function createQuoteFromLead(lead: Lead) {
    sessionStorage.setItem('new_quote_prefill', JSON.stringify({
      client:  lead.company,
      contact: lead.name,
      email:   lead.email,
    }));
    router.push('/quotes?new=1');
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/leads');
    if (res.ok) {
      const { leads: raw } = await res.json();
      setLeads((raw ?? []).map((l: Record<string, string>) => ({
        ...l,
        createdAt:  l.created_at  ?? l.createdAt,
        assignedTo: l.assigned_to ?? l.assignedTo ?? null,
        tmStatus:   l.tm_status   ?? null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const agentName = (id: string | null) => agents.find(a => a.id === id)?.name ?? id ?? '';
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ID', 'Name', 'Company', 'Email', 'Source', 'Status', 'TM Status', 'Assigned To', 'Created At'],
      ...leads.map(l => [
        l.id, l.name, l.company, l.email ?? '', l.source,
        l.status, l.tmStatus ?? '', agentName(l.assignedTo), l.createdAt,
      ]),
    ].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    fetch('/api/users?role=telemarketer')
      .then(r => r.json())
      .then(d => setAgents(
        (d.users ?? []).map((u: { id: string; name: string }, i: number) => ({
          id:       u.id,
          name:     u.name,
          initials: u.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
          color:    AGENT_COLORS[i % AGENT_COLORS.length],
        }))
      ))
      .catch(() => {/* fail silently */});
  }, []);

  async function updateStatus(id: string, status: LeadStatus) {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setToast({ kind: 'error', message: 'Failed to update status' });
      load(); // revert
    }
  }

  async function assignLead(id: string, agentId: string | null) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, assignedTo: agentId } : l));
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigned_to: agentId,
        ...(agentId ? { tm_status: 'New Lead' } : {}),
      }),
    });
    if (!res.ok) {
      setToast({ kind: 'error', message: 'Failed to assign lead' });
      load();
      return;
    }
    const agent = agents.find(t => t.id === agentId);
    setToast({ kind: 'success', message: agent ? `Assigned to ${agent.name}` : 'Lead unassigned' });
  }

  const byStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const filteredLeads = leads
    .filter(l => !statusFilter || l.status === statusFilter)
    .filter(l => !agentFilter  || l.assignedTo === agentFilter);

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} onAdded={load} />}
      {convertLead && (
        <OnboardingWizard
          leadId={convertLead.id}
          onClose={() => setConvertLead(null)}
          onCreated={() => {
            setConvertLead(null);
            setToast({ kind: 'success', message: `${convertLead.company} onboarded as a new client.` });
            load();
          }}
          initialValues={{
            name:         convertLead.company,
            contactEmail: convertLead.email ?? undefined,
            contactName:  convertLead.name,
          }}
        />
      )}

      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-2">Sales pipeline</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Leads</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              Inbound enquiries from algolend.co.za + manual entries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/leads/import')}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Upload size={13} />
              Import
            </button>
            <button
              onClick={exportCsv}
              disabled={leads.length === 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Download size={13} />
              Export CSV
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-purple btn-shine inline-flex items-center gap-1.5">
              <Plus size={14} /> Add lead
            </button>
          </div>
        </div>

        {/* KPI strip — click to filter */}
        <div className="grid grid-cols-5 gap-3">
          {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([k, cfg]) => {
            const isActive = statusFilter === k;
            return (
              <button
                key={k}
                onClick={() => setStatusFilter(prev => prev === k ? null : k)}
                className="bento-card p-4 text-left transition-all cursor-pointer"
                style={isActive ? {
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  boxShadow: `0 0 20px rgba(${cfg.bg.match(/[\d.]+,[\d.]+,[\d.]+/)?.[0]},0.15)`,
                  transform: 'translateY(-1px)',
                } : {}}
                title={isActive ? `Clear "${cfg.label}" filter` : `Filter by ${cfg.label}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{ color: isActive ? cfg.color : 'var(--color-text3)' }}>{cfg.label}</p>
                  {isActive && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      active
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold tracking-tight stat-value" style={{ color: cfg.color }}>
                  {byStatus[k] ?? 0}
                </p>
              </button>
            );
          })}
        </div>

        {/* Agent filter chips */}
        {agents.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--color-text3)' }}>Agent</span>
            {agents.map(agent => {
              const isActive = agentFilter === agent.id;
              const agentLeadCount = leads.filter(l => l.assignedTo === agent.id).length;
              return (
                <button
                  key={agent.id}
                  onClick={() => setAgentFilter(prev => prev === agent.id ? null : agent.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={isActive
                    ? { background: `${agent.color}22`, border: `1px solid ${agent.color}55`, color: agent.color, transform: 'translateY(-1px)' }
                    : { border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                >
                  <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[7px] font-bold shrink-0"
                    style={{ background: agent.color, color: '#fff' }}>
                    {agent.initials}
                  </span>
                  {agent.name.split(' ')[0]}
                  <span className="text-[10px] opacity-60">{agentLeadCount}</span>
                </button>
              );
            })}
            {agentFilter && (
              <button
                onClick={() => setAgentFilter(null)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
              >
                ✕ all
              </button>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="bento-card p-12 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
          </div>
        ) : leads.length === 0 ? (
          <div className="bento-card p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
              <Inbox size={20} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No leads yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text3)' }}>
              When someone submits the contact form on algolend.co.za, their enquiry will appear here. Or add one manually.
            </p>
          </div>
        ) : (
          <div className="bento-card overflow-hidden p-0">
            <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
                  {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
                  {(() => {
                    const parts: string[] = [];
                    if (statusFilter) parts.push(STATUS_CONFIG[statusFilter].label);
                    if (agentFilter) parts.push(agents.find(a => a.id === agentFilter)?.name.split(' ')[0] ?? '');
                    return parts.length ? ` · ${parts.join(' · ')}` : ' · newest first';
                  })()}
                </span>
                {statusFilter && (
                  <button
                    onClick={() => setStatusFilter(null)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                    style={{ background: STATUS_CONFIG[statusFilter].bg, color: STATUS_CONFIG[statusFilter].color, border: `1px solid ${STATUS_CONFIG[statusFilter].border}` }}
                    title="Clear status filter"
                  >
                    ✕ {STATUS_CONFIG[statusFilter].label}
                  </button>
                )}
                {agentFilter && (() => {
                  const agent = agents.find(a => a.id === agentFilter);
                  return agent ? (
                    <button
                      onClick={() => setAgentFilter(null)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                      style={{ background: `${agent.color}18`, color: agent.color, border: `1px solid ${agent.color}40` }}
                      title="Clear agent filter"
                    >
                      ✕ {agent.name.split(' ')[0]}
                    </button>
                  ) : null;
                })()}
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-green)' }}>● LIVE</span>
            </div>
            <div>
              {filteredLeads.map(lead => (
                <article key={lead.id} className="lead-card p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{lead.name}</h3>
                        <StatusDropdown lead={lead} onUpdate={updateStatus} />
                        {lead.assignedTo && (() => {
                          const agent = agents.find(t => t.id === lead.assignedTo);
                          return agent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: `${agent.color}15`, color: agent.color, border: `1px solid ${agent.color}30` }}>
                              <span className="w-3 h-3 rounded-full inline-flex items-center justify-center text-[7px] font-bold"
                                style={{ background: agent.color, color: '#fff' }}>{agent.initials}</span>
                              {agent.name}
                            </span>
                          ) : null;
                        })()}
                        {lead.tmStatus && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            {lead.tmStatus}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs mb-3 flex-wrap" style={{ color: 'var(--color-text3)' }}>
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={11} />
                          {lead.email
                            ? <a href={`mailto:${lead.email}`} className="lead-email-link hover:underline">{lead.email}</a>
                            : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>no email</span>}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={11} />
                          {lead.company}
                        </span>
                        <span>via {SOURCE_LABELS[lead.source] ?? lead.source}</span>
                      </div>

                      {lead.message ? (
                        <p className="text-sm leading-relaxed rounded-xl px-3 py-2 max-w-2xl"
                          style={{ color: 'var(--color-text2)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)' }}>
                          &ldquo;{lead.message}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs italic" style={{ color: 'var(--color-text3)' }}>No message provided</p>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <AssignDropdown lead={lead} agents={agents} onAssign={assignLead} />
                        {lead.email && <a
                          href={`mailto:${lead.email}?subject=Re: ${lead.company} — AlgoLend`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Mail size={11} /> Reply
                        </a>}
                        {lead.status !== 'won' && lead.status !== 'lost' && (
                          <>
                            <button
                              onClick={() => createQuoteFromLead(lead)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                              style={{ border: '1px solid rgba(124,58,237,0.35)', color: 'var(--color-violet)', background: 'rgba(124,58,237,0.08)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                            >
                              <FileText size={11} /> Create quote
                            </button>
                            {lead.status === 'qualified' && (
                              <button
                                onClick={() => setConvertLead(lead)}
                                className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{ background: 'linear-gradient(135deg,var(--color-purple),var(--color-purple2))', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}
                              >
                                <UserPlus size={11} /> Onboard
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
