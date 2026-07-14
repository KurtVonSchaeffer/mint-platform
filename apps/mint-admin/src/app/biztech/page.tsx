'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, FolderKanban, FileText, Receipt, TrendingUp, Calendar,
  Plus, Loader2, Phone, Mail, Users, StickyNote, ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PANEL: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 };

function centsToRand(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
}

interface Task {
  id: string; title: string; due_date: string;
  biztech_projects: { name: string } | null;
}
interface Activity {
  id: string; type: 'call' | 'email' | 'meeting' | 'note'; summary: string; occurred_at: string;
  biztech_clients: { name: string } | null;
}
interface DashboardData {
  clients: number;
  activeProjects: number;
  quotesSentThisMonth: number;
  outstandingCents: number;
  revenueMtdCents: number;
  upcomingTasks: Task[];
  recentActivities: Activity[];
}

const ACTIVITY_ICON: Record<Activity['type'], React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  call: Phone, email: Mail, meeting: Users, note: StickyNote,
};

export default function BizTechDashboard() {
  const router = useRouter();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/biztech/dashboard');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = [
    { label: 'Total Clients',        value: data ? String(data.clients) : '—',             icon: Building2,    sub: 'All statuses',       color: '#5C3BCF',           href: '/biztech/clients' },
    { label: 'Active Projects',      value: data ? String(data.activeProjects) : '—',       icon: FolderKanban, sub: 'Planning or active', color: 'var(--color-sky)', href: '/biztech/projects' },
    { label: 'Quotes Sent',          value: data ? String(data.quotesSentThisMonth) : '—',  icon: FileText,     sub: 'This month',         color: '#DDC357',           href: '/biztech/quotes' },
    { label: 'Outstanding Invoices', value: data ? centsToRand(data.outstandingCents) : '—', icon: Receipt,      sub: 'Sent + overdue',     color: 'var(--color-red)', href: '/biztech/invoices' },
    { label: 'Revenue (MTD)',        value: data ? centsToRand(data.revenueMtdCents) : '—',  icon: TrendingUp,   sub: 'Paid this month',    color: '#22C55E',           href: '/biztech/reports' },
    { label: 'Upcoming Tasks',       value: data ? String(data.upcomingTasks.length) : '—',  icon: Calendar,     sub: 'Due soon',           color: 'var(--color-amber)', href: '/biztech/projects' },
  ];

  const quickActions = [
    { label: 'Add client',  href: '/biztech/clients' },
    { label: 'New quote',   href: '/biztech/quotes' },
    { label: 'New invoice', href: '/biztech/invoices' },
    { label: 'New project', href: '/biztech/projects' },
  ];

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>IT consulting &amp; software services workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          {quickActions.map(a => (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-transform hover:scale-[1.04] active:scale-[0.97]"
              style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            >
              <Plus size={12} /> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => router.push(s.href)}
            className="biztech-tile p-5 text-left cursor-pointer"
            style={{ ...PANEL, borderLeft: `2px solid ${s.color}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${s.color}1A` }}>
                <s.icon size={13} style={{ color: s.color }} />
              </div>
            </div>
            {loading ? (
              <Loader2 size={16} className="animate-spin mt-1" style={{ color: 'var(--color-text3)' }} />
            ) : (
              <p className="stat-value text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>{s.value}</p>
            )}
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text3)' }}>{s.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent activity</p>
            <button onClick={() => router.push('/biztech/crm')} className="text-xs font-medium inline-flex items-center gap-1 cursor-pointer" style={{ color: '#5C3BCF' }}>
              View CRM <ArrowRight size={11} />
            </button>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin" style={{ color: '#5C3BCF' }} />
              </div>
            ) : !data || data.recentActivities.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--color-text3)' }}>No activity logged yet.</p>
            ) : (
              data.recentActivities.map(a => {
                const Icon = ACTIVITY_ICON[a.type];
                return (
                  <div key={a.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(92,59,207,0.1)' }}>
                      <Icon size={12} style={{ color: '#5C3BCF' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{a.biztech_clients?.name ?? 'Unknown client'}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{a.summary}</p>
                    </div>
                    <span className="text-[10px] shrink-0 font-mono" style={{ color: 'var(--color-text3)' }}>
                      {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Upcoming tasks</p>
            <button onClick={() => router.push('/biztech/projects')} className="text-xs font-medium inline-flex items-center gap-1 cursor-pointer" style={{ color: '#5C3BCF' }}>
              View projects <ArrowRight size={11} />
            </button>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin" style={{ color: '#5C3BCF' }} />
              </div>
            ) : !data || data.upcomingTasks.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--color-text3)' }}>No upcoming tasks with a due date.</p>
            ) : (
              data.upcomingTasks.map(t => (
                <div key={t.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(221,195,87,0.15)' }}>
                    <Calendar size={12} style={{ color: 'var(--color-amber)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{t.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text3)' }}>{t.biztech_projects?.name ?? 'No project'}</p>
                  </div>
                  <span className="text-[10px] shrink-0 font-mono" style={{ color: 'var(--color-text3)' }}>
                    {new Date(t.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
