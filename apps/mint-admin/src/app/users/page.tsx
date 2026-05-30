'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  UserPlus, Trash2, RotateCcw, Mail, Shield, Copy,
  CheckCircle2, Clock, Loader2, X,
} from 'lucide-react';

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
  const [inviting, setInviting]     = useState(false);
  const [resetLink, setResetLink]   = useState<{ email: string; link: string } | null>(null);
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
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    });
    const json = await res.json();
    if (!res.ok) {
      setToast({ kind: 'error', message: json.error ?? 'Invite failed' });
    } else {
      setToast({ kind: 'success', message: `Invite sent to ${inviteEmail}` });
      setInviteEmail(''); setInviteName('');
      setInviteOpen(false);
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
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Password reset link</h3>
              <button onClick={() => setResetLink(null)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--color-text3)' }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text3)' }}>
              Share this link with <strong style={{ color: 'var(--color-text)' }}>{resetLink.email}</strong>. It expires in 24 hours.
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
              Manage who has access to the Mint Platforms admin console.
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
            <form onSubmit={invite} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Full name</label>
                <input className="field-input" placeholder="Jane Smith" value={inviteName} onChange={e => setInviteName(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Email address</label>
                <input type="email" required className="field-input" placeholder="jane@mintplatforms.co.za" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="btn-purple btn-shine inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text3)' }}>
              An invitation email will be sent. The user sets their own password on first login.
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
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
                      >
                        <Shield size={10} />
                        {u.role.replace('_', ' ')}
                      </span>
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
                        {/* Reset password */}
                        <button
                          onClick={() => resetPassword(u)}
                          disabled={resetting === u.id}
                          title="Send password reset link"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          style={{ background: 'rgba(96,165,250,0.08)', color: 'var(--color-sky)', border: '1px solid rgba(96,165,250,0.15)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                        >
                          {resetting === u.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <RotateCcw size={11} />}
                          Reset password
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
        <div className="rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.14)', color: 'var(--color-text3)' }}>
          All users here have full access to the Mint Platforms admin console.
          Password reset links are valid for <strong style={{ color: 'var(--color-text)' }}>24 hours</strong> and must be shared directly with the user.
        </div>
      </div>
    </Shell>
  );
}
