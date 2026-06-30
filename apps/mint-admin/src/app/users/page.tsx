'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  UserPlus, Trash2, RotateCcw, Mail, Shield, Copy,
  CheckCircle2, Clock, Loader2, X, ChevronDown,
} from 'lucide-react';

const ROLES = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full access — users, settings, billing, everything',
    bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)', color: '#A78BFA',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access except user management and settings',
    bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', color: '#60A5FA',
  },
  {
    value: 'finance',
    label: 'Finance',
    description: 'Pricing, quotes, invoices and billing only',
    bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', color: '#34D399',
  },
  {
    value: 'support',
    label: 'Support',
    description: 'View-only: dashboard, clients, leads, applications',
    bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', color: '#FBBF24',
  },
] as const;

type RoleValue = typeof ROLES[number]['value'];

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLES.find(r => r.value === role) ?? ROLES[1];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Shield size={10} /> {cfg.label}
    </span>
  );
}

interface AdminUser {
  id:        string;
  email:     string;
  name:      string;
  role:      string;
  createdAt: string;
  lastSignIn: string | null;
  confirmed: boolean;
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UsersPage() {
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{ kind: ToastKind; message: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName]   = useState('');
  const [inviteRole, setInviteRole]   = useState<RoleValue>('admin');
  const [inviting, setInviting]     = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);
  const [resetLink, setResetLink]   = useState<{ email: string; link: string; isInvite?: boolean } | null>(null);
  const [resetting, setResetting]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    if (res.ok) {
      const { users: data } = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
    });
    const json = await res.json();
    if (!res.ok) {
      setToast({ kind: 'error', message: json.error ?? 'Invite failed' });
    } else {
      setInviteOpen(false);
      if (json.setupLink) {
        // Email already sent — show toast + keep link modal as backup
        setToast({ kind: 'success', message: `Invite email sent to ${inviteEmail}. Setup link also copied below.` });
        setResetLink({ email: inviteEmail, link: json.setupLink, isInvite: true });
      } else {
        setToast({ kind: 'success', message: `${inviteEmail} created — no setup link available` });
      }
      setInviteEmail(''); setInviteName(''); setInviteRole('admin');
      load();
    }
    setInviting(false);
  }

  async function resetPassword(user: AdminUser) {
    setResetting(user.id);
    const res  = await fetch(`/api/users/${user.id}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      setToast({ kind: 'error', message: json.error ?? 'Reset failed' });
    } else {
      setResetLink({ email: user.email, link: json.resetLink });
      if (!json.emailSent) {
        setToast({ kind: 'error', message: `Email delivery failed — copy the link below and share it manually.` });
      }
    }
    setResetting(null);
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Remove ${user.email} from the admin console? This cannot be undone.`)) return;
    setDeleting(user.id);
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      setToast({ kind: 'success', message: `${user.email} removed.` });
      load();
    } else {
      const { error } = await res.json();
      setToast({ kind: 'error', message: error ?? 'Delete failed' });
    }
    setDeleting(null);
  }

  async function changeRole(user: AdminUser, role: RoleValue) {
    setRoleDropdown(null);
    if (role === user.role) return;
    setChangingRole(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setToast({ kind: 'success', message: `${user.name}'s role updated to ${ROLES.find(r => r.value === role)?.label}.` });
      load();
    } else {
      const { error } = await res.json();
      setToast({ kind: 'error', message: error ?? 'Role change failed' });
    }
    setChangingRole(null);
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    setToast({ kind: 'success', message: 'Reset link copied to clipboard.' });
  }

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      {/* Reset link modal */}
      {resetLink && (
        <div className="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bento-card w-full max-w-md p-7" style={{ animation: 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{resetLink.isInvite ? 'Account setup link' : 'Password reset link'}</h3>
              <button onClick={() => setResetLink(null)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--color-text3)' }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text3)' }}>
              {resetLink.isInvite ? 'Send this link to ' : 'Share this link with '}
              <strong style={{ color: 'var(--color-text)' }}>{resetLink.email}</strong>
              {resetLink.isInvite ? ' — they\'ll use it to set their password and log in.' : '. It expires in 24 hours.'}
            </p>
            <div
              className="flex items-center gap-2 p-3 rounded-xl font-mono text-xs break-all mb-4"
              style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', color: 'var(--color-violet)' }}
            >
              <span className="flex-1 truncate">{resetLink.link}</span>
              <button onClick={() => copyLink(resetLink.link)} className="shrink-0 cursor-pointer p-1 rounded" style={{ color: 'var(--color-text3)' }}>
                <Copy size={13} />
              </button>
            </div>
            <button
              onClick={() => { copyLink(resetLink.link); setResetLink(null); }}
              className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2"
            >
              <Copy size={14} /> Copy & close
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Admin Console</p>
            <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Users</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
              Manage who has access to the MINT Platforms admin console.
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="btn-purple btn-shine inline-flex items-center gap-1.5"
          >
            <UserPlus size={15} /> Invite user
          </button>
        </div>

        {/* Invite form */}
        {inviteOpen && (
          <div className="bento-card p-6" style={{ borderColor: 'rgba(124,58,237,0.25)', animation: 'slide-down 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Invite a new admin user</p>
              <button onClick={() => setInviteOpen(false)} className="cursor-pointer" style={{ color: 'var(--color-text3)' }}><X size={15} /></button>
            </div>
            <form onSubmit={invite} className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Full name</label>
                  <input className="field-input" placeholder="Jane Smith" value={inviteName} onChange={e => setInviteName(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Email address</label>
                  <input type="email" required className="field-input" placeholder="jane@mintplatforms.co.za" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-2" style={{ color: 'var(--color-text3)' }}>Role</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setInviteRole(r.value)}
                      className="text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer"
                      style={inviteRole === r.value
                        ? { background: r.bg, border: `1px solid ${r.border}`, color: r.color }
                        : { background: 'transparent', border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                    >
                      <p className="text-xs font-semibold">{r.label}</p>
                      <p className="text-[10px] mt-0.5 leading-tight opacity-75">{r.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="btn-purple btn-shine inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {inviting ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text3)' }}>
              An invitation email with a password-setup link will be sent automatically to the user.
            </p>
          </div>
        )}

        {/* Users table */}
        <div className="bento-card overflow-hidden p-0">
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),rgba(167,139,250,0.3),transparent)' }} />
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {['User', 'Role', 'Status', 'Last sign-in', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ animation: 'fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                    <td>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{u.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>{u.email}</p>
                      </div>
                    </td>
                    <td>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setRoleDropdown(roleDropdown === u.id ? null : u.id)}
                          disabled={changingRole === u.id}
                          className="inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {changingRole === u.id
                            ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
                            : <RoleBadge role={u.role} />
                          }
                          <ChevronDown size={10} style={{ color: 'var(--color-text3)' }} />
                        </button>
                        {roleDropdown === u.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setRoleDropdown(null)} />
                            <div
                              className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden w-56"
                              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                            >
                              {ROLES.map(r => (
                                <button
                                  key={r.value}
                                  onClick={() => changeRole(u, r.value)}
                                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors cursor-pointer"
                                  style={{ borderBottom: '1px solid var(--color-border2)' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                  <span className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                                  <div>
                                    <p className="text-xs font-semibold" style={{ color: r.value === u.role ? r.color : 'var(--color-text)' }}>{r.label}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{r.description}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full`}
                        style={u.confirmed ? {
                          background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.2)',
                        } : {
                          background: 'rgba(251,191,36,0.1)', color: 'var(--color-amber)', border: '1px solid rgba(251,191,36,0.2)',
                        }}
                      >
                        {u.confirmed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {u.confirmed ? 'Active' : 'Invite pending'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text3)' }}>
                        {timeAgo(u.lastSignIn)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 justify-end">
                        {/* Reset / Resend invite password */}
                        <button
                          onClick={() => resetPassword(u)}
                          disabled={resetting === u.id}
                          title={u.confirmed ? 'Send password reset link' : 'Resend invite email'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          style={u.confirmed
                            ? { background: 'rgba(96,165,250,0.08)', color: 'var(--color-sky)', border: '1px solid rgba(96,165,250,0.15)' }
                            : { background: 'rgba(251,191,36,0.08)', color: 'var(--color-amber)', border: '1px solid rgba(251,191,36,0.2)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                        >
                          {resetting === u.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <RotateCcw size={11} />}
                          {u.confirmed ? 'Reset password' : 'Resend invite'}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={deleting === u.id}
                          title="Remove user"
                          className="p-1.5 rounded-lg transition-all cursor-pointer"
                          style={{ color: 'var(--color-text3)' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-red)'; el.style.background = 'rgba(248,113,113,0.08)'; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-text3)'; el.style.background = 'transparent'; }}
                        >
                          {deleting === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
                      No users yet. Invite the first admin user above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl px-4 py-4 text-xs leading-relaxed space-y-2"
          style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.14)', color: 'var(--color-text3)' }}>
          <p className="font-semibold text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text2)' }}>Role access levels</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ROLES.map(r => (
              <div key={r.value} className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                <span><strong style={{ color: r.color }}>{r.label}</strong> — {r.description}</span>
              </div>
            ))}
          </div>
          <p className="pt-1" style={{ borderTop: '1px solid rgba(124,58,237,0.1)' }}>
            The first <strong style={{ color: 'var(--color-text)' }}>Super Admin</strong> is created directly in the Supabase Auth dashboard.
            Password reset links are valid for <strong style={{ color: 'var(--color-text)' }}>24 hours</strong>.
          </p>
        </div>
      </div>
    </Shell>
  );
}
