'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  ShieldCheck, RefreshCw, Globe, Users, Zap, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertCircle, Plus, Key, Trash2, Loader2, Eye, EyeOff,
} from 'lucide-react';

interface ClientHealth {
  id: string; name: string; slug: string; tier: string; status: string;
  siteUrl: string; siteUp: boolean; latencyMs: number;
  totalUsers: number; activeUsers7d: number; lastActivity: string | null;
  apiCallsThisMonth: number;
}

interface ClientUser {
  id: string; email: string; full_name: string;
  role: string; updated_at: string;
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function StatusDot({ up, latency }: { up: boolean; latency: number }) {
  const color = !up ? '#f87171' : latency < 800 ? '#34d399' : '#fbbf24';
  const label = !up ? 'Offline' : latency < 800 ? `Online · ${latency}ms` : `Slow · ${latency}ms`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, display: 'inline-block' }} />
      {label}
    </span>
  );
}

export default function CompliancePage() {
  const [clients, setClients]         = useState<ClientHealth[]>([]);
  const [checkedAt, setCheckedAt]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [users, setUsers]             = useState<Record<string, ClientUser[]>>({});
  const [usersLoading, setUsersLoading] = useState<string | null>(null);
  const [toast, setToast]             = useState<{ kind: ToastKind; message: string } | null>(null);

  // New user form state
  const [inviteClientId, setInviteClientId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail]       = useState('');
  const [inviteName, setInviteName]         = useState('');
  const [inviteRole, setInviteRole]         = useState('loan_officer');
  const [invitePassword, setInvitePassword] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [inviting, setInviting]             = useState(false);

  // Password reset state
  const [resetUserId, setResetUserId]   = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showReset, setShowReset]         = useState(false);
  const [resetting, setResetting]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/compliance');
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients ?? []);
      setCheckedAt(data.checkedAt ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadUsers(clientId: string) {
    if (users[clientId]) return;
    setUsersLoading(clientId);
    const res = await fetch(`/api/clients/${clientId}/users`);
    if (res.ok) {
      const { users: data } = await res.json();
      setUsers(prev => ({ ...prev, [clientId]: data }));
    }
    setUsersLoading(null);
  }

  function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadUsers(id);
  }

  async function inviteUser(clientId: string) {
    if (!inviteEmail) return;
    setInviting(true);
    const res = await fetch(`/api/clients/${clientId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole, password: invitePassword || undefined }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) { setToast({ kind: 'error', message: data.error }); return; }
    setToast({ kind: 'success', message: `User ${inviteEmail} created` });
    setInviteClientId(null); setInviteEmail(''); setInviteName(''); setInvitePassword('');
    setUsers(prev => ({ ...prev, [clientId]: undefined as unknown as ClientUser[] }));
    loadUsers(clientId);
  }

  async function setPassword(clientId: string, userId: string) {
    if (!resetPassword) return;
    setResetting(true);
    const res = await fetch(`/api/clients/${clientId}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPassword }),
    });
    setResetting(false);
    if (!res.ok) { setToast({ kind: 'error', message: 'Failed to set password' }); return; }
    setToast({ kind: 'success', message: 'Password updated' });
    setResetUserId(null); setResetPassword('');
  }

  async function removeUser(clientId: string, userId: string, email: string) {
    if (!confirm(`Remove ${email} from this client?`)) return;
    await fetch(`/api/clients/${clientId}/users/${userId}`, { method: 'DELETE' });
    setUsers(prev => ({ ...prev, [clientId]: (prev[clientId] ?? []).filter(u => u.id !== userId) }));
    setToast({ kind: 'success', message: `${email} removed` });
  }

  const online = clients.filter(c => c.siteUp).length;
  const offline = clients.filter(c => !c.siteUp).length;

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={22} style={{ color: 'var(--color-accent)' }} /> Compliance & Monitoring
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text3)', marginTop: 4 }}>
              Site health, active users, and API usage across all client deployments
              {checkedAt && ` · Checked ${timeAgo(checkedAt)}`}
            </p>
          </div>
          <button onClick={load} disabled={loading} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total clients', value: clients.length, color: 'var(--color-text1)' },
            { label: 'Sites online',  value: online,  color: '#34d399' },
            { label: 'Sites offline', value: offline, color: offline > 0 ? '#f87171' : 'var(--color-text3)' },
            { label: 'Total users',   value: clients.reduce((s, c) => s + c.totalUsers, 0), color: 'var(--color-accent)' },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{loading ? '—' : k.value}</p>
            </div>
          ))}
        </div>

        {/* Client rows */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text3)' }}><Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /></div>
        ) : clients.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 8, overflow: 'hidden' }}>
            {/* Row header */}
            <div
              onClick={() => toggleExpand(c.id)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text1)' }}>{c.name}</span>
                <span className={`badge badge-${c.tier}`}>{c.tier}</span>
                <span className={`badge badge-${c.status}`}>{c.status}</span>
              </div>
              <StatusDot up={c.siteUp} latency={c.latencyMs} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-text2)' }}>
                <Users size={13} /> {c.totalUsers} users
                {c.activeUsers7d > 0 && <span style={{ color: '#34d399', fontSize: 11 }}>· {c.activeUsers7d} active</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={13} /> {c.apiCallsThisMonth.toLocaleString()} calls
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text3)' }}>
                {c.lastActivity ? timeAgo(c.lastActivity) : 'No activity'}
              </div>
              {expanded === c.id ? <ChevronUp size={16} style={{ color: 'var(--color-text3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text3)' }} />}
            </div>

            {/* Expanded: users panel */}
            {expanded === c.id && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 20px', background: 'var(--color-bg2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text3)' }}>Users</p>
                  <button onClick={() => setInviteClientId(inviteClientId === c.id ? null : c.id)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 12px' }}>
                    <Plus size={12} /> Add user
                  </button>
                </div>

                {/* Invite form */}
                {inviteClientId === c.id && (
                  <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div><label style={{ fontSize: 11, color: 'var(--color-text3)', fontWeight: 600 }}>Email *</label><input className="input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@client.co.za" style={{ marginTop: 4 }} /></div>
                    <div><label style={{ fontSize: 11, color: 'var(--color-text3)', fontWeight: 600 }}>Full name</label><input className="input" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Jane Smith" style={{ marginTop: 4 }} /></div>
                    <div><label style={{ fontSize: 11, color: 'var(--color-text3)', fontWeight: 600 }}>Role</label>
                      <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ marginTop: 4 }}>
                        <option value="loan_officer">Loan Officer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="borrower">Borrower</option>
                      </select>
                    </div>
                    <div><label style={{ fontSize: 11, color: 'var(--color-text3)', fontWeight: 600 }}>Password (optional)</label>
                      <div style={{ position: 'relative', marginTop: 4 }}>
                        <input className="input" type={showPassword ? 'text' : 'password'} value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Leave blank to send invite link" style={{ paddingRight: 36 }} />
                        <button onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text3)' }}>
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => inviteUser(c.id)} disabled={inviting || !inviteEmail} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                      {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                    </button>
                  </div>
                )}

                {/* User list */}
                {usersLoading === c.id ? (
                  <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text3)' }} /></div>
                ) : (users[c.id] ?? []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text3)', textAlign: 'center', padding: '16px 0' }}>No users yet — add one above.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: 'var(--color-text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Role</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Last active</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users[c.id] ?? []).map(u => (
                        <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '8px 8px', color: 'var(--color-text1)', fontWeight: 500 }}>{u.full_name}</td>
                          <td style={{ padding: '8px 8px', color: 'var(--color-text2)' }}>{u.email}</td>
                          <td style={{ padding: '8px 8px' }}><span className="badge">{u.role.replace('_', ' ')}</span></td>
                          <td style={{ padding: '8px 8px', color: 'var(--color-text3)' }}>{timeAgo(u.updated_at)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            {resetUserId === u.id ? (
                              <>
                                <div style={{ position: 'relative' }}>
                                  <input className="input" type={showReset ? 'text' : 'password'} value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="New password" style={{ fontSize: 12, padding: '4px 32px 4px 8px', width: 180 }} />
                                  <button onClick={() => setShowReset(p => !p)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text3)' }}>
                                    {showReset ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                </div>
                                <button onClick={() => setPassword(c.id, u.id)} disabled={resetting || !resetPassword} className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}>
                                  {resetting ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                </button>
                                <button onClick={() => { setResetUserId(null); setResetPassword(''); }} className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setResetUserId(u.id); setShowReset(false); }} className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Key size={12} /> Set password
                                </button>
                                <button onClick={() => removeUser(c.id, u.id, u.email)} className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Site link */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={13} style={{ color: 'var(--color-text3)' }} />
                  <a href={c.siteUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-accent)' }}>{c.siteUrl}</a>
                  {c.siteUp
                    ? <CheckCircle2 size={13} style={{ color: '#34d399' }} />
                    : <XCircle size={13} style={{ color: '#f87171' }} />}
                  {!c.siteUp && <span style={{ fontSize: 11, color: '#f87171' }}>Site unreachable</span>}
                </div>
              </div>
            )}
          </div>
        ))}

        {!loading && clients.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text3)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
            <p>No active clients to monitor.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
