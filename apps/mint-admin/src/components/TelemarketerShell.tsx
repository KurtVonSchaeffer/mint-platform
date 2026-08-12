'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Filter, Users2, Calendar, FileUp, DollarSign,
  FileText, User, LogOut, Sun, Moon, Menu, X, Bell,
  ChevronRight, ChevronDown, Phone, TrendingUp, Target,
  Banknote, CheckCircle2, AlertCircle, Loader2, Clock,
  AlertTriangle, BarChart3, Kanban, Receipt,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };
type NavItem   = { label: string; href: string; icon: React.ComponentType<IconProps>; badge?: string };

const AGENT_NAV: NavItem[] = [
  { label: 'Dashboard',         href: '/telemarketer',              icon: LayoutGrid  },
  { label: 'Pipeline',          href: '/telemarketer/pipeline',     icon: Kanban      },
  { label: 'My Leads',          href: '/telemarketer/leads',        icon: Filter      },
  { label: 'My Clients',        href: '/telemarketer/clients',      icon: Users2      },
  { label: 'Follow Ups',        href: '/telemarketer/follow-ups',   icon: Calendar    },
  { label: 'Analytics',         href: '/telemarketer/analytics',    icon: BarChart3   },
  { label: 'Documents',         href: '/telemarketer/documents',    icon: FileUp      },
  { label: 'Quotes',            href: '/telemarketer/quotes',       icon: Receipt     },
  { label: 'Statements',        href: '/telemarketer/statements',   icon: FileText    },
  { label: 'Profile',           href: '/telemarketer/profile',      icon: User        },
];

// Extra items visible only to super_admin / manager
const MANAGER_NAV: NavItem[] = [
  { label: 'Team Performance',  href: '/telemarketer/team',         icon: BarChart3   },
];

// Visible to super_admin only
const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'Commission Centre', href: '/telemarketer/commission',   icon: DollarSign  },
];

const AGENT_COLORS = ['#A78BFA', '#34D399', '#60A5FA', '#FB923C', '#F472B6', '#FBBF24'];

export const SESSION_KEY_AGENT = 'tm_viewing_as';

type Agent = { id: string; name: string; initials: string; color: string };

function AlgoLendLogo({ height = 28, isLight }: { height?: number; isLight: boolean }) {
  const src   = isLight ? '/algolend-logo.png' : '/algolend-logo-dark.png';
  const width = Math.round(height * (993 / 244));
  return (
    <Image src={src} alt="AlgoLend" width={width} height={height} style={{ objectFit: 'contain' }} priority />
  );
}

export function TelemarketerShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const router     = useRouter();
  const { theme, toggle } = useTheme();
  const isLight    = theme === 'light';

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [bellOpen,     setBellOpen]     = useState(false);
  const [hovered,      setHovered]      = useState<string | null>(null);
  const [userEmail,    setUserEmail]    = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('TM');
  const [userName,     setUserName]     = useState('Telemarketer');
  const [userRole,     setUserRole]     = useState<string>('telemarketer');
  const [viewAsOpen,   setViewAsOpen]   = useState(false);
  const [viewingAsId,  setViewingAsId]  = useState<string>('');
  const [agents,       setAgents]       = useState<Agent[]>([]);
  const [quickStats,   setQuickStats]   = useState<{ calls: number; leads: number; live: number } | null>(null);
  const [agentId,      setAgentId]      = useState<string>('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY_AGENT) : null;
    if (saved) setViewingAsId(saved);
  }, []);

  useEffect(() => {
    fetch('/api/telemarketer/agents')
      .then(r => r.json())
      .then(d => {
        const list: Agent[] = (d.users ?? []).map((u: { id: string; name: string }, i: number) => ({
          id:       u.id,
          name:     u.name,
          initials: u.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
          color:    AGENT_COLORS[i % AGENT_COLORS.length],
        }));
        setAgents(list);
        // Set first agent as default if none selected yet
        if (!sessionStorage.getItem(SESSION_KEY_AGENT) && list.length > 0) {
          sessionStorage.setItem(SESSION_KEY_AGENT, list[0].id);
          setViewingAsId(list[0].id);
        }
      })
      .catch(() => {/* fail silently */});
  }, []);

  const bellRef   = useRef<HTMLDivElement>(null);
  const viewAsRef = useRef<HTMLDivElement>(null);

  type NotifItem = { kind: 'warn' | 'info' | 'ok'; text: string; sub: string };
  const [notifs,      setNotifs]      = useState<NotifItem[]>([]);
  const [notifBadge,  setNotifBadge]  = useState(0);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const email    = user.email ?? '';
      const name     = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'Telemarketer';
      const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'TM';
      setUserEmail(email);
      setUserName(name);
      setUserInitials(initials);
      const role = (user.user_metadata?.role as string | undefined) ?? 'telemarketer';
      setUserRole(role);

      // Fetch live sidebar stats
      const agentId = role === 'telemarketer'
        ? user.id
        : (typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY_AGENT) : null) ?? '';
      setAgentId(agentId);
      if (agentId) {
        fetch(`/api/telemarketer/dashboard?agent_id=${agentId}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) setQuickStats({ calls: d.activity?.callsToday ?? 0, leads: d.leads?.total ?? 0, live: d.clients?.live ?? 0 });
          })
          .catch(() => {/* non-blocking */});
      }

      // Live bell notifications
      fetch('/api/telemarketer/notifications')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const items: NotifItem[] = [];
          if (d.overdue > 0)  items.push({ kind: 'warn', text: `${d.overdue} overdue follow-up${d.overdue !== 1 ? 's' : ''}`, sub: 'Past due — needs immediate action' });
          if (d.dueToday > 0) items.push({ kind: 'info', text: `${d.dueToday} follow-up${d.dueToday !== 1 ? 's' : ''} due today`, sub: 'Check your Follow Ups tab' });
          if (d.newLeads > 0) items.push({ kind: 'ok',   text: `${d.newLeads} new lead${d.newLeads !== 1 ? 's' : ''} assigned`, sub: 'Ready to call in My Leads' });
          // Quote update notifications from admin
          for (const n of (d.quoteUpdates ?? []) as { type: string; title: string; message: string }[]) {
            items.push({ kind: n.type === 'quote_declined' ? 'warn' : 'ok', text: n.title, sub: n.message });
          }
          setNotifs(items);
          setNotifBadge(d.total ?? 0);
        })
        .catch(() => {/* non-blocking */});
    });
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (viewAsRef.current && !viewAsRef.current.contains(e.target as Node)) setViewAsOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // In-app due-alert toasts
  type DueAlert = { key: string; leadId: string; client: string; type: string; minsAway: number };
  const [dueAlerts, setDueAlerts] = useState<DueAlert[]>([]);

  function playChime() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } catch { /* audio not available */ }
  }

  // Browser + in-app notification reminders — double warning: 15 min + 5 min
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!agentId || typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    type FuItem = { id: string; lead_id: string; follow_up_type: string; scheduled_at: string; completed: boolean; leads?: { name: string } };

    function fire(fu: FuItem, key: string, minsAway: number) {
      if (notifiedIdsRef.current.has(key)) return;
      notifiedIdsRef.current.add(key);
      playChime();

      const client = fu.leads?.name ?? 'Client';
      const label  = minsAway <= 0 ? 'Due now!' : `In ${minsAway} min`;

      // In-app toast
      const alertKey = `${key}-${Date.now()}`;
      setDueAlerts(prev => [...prev, { key: alertKey, leadId: fu.lead_id, client, type: fu.follow_up_type, minsAway }]);
      setTimeout(() => setDueAlerts(prev => prev.filter(a => a.key !== alertKey)), 10_000);

      // OS notification
      if (Notification.permission === 'granted') {
        const notif = new Notification(`Follow-up ${label}`, {
          body: `${client} — ${fu.follow_up_type}`,
          icon: '/algolend-logo-dark.png',
          tag: key,
        });
        notif.onclick = () => { window.focus(); router.push(`/telemarketer/leads/${fu.lead_id}`); notif.close(); };
      }
    }

    function checkReminders() {
      fetch(`/api/telemarketer/follow-ups?agent_id=${agentId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const now = Date.now();
          for (const fu of (d.follow_ups ?? []) as FuItem[]) {
            if (fu.completed) continue;
            // Skip old date-only entries stored as midnight SAST (T22:00:00+00:00)
            const inSAST = new Date(new Date(fu.scheduled_at).getTime() + 2 * 60 * 60 * 1000);
            if (inSAST.getUTCHours() === 0 && inSAST.getUTCMinutes() === 0) continue;

            const due  = new Date(fu.scheduled_at).getTime();
            const diff = due - now;
            const mins = Math.ceil(diff / 60000);

            // 15-min warning: 5 < diff ≤ 15 min
            if (diff > 5 * 60 * 1000 && diff <= 15 * 60 * 1000) {
              fire(fu, `${fu.id}-15`, mins);
            }
            // 5-min / due / recently overdue warning: diff ≤ 5 min and within last 60 min
            if (diff <= 5 * 60 * 1000 && diff >= -60 * 60 * 1000) {
              fire(fu, `${fu.id}-5`, Math.max(0, mins));
            }
          }
        })
        .catch(() => {/* non-blocking */});
    }

    checkReminders();
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, [agentId, router]);

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isSuperAdmin = userRole === 'super_admin';

  const navColors = {
    activeText:   isLight ? '#6D28D9'                  : '#DDD0FF',
    hoverText:    isLight ? '#1A1F36'                  : 'rgba(238,240,255,0.85)',
    normalText:   isLight ? '#42466B'                  : 'rgba(139,144,180,0.8)',
    activeBg:     isLight
      ? 'linear-gradient(90deg, rgba(124,58,237,0.13) 0%, rgba(124,58,237,0.04) 100%)'
      : 'linear-gradient(90deg, rgba(124,58,237,0.30) 0%, rgba(124,58,237,0.08) 100%)',
    activeShadow: isLight
      ? 'inset 3px 0 0 #7C3AED'
      : 'inset 3px 0 0 #9B5CF6, 0 2px 20px rgba(124,58,237,0.18)',
    hoverBg:      isLight ? 'rgba(124,58,237,0.07)' : 'rgba(124,58,237,0.10)',
    iconActiveBg: isLight ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.28)',
    subText:      isLight ? 'rgba(109,40,217,0.45)'  : 'rgba(167,139,250,0.5)',
    liveText:     isLight ? 'rgba(16,185,129,0.7)'   : 'rgba(52,211,153,0.6)',
    signOutNorm:  isLight ? '#8B90B4' : 'var(--color-text3)',
    topBarBg:     isLight ? 'rgba(248,246,255,0.97)' : 'rgba(12,14,26,0.94)',
    topBarBorder: isLight ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.18)',
    topBarShadow: isLight
      ? '0 1px 12px rgba(0,0,0,0.06), 0 1px 0 rgba(124,58,237,0.08)'
      : '0 1px 0 rgba(124,58,237,0.16), 0 4px 24px rgba(0,0,0,0.25)',
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>

      {/* ── Mobile header ──────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30"
        style={{ background: 'var(--color-surface)', borderBottom: `1px solid ${navColors.topBarBorder}` }}
      >
        <AlgoLendLogo height={22} isLight={isLight} />
        <button
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle menu"
          className="w-11 h-11 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--color-text2)' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Desktop top bar ────────────────────────────────────── */}
      <div
        className="hidden lg:flex fixed top-0 left-64 right-0 h-14 items-center gap-4 px-8 z-30"
        style={{
          background: navColors.topBarBg,
          borderBottom: `1px solid ${navColors.topBarBorder}`,
          boxShadow: navColors.topBarShadow,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Page pill */}
        {(() => {
          const allNav = [...MANAGER_NAV, ...AGENT_NAV, ...SUPER_ADMIN_NAV];
          const page = allNav.find(n =>
            n.href === '/telemarketer' ? pathname === '/telemarketer' : pathname.startsWith(n.href)
          );
          const PageIcon = page?.icon;
          return (
            <div className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.22)' }}>
              {PageIcon && <PageIcon size={12} style={{ color: 'var(--color-violet)' }} />}
              <span className="text-xs font-semibold" style={{ color: 'var(--color-violet)' }}>
                {page?.label ?? 'Telemarketer'}
              </span>
            </div>
          );
        })()}
        <span style={{ color: 'var(--color-border3)', fontSize: 12, opacity: 0.5 }}>›</span>

        {/* Earnings pill — quick win reminder */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <TrendingUp size={11} style={{ color: '#34D399' }} />
          <span className="text-xs font-semibold" style={{ color: '#34D399' }}>Calls → Live Clients → Commission</span>
        </div>

        <div className="ml-auto flex items-center gap-2">

          {/* View As dropdown — Super Admin only */}
          {isSuperAdmin && (
            <div ref={viewAsRef} className="relative">
              {(() => {
                const currentAgent = agents.find(a => a.id === viewingAsId);
                return (
                  <button
                    onClick={() => setViewAsOpen(o => !o)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#FBBF24' }}
                  >
                    <Target size={11} />
                    {currentAgent ? currentAgent.name.split(' ')[0] : 'Pick agent'}
                    <ChevronDown size={10} className={`transition-transform ${viewAsOpen ? 'rotate-180' : ''}`} />
                  </button>
                );
              })()}
              {viewAsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 shadow-2xl"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border2)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    animation: 'slide-down 0.2s cubic-bezier(0.16,1,0.3,1) both',
                  }}
                >
                  <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text3)' }}>Switch agent view</p>
                  </div>
                  {agents.length === 0 && (
                    <p className="px-3 py-4 text-xs text-center" style={{ color: 'var(--color-text3)' }}>No telemarketer accounts yet</p>
                  )}
                  {agents.map(agent => (
                    <button key={agent.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors"
                      style={{ color: agent.id === viewingAsId ? agent.color : 'var(--color-text2)' }}
                      onClick={() => {
                        sessionStorage.setItem(SESSION_KEY_AGENT, agent.id);
                        setViewingAsId(agent.id);
                        setViewAsOpen(false);
                        router.refresh();
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ background: agent.color }}>
                        {agent.initials}
                      </div>
                      <span className="flex-1">{agent.name}</span>
                      {agent.id === viewingAsId && <span style={{ opacity: 0.5 }}>✓</span>}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--color-border2)' }}>
                    <Link href="/"
                      onClick={() => setViewAsOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs transition-colors"
                      style={{ color: 'var(--color-text3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      ← Back to Admin Console
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => {
                const opening = !bellOpen;
                setBellOpen(o => !o);
                if (opening && notifBadge > 0) {
                  fetch('/api/telemarketer/notifications', { method: 'PATCH' }).catch(() => {});
                  setNotifBadge(0);
                }
              }}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: bellOpen ? 'var(--color-violet)' : 'var(--color-text3)', background: bellOpen ? 'rgba(124,58,237,0.1)' : 'transparent' }}
              onMouseEnter={e => { if (!bellOpen) { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; } }}
              onMouseLeave={e => { if (!bellOpen) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; } }}
            >
              <Bell size={15} />
              {notifBadge > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--color-violet)', border: '1.5px solid var(--color-surface)' }} aria-hidden />
              )}
            </button>
            {bellOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 24px 64px rgba(0,0,0,0.45)', animation: 'slide-down 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Notifications</p>
                  {notifBadge > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>{notifBadge}</span>}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifs.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2" style={{ color: '#34D399' }} />
                      <p className="text-xs" style={{ color: 'var(--color-text3)' }}>All caught up!</p>
                    </div>
                  )}
                  {notifs.map((n, i) => {
                    const icon = n.kind === 'ok'
                      ? <CheckCircle2 size={13} style={{ color: '#34D399' }} />
                      : n.kind === 'warn'
                        ? <AlertCircle size={13} style={{ color: '#F87171' }} />
                        : <AlertTriangle size={13} style={{ color: '#FBBF24' }} />;
                    const iconBg = n.kind === 'ok' ? 'rgba(52,211,153,0.1)' : n.kind === 'warn' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)';
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3"
                        style={{ borderBottom: i < notifs.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: iconBg }}>{icon}</div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{n.text}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{n.sub}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button onClick={toggle} aria-label="Toggle theme"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Quick call CTA */}
          <Link href="/telemarketer/leads"
            className="btn-purple btn-shine inline-flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
          >
            <Phone size={12} />
            Start Calling
          </Link>
        </div>
      </div>

      {/* ── Mobile overlay ───────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-20" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`sidebar-panel fixed inset-y-0 left-0 w-64 flex flex-col z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full" aria-hidden
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, rgba(124,58,237,0.14) 40%, transparent 70%)', filter: 'blur(20px)', opacity: isLight ? 0.4 : 1 }} />
        <div className="absolute left-0 top-20 bottom-20 w-px pointer-events-none" aria-hidden
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(52,211,153,0.4) 30%, rgba(124,58,237,0.4) 60%, transparent 100%)', animation: 'glow-pulse 3s ease-in-out infinite' }} />

        {/* Brand */}
        <div className="sidebar-brand flex flex-col h-auto px-5 pt-4 pb-3 shrink-0 relative gap-2">
          <div className="flex items-center gap-3">
            <AlgoLendLogo height={26} isLight={isLight} />
            <div className="ml-auto flex items-center gap-1.5">
              <div className="relative flex items-center justify-center w-3 h-3">
                <div className="absolute w-1.5 h-1.5 rounded-full" aria-hidden style={{ background: 'var(--color-green)', animation: 'radar-ring 2s ease-out infinite' }} />
                <div className="w-1.5 h-1.5 rounded-full relative" style={{ background: 'var(--color-green)' }} />
              </div>
              <span style={{ color: navColors.liveText, fontSize: 9, letterSpacing: '0.08em' }}>Live</span>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg flex items-center gap-2"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)' }}>
            <Banknote size={11} style={{ color: '#34D399' }} />
            <span className="text-[10px] font-semibold" style={{ color: '#34D399' }}>Telemarketer Workspace</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto relative">
          {/* Manager-only section at the top */}
          {(isSuperAdmin || userRole === 'manager') && (
            <>
              {MANAGER_NAV.map(({ label, href, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                const isHov    = hovered === href;
                return (
                  <Link key={href} href={href}
                    onClick={() => setSidebarOpen(false)}
                    onMouseEnter={() => setHovered(href)}
                    onMouseLeave={() => setHovered(null)}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                    style={isActive
                      ? { background: navColors.activeBg, color: navColors.activeText, fontWeight: 600, boxShadow: navColors.activeShadow }
                      : isHov
                        ? { background: navColors.hoverBg, color: navColors.hoverText }
                        : { color: navColors.normalText }}
                  >
                    <div className="relative z-10 w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={isActive ? { color: navColors.activeText, background: navColors.iconActiveBg } : { color: 'inherit', opacity: 0.65 }}>
                      <Icon size={14} />
                    </div>
                    <span className="relative z-10 flex-1">{label}</span>
                    {isActive && <ChevronRight size={12} className="relative z-10 shrink-0" style={{ color: 'rgba(124,58,237,0.5)' }} />}
                  </Link>
                );
              })}
              <div className="my-2 mx-3 h-px" style={{ background: 'var(--color-border2)' }} />
            </>
          )}

          {AGENT_NAV.map(({ label, href, icon: Icon, badge }) => {
            const isActive = href === '/telemarketer' ? pathname === '/telemarketer' : pathname.startsWith(href);
            const isHov    = hovered === href;
            return (
              <Link key={href} href={href}
                onClick={() => setSidebarOpen(false)}
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                style={isActive
                  ? { background: navColors.activeBg, color: navColors.activeText, fontWeight: 600, boxShadow: navColors.activeShadow }
                  : isHov
                    ? { background: navColors.hoverBg, color: navColors.hoverText }
                    : { color: navColors.normalText }}
              >
                <div className="relative z-10 w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                  style={isActive ? { color: navColors.activeText, background: navColors.iconActiveBg } : { color: 'inherit', opacity: 0.65 }}>
                  <Icon size={14} />
                </div>
                <span className="relative z-10 flex-1">{label}</span>
                {badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>{badge}</span>
                )}
                {isActive && <ChevronRight size={12} className="relative z-10 shrink-0" style={{ color: 'rgba(124,58,237,0.5)' }} />}
              </Link>
            );
          })}


          {/* Commission Centre — super_admin only */}
          {isSuperAdmin && (
            <>
              <div className="my-2 mx-3 h-px" style={{ background: 'var(--color-border2)' }} />
              {SUPER_ADMIN_NAV.map(({ label, href, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                const isHov    = hovered === href;
                return (
                  <Link key={href} href={href}
                    onClick={() => setSidebarOpen(false)}
                    onMouseEnter={() => setHovered(href)}
                    onMouseLeave={() => setHovered(null)}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                    style={isActive
                      ? { background: navColors.activeBg, color: navColors.activeText, fontWeight: 600, boxShadow: navColors.activeShadow }
                      : isHov
                        ? { background: navColors.hoverBg, color: navColors.hoverText }
                        : { color: navColors.normalText }}
                  >
                    <div className="relative z-10 w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={isActive ? { color: navColors.activeText, background: navColors.iconActiveBg } : { color: 'inherit', opacity: 0.65 }}>
                      <Icon size={14} />
                    </div>
                    <span className="relative z-10 flex-1">{label}</span>
                    {isActive && <ChevronRight size={12} className="relative z-10 shrink-0" style={{ color: 'rgba(124,58,237,0.5)' }} />}
                  </Link>
                );
              })}
            </>
          )}

          {/* Admin link for super admin */}
          {isSuperAdmin && (
            <>
              <div className="my-3 mx-3 h-px" style={{ background: 'var(--color-border2)' }} />
              <Link href="/"
                className="relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all duration-200"
                style={{ color: navColors.normalText }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = navColors.hoverBg; (e.currentTarget as HTMLElement).style.color = navColors.hoverText; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = navColors.normalText; }}
              >
                <LayoutGrid size={12} style={{ opacity: 0.5 }} />
                ← Admin Console
              </Link>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer p-3 shrink-0">
          <div className="sidebar-user flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg,#34D399,#10B981)', boxShadow: '0 0 0 2px rgba(52,211,153,0.25)' }}>
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{userName}</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
                  Agent
                </span>
              </div>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>{userEmail ?? '—'}</p>
            </div>
            <button onClick={toggle} aria-label="Toggle theme"
              className="lg:hidden shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--color-text3)' }}>
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>

          {/* Today's quick stats */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              { label: 'Calls', value: quickStats ? String(quickStats.calls) : '—', color: '#60A5FA' },
              { label: 'Leads', value: quickStats ? String(quickStats.leads) : '—', color: '#A78BFA' },
              { label: 'Live',  value: quickStats ? String(quickStats.live)  : '—', color: '#34D399' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-2 text-center"
                style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                <p className="text-base font-bold leading-none" style={{ color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <button onClick={signOut}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs transition-all duration-150"
            style={{ color: navColors.signOutNorm }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; (e.currentTarget as HTMLElement).style.color = '#F87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = navColors.signOutNorm; }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <main id="main" className="flex-1 lg:pl-64 min-h-screen relative pt-14 lg:pt-14">
        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          {children}
        </div>
      </main>

      {/* ── Due follow-up toast stack ──────────────────────────── */}
      {dueAlerts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5" style={{ maxWidth: 320 }}>
          {dueAlerts.map(alert => (
            <div key={alert.key}
              className="flex items-start gap-3 rounded-2xl p-3.5"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid rgba(251,191,36,0.35)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(251,191,36,0.1)',
                animation: 'scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(251,191,36,0.12)' }}>
                <Bell size={16} style={{ color: '#FBBF24' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                  {alert.minsAway <= 0 ? 'Follow-up due now!' : `Follow-up in ${alert.minsAway} min`}
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text3)' }}>
                  {alert.client} — {alert.type}
                </p>
                <button
                  onClick={() => { router.push(`/telemarketer/leads/${alert.leadId}`); setDueAlerts(a => a.filter(x => x.key !== alert.key)); }}
                  className="text-[11px] font-semibold mt-1.5 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-violet)' }}>
                  Go to lead →
                </button>
              </div>
              <button
                onClick={() => setDueAlerts(a => a.filter(x => x.key !== alert.key))}
                className="text-[var(--color-text3)] hover:text-[var(--color-text)] transition-colors mt-0.5 shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
