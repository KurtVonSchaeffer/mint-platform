'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import {
  Banknote, Clock, CheckCircle2, DollarSign, AlertCircle,
  Loader2, RefreshCw, ChevronDown, Users2, Calendar,
  Pencil, Plus, X,
} from 'lucide-react';

type CommissionStatus = 'Pending Collection' | 'Pending Payroll' | 'Payroll Ready' | 'Paid';

interface Commission {
  id: string;
  agent_id: string;
  agentName: string;
  agentEmail: string;
  client_name: string;
  loan_amount: number | null;
  commission_amount: number;
  status: CommissionStatus;
  payroll_date: string | null;
  paid_at: string | null;
  created_at: string;
  leads: { name: string; company: string; client_stage: string | null } | null;
}

const STATUS_CFG: Record<CommissionStatus, { bg: string; border: string; color: string }> = {
  'Pending Collection': { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)',  color: '#FBBF24' },
  'Pending Payroll':    { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  color: '#60A5FA' },
  'Payroll Ready':      { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  color: '#34D399' },
  'Paid':               { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: '#10B981' },
};

function fmt(n: number | null) {
  if (n === null || n === undefined) return '—';
  return `R ${n.toLocaleString('en-ZA')}`;
}

function lastDayOfCurrentMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function monthOptions() {
  const opts: { value: string; label: string }[] = [{ value: '', label: 'All time' }];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    opts.push({
      value: m.toISOString().slice(0, 7),
      label: m.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
    });
  }
  return opts;
}

interface AgentOption { id: string; name: string; email: string }

function PayrollPageInner() {
  const searchParams = useSearchParams();
  const [commissions,   setCommissions]   = useState<Commission[]>([]);
  const [agentOptions,  setAgentOptions]  = useState<AgentOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [month,         setMonth]         = useState('');
  const [agentFilter,   setAgentFilter]   = useState(searchParams.get('agent') ?? '');
  const [statusFilter,  setStatusFilter]  = useState<CommissionStatus | ''>('');
  const [updating,      setUpdating]      = useState<string | null>(null);
  const [toast,         setToast]         = useState<{ ok: boolean; msg: string } | null>(null);

  // Inline amount edit state
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editLoan,   setEditLoan]   = useState('');

  // Create commission modal
  const [createOpen,    setCreateOpen]    = useState(false);
  const [createAgent,   setCreateAgent]   = useState('');
  const [createClient,  setCreateClient]  = useState('');
  const [createLoan,    setCreateLoan]    = useState('');
  const [createComm,    setCreateComm]    = useState('');
  const [creating,      setCreating]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url = month ? `/api/admin/commissions?month=${month}` : '/api/admin/commissions';
    const res = await fetch(url);
    if (res.ok) {
      const { commissions: data } = await res.json();
      setCommissions(data ?? []);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/users?role=telemarketer')
      .then(r => r.json())
      .then(d => setAgentOptions((d.users ?? []).map((u: { id: string; name: string; email: string }) => ({
        id: u.id, name: u.name, email: u.email,
      }))))
      .catch(() => {});
  }, []);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function updateStatus(id: string, status: CommissionStatus, payroll_date?: string) {
    setUpdating(id);
    const body: Record<string, unknown> = { status };
    if (payroll_date) body.payroll_date = payroll_date;

    const res = await fetch(`/api/admin/commissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setUpdating(null);

    if (!res.ok) { showToast(false, data.error ?? 'Update failed'); return; }

    setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...data.commission } : c));
    showToast(true, `Moved to ${status}`);
  }

  async function saveAmount(id: string) {
    const commission_amount = parseFloat(editAmount);
    const loan_amount = editLoan ? parseFloat(editLoan) : null;
    if (isNaN(commission_amount) || commission_amount < 0) { showToast(false, 'Enter a valid amount'); return; }
    setUpdating(id);
    const res = await fetch(`/api/admin/commissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_amount, ...(loan_amount !== null ? { loan_amount } : {}) }),
    });
    const data = await res.json();
    setUpdating(null);
    setEditingId(null);
    if (!res.ok) { showToast(false, data.error ?? 'Save failed'); return; }
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...data.commission } : c));
    showToast(true, 'Amount updated');
  }

  async function createCommission() {
    if (!createAgent || !createClient || !createComm) { showToast(false, 'Agent, client, and commission amount are required'); return; }
    setCreating(true);
    const res = await fetch('/api/telemarketer/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id:          createAgent,
        client_name:       createClient,
        commission_amount: parseFloat(createComm),
        loan_amount:       createLoan ? parseFloat(createLoan) : null,
        status:            'Pending Collection',
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { showToast(false, data.error ?? 'Create failed'); return; }
    showToast(true, 'Commission created');
    setCreateOpen(false);
    setCreateAgent(''); setCreateClient(''); setCreateLoan(''); setCreateComm('');
    load();
  }

  async function bulkMarkPaid() {
    const ready = filtered.filter(c => c.status === 'Payroll Ready');
    if (ready.length === 0) return;
    if (!confirm(`Mark ${ready.length} commission${ready.length !== 1 ? 's' : ''} as Paid?`)) return;
    for (const c of ready) await updateStatus(c.id, 'Paid');
  }

  const agents = Array.from(
    new Map(commissions.map(c => [c.agent_id, { id: c.agent_id, name: c.agentName }])).values()
  );

  const filtered = commissions.filter(c => {
    if (agentFilter  && c.agent_id !== agentFilter)  return false;
    if (statusFilter && c.status   !== statusFilter)  return false;
    return true;
  });

  const totals = {
    pending:  commissions.filter(c => c.status === 'Pending Collection').reduce((s, c) => s + c.commission_amount, 0),
    ready:    commissions.filter(c => c.status === 'Payroll Ready').reduce((s, c) => s + c.commission_amount, 0),
    paid:     commissions.filter(c => c.status === 'Paid').reduce((s, c) => s + c.commission_amount, 0),
    total:    commissions.reduce((s, c) => s + c.commission_amount, 0),
  };

  const readyCount = filtered.filter(c => c.status === 'Payroll Ready').length;

  const selectStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border2)',
    color: 'var(--color-text2)',
  };

  return (
    <Shell>
      <div className="space-y-6 page-enter" style={{ padding: '28px 32px', maxWidth: 1200 }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-1">Finance</p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
              Payroll & Commissions
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              Approve compliance, release payroll, and mark commissions as paid
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}>
              <Plus size={14} /> New Commission
            </button>
            {readyCount > 0 && (
              <button
                onClick={bulkMarkPaid}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.1)'; }}>
                <CheckCircle2 size={14} />
                Mark {readyCount} as Paid
              </button>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
            style={{
              background: toast.ok ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${toast.ok ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
              color: toast.ok ? '#34D399' : '#F87171',
            }}>
            {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Create commission modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="bento-card w-full max-w-md p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New Commission</h3>
                <button onClick={() => setCreateOpen(false)} style={{ color: 'var(--color-text3)' }}><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Agent *</label>
                  <select className="field-input w-full" value={createAgent} onChange={e => setCreateAgent(e.target.value)}>
                    <option value="">Select agent…</option>
                    {agentOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Client name *</label>
                  <input className="field-input w-full" value={createClient} onChange={e => setCreateClient(e.target.value)} placeholder="e.g. ABC Company" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Loan amount (R)</label>
                    <input className="field-input w-full" type="number" min="0" value={createLoan} onChange={e => setCreateLoan(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Commission (R) *</label>
                    <input className="field-input w-full" type="number" min="0" value={createComm} onChange={e => setCreateComm(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setCreateOpen(false)}
                    className="flex-1 py-2 rounded-xl text-sm"
                    style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
                    Cancel
                  </button>
                  <button onClick={createCommission} disabled={creating}
                    className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5">
                    {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: 'Pending Approval', value: fmt(totals.pending), sub: `${commissions.filter(c => c.status === 'Pending Collection').length} records`,    color: '#FBBF24', rgb: '251,191,36',  icon: Clock,        filter: 'Pending Collection' as CommissionStatus },
            { label: 'Payroll Ready',    value: fmt(totals.ready),   sub: `${commissions.filter(c => c.status === 'Payroll Ready').length} to be paid`,       color: '#34D399', rgb: '52,211,153',  icon: Banknote,     filter: 'Payroll Ready' as CommissionStatus },
            { label: 'Paid Out',         value: fmt(totals.paid),    sub: `${commissions.filter(c => c.status === 'Paid').length} commissions paid`,           color: '#10B981', rgb: '16,185,129',  icon: CheckCircle2, filter: 'Paid' as CommissionStatus },
            { label: 'Total Portfolio',  value: fmt(totals.total),   sub: `${commissions.length} total commissions`,                                           color: '#A78BFA', rgb: '167,139,250', icon: DollarSign,   filter: '' },
          ] as const).map(card => (
            <button
              key={card.label}
              onClick={() => card.filter && setStatusFilter(prev => prev === card.filter ? '' : card.filter as CommissionStatus)}
              className="bento-card p-5 text-left transition-all hover:-translate-y-0.5"
              style={{
                background: statusFilter === card.filter && card.filter ? `rgba(${card.rgb},0.06)` : undefined,
                cursor: card.filter ? 'pointer' : 'default',
              }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${card.rgb},0.12)`, color: card.color }}>
                  <card.icon size={15} />
                </div>
                {statusFilter === card.filter && card.filter && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `rgba(${card.rgb},0.15)`, color: card.color }}>ACTIVE</span>
                )}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{card.label}</p>
              <p className="text-xl font-bold tracking-tight" style={{ color: loading ? 'var(--color-text3)' : 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                {loading ? '—' : card.value}
              </p>
              <p className="text-xs mt-1" style={{ color: card.color }}>{card.sub}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 rounded-xl text-sm font-medium"
              style={selectStyle}>
              {monthOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
          </div>

          {agents.length > 1 && (
            <div className="relative">
              <Users2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
              <select
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 rounded-xl text-sm font-medium"
                style={selectStyle}>
                <option value="">All agents</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
            </div>
          )}

          <p className="text-xs ml-auto" style={{ color: 'var(--color-text3)' }}>
            {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bento-card p-12 text-center">
            <AlertCircle size={24} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No commissions found for the selected filters.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bento-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Client</th>
                    <th>Loan Amount</th>
                    <th>Commission</th>
                    <th>Payroll Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG['Pending Collection'];
                    const busy = updating === c.id;
                    return (
                      <tr key={c.id} style={{ animation: `fade-up 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms both` }}>
                        <td>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.agentName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{c.agentEmail}</p>
                        </td>
                        <td>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{c.client_name}</p>
                          {c.leads?.company && (
                            <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{c.leads.company}</p>
                          )}
                        </td>
                        <td>
                          <span className="text-sm font-mono" style={{ color: 'var(--color-text2)' }}>{fmt(c.loan_amount)}</span>
                        </td>
                        <td>
                          {editingId === c.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min="0"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                className="field-input py-1 text-xs w-24"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') saveAmount(c.id); if (e.key === 'Escape') setEditingId(null); }}
                              />
                              <button onClick={() => saveAmount(c.id)} disabled={updating === c.id}
                                className="text-xs px-2 py-1 rounded-lg font-semibold"
                                style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
                                {updating === c.id ? <Loader2 size={10} className="animate-spin" /> : '✓'}
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ color: 'var(--color-text3)' }}>✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-sm font-bold font-mono" style={{ color: c.commission_amount === 0 ? '#F87171' : 'var(--color-text)' }}>
                                {fmt(c.commission_amount)}
                              </span>
                              {c.status !== 'Paid' && (
                                <button
                                  onClick={() => { setEditingId(c.id); setEditAmount(String(c.commission_amount)); setEditLoan(c.loan_amount ? String(c.loan_amount) : ''); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--color-text3)' }}>
                                  <Pencil size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                            {c.payroll_date
                              ? new Date(c.payroll_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {c.status === 'Pending Collection' && (
                            <button
                              onClick={() => updateStatus(c.id, 'Payroll Ready', lastDayOfCurrentMonth())}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)', opacity: busy ? 0.5 : 1 }}>
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Approve
                            </button>
                          )}
                          {c.status === 'Pending Payroll' && (
                            <button
                              onClick={() => updateStatus(c.id, 'Payroll Ready', lastDayOfCurrentMonth())}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)', opacity: busy ? 0.5 : 1 }}>
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Release
                            </button>
                          )}
                          {c.status === 'Payroll Ready' && (
                            <button
                              onClick={() => updateStatus(c.id, 'Paid')}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', opacity: busy ? 0.5 : 1 }}>
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <Banknote size={11} />}
                              Mark Paid
                            </button>
                          )}
                          {c.status === 'Paid' && (
                            <span className="flex items-center justify-end gap-1.5 text-xs" style={{ color: '#10B981' }}>
                              <CheckCircle2 size={13} />
                              {c.paid_at
                                ? new Date(c.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
                                : 'Paid'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function PayrollPage() {
  return (
    <Suspense>
      <PayrollPageInner />
    </Suspense>
  );
}
