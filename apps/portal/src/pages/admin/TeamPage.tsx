import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { initials } from '@/lib/utils';
import { UserPlus, X, Trash2, Power } from 'lucide-react';

type Role = 'admin' | 'branch_manager' | 'consultant';

interface Member {
  id:     string;
  name:   string;
  email:  string;
  role:   Role;
  branch: string;
  status: 'active' | 'invited' | 'inactive';
}

const ROLE_LABELS: Record<Role, string> = {
  admin:          'Admin',
  branch_manager: 'Branch manager',
  consultant:     'Consultant',
};

const INITIAL_TEAM: Member[] = [
  { id: 't1', name: 'Zanele Mokoena',  email: 'z.mokoena@client.co.za',  role: 'admin',          branch: 'Head Office',  status: 'active'   },
  { id: 't2', name: 'Kabelo Sithole',  email: 'k.sithole@client.co.za',  role: 'branch_manager', branch: 'Johannesburg', status: 'active'   },
  { id: 't3', name: 'Ayanda Dube',     email: 'a.dube@client.co.za',     role: 'consultant',     branch: 'Johannesburg', status: 'active'   },
  { id: 't4', name: 'Precious Ndlovu', email: 'p.ndlovu@client.co.za',   role: 'consultant',     branch: 'Pretoria',     status: 'inactive' },
];

export function TeamPage() {
  const [team, setTeam] = useState<Member[]>(INITIAL_TEAM);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Invite form state
  const [invite, setInvite] = useState({ name: '', email: '', role: 'consultant' as Role, branch: 'Head Office' });

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  function sendInvite() {
    if (!invite.name.trim() || !invite.email.trim()) {
      showToast('Name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)) {
      showToast('Enter a valid email.');
      return;
    }
    const newMember: Member = {
      id:     `t-${Date.now()}`,
      name:   invite.name.trim(),
      email:  invite.email.trim(),
      role:   invite.role,
      branch: invite.branch.trim() || 'Head Office',
      status: 'invited',
    };
    setTeam((prev) => [newMember, ...prev]);
    showToast(`Invite sent to ${newMember.email} · expires in 7 days.`);
    setInvite({ name: '', email: '', role: 'consultant', branch: 'Head Office' });
    setInviting(false);
  }

  function toggleStatus(m: Member) {
    setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x)));
    showToast(`${m.name} ${m.status === 'active' ? 'deactivated' : 'reactivated'}.`);
  }

  function removeMember(m: Member) {
    setTeam((prev) => prev.filter((x) => x.id !== m.id));
    showToast(`${m.name} removed from the team.`);
    setEditing(null);
  }

  function changeRole(m: Member, role: Role) {
    setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, role } : x)));
    showToast(`${m.name} role changed to ${ROLE_LABELS[role]}.`);
  }

  return (
    <div className="space-y-6 page-enter">
      {toast ? (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-lg" style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {toast}
        </div>
      ) : null}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team</h1>
          <p className="text-sm text-slate-500 mt-1">{team.filter((m) => m.status === 'active').length} active members · {team.filter((m) => m.status === 'invited').length} pending invites</p>
        </div>
        <Button size="md" onClick={() => setInviting(true)}>
          <UserPlus size={15} /> Invite member
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {team.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors"
              style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-muted)] flex items-center justify-center text-[var(--color-brand)] text-sm font-bold">
                  {initials(m.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500">{m.branch}</p>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value as Role)}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <Badge variant={m.status === 'active' ? 'success' : m.status === 'invited' ? 'info' : 'muted'} className="capitalize">{m.status}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite modal */}
      {inviting ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-6"
          onClick={() => setInviting(false)}
          style={{ animation: 'fade-in 0.2s ease-out both' }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-7"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Invite team member</h3>
                <p className="text-sm text-slate-500 mt-1">They'll receive an email with a sign-up link.</p>
              </div>
              <button onClick={() => setInviting(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <Input label="Full name"  value={invite.name}  onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))} placeholder="Lerato Naidoo" />
              <Input label="Work email" value={invite.email} onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))} placeholder="lerato@client.co.za" type="email" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
                  <select
                    value={invite.role}
                    onChange={(e) => setInvite((p) => ({ ...p, role: e.target.value as Role }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 cursor-pointer"
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <Input label="Branch" value={invite.branch} onChange={(e) => setInvite((p) => ({ ...p, branch: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={sendInvite} className="flex-1">Send invite</Button>
              <Button variant="outline" onClick={() => setInviting(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit member modal */}
      {editing ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-6"
          onClick={() => setEditing(null)}
          style={{ animation: 'fade-in 0.2s ease-out both' }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-7"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-muted)] flex items-center justify-center text-[var(--color-brand)] font-bold">
                  {initials(editing.name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">{editing.name}</h3>
                  <p className="text-xs text-slate-500">{editing.email}</p>
                </div>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Role</p>
                <p className="font-semibold">{ROLE_LABELS[editing.role]}</p>
              </div>
              <div className="text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Branch</p>
                <p className="font-semibold">{editing.branch}</p>
              </div>
              <div className="text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                <Badge variant={editing.status === 'active' ? 'success' : 'muted'} className="capitalize">{editing.status}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={() => { toggleStatus(editing); setEditing(null); }} variant="outline" className="w-full">
                <Power size={14} /> {editing.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </Button>
              <button
                onClick={() => {
                  if (window.confirm(`Remove ${editing.name} from the team? They will lose all access immediately.`)) {
                    removeMember(editing);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> Remove member
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
