'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Zap, BarChart3,
  Settings, LogOut, TrendingUp, FileText, Receipt, ArrowDownToLine,
  ChevronRight, Sun, Moon, Calculator, UserCog, Store, Menu, X,
  Bell, Plus, UserPlus, ChevronDown, Wallet, SlidersHorizontal, Plug,
  AlertTriangle, AlertCircle, Loader2, CheckCircle2, ShieldCheck, ClipboardList,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };
type NavItem  = { label: string; href: string; icon: React.ComponentType<IconProps> };
type NavGroup = { group: string; icon: React.ComponentType<IconProps>; items: NavItem[] };

// Routes each role can access. super_admin gets everything.
const ROLE_ROUTES: Record<string, string[]> = {
  super_admin:   ['*'],
  admin:         ['/', '/clients', '/leads', '/applications', '/pricing', '/quotes', '/invoices', '/billing', '/marketplace', '/features', '/usage', '/compliance', '/migration'],
  finance:       ['/', '/pricing', '/quotes', '/invoices', '/billing'],
  support:       ['/', '/clients', '/leads', '/applications'],
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: '#A78BFA' },
  admin:       { label: 'Admin',       color: '#60A5FA' },
  finance:     { label: 'Finance',     color: '#34D399' },
  support:     { label: 'Support',     color: '#FBBF24' },
};

function canAccess(href: string, role: string): boolean {
  const allowed = ROLE_ROUTES[role] ?? ROLE_ROUTES.support;
  if (allowed[0] === '*') return true;
  return allowed.some(a => a === href || (a !== '/' && href.startsWith(a)));
}

const nav: (NavItem | NavGroup)[] = [
  { label: 'Dashboard',   href: '/',            icon: LayoutDashboard },
  { label: 'Clients',     href: '/clients',     icon: Users },
  { label: 'Leads',        href: '/leads',        icon: TrendingUp    },
  { label: 'Applications', href: '/applications', icon: ClipboardList },
  {
    group: 'Financials',
    icon: Wallet,
    items: [
      { label: 'Pricing',        href: '/pricing',   icon: Calculator },
      { label: 'Quotes',         href: '/quotes',    icon: FileText },
      { label: 'Invoices',       href: '/invoices',  icon: Receipt },
      { label: 'Subscriptions',  href: '/billing',   icon: CreditCard },
    ],
  },
  {
    group: 'Marketplace',
    icon: Store,
    items: [
      { label: 'Lender Policies', href: '/marketplace',          icon: Store              },
      { label: 'Loan Simulator',  href: '/marketplace/simulate',     icon: SlidersHorizontal },
      { label: 'Integration',     href: '/marketplace/integration',  icon: Plug              },
    ],
  },
  { label: 'Features',    href: '/features',    icon: Zap },
  { label: 'API Usage',   href: '/usage',        icon: BarChart3 },
  { label: 'Compliance',  href: '/compliance',  icon: ShieldCheck },
  { label: 'Migration',   href: '/migration',   icon: ArrowDownToLine },
  { label: 'Users',       href: '/users',        icon: UserCog },
  { label: 'Settings',    href: '/settings',    icon: Settings },
];

// Flat list of all nav items (used for search and page title lookup)
const flatNav: NavItem[] = nav.flatMap(e => 'group' in e ? e.items : [e]);

const NEW_ACTIONS = [
  { label: 'New client',  href: '/clients?new=1',  icon: Users },
  { label: 'New lead',    href: '/leads?new=1',    icon: UserPlus },
  { label: 'New invoice', href: '/invoices?new=1', icon: Receipt },
  { label: 'New quote',   href: '/quotes?new=1',   icon: FileText },
];

/* ─── AlgoLend logo (actual brand asset) ────────────────────────── */
function AlgoLendLogo({ height = 28, isLight }: { height?: number; isLight: boolean }) {
  const src   = isLight ? '/algolend-logo.png' : '/algolend-logo-dark.png';
  const width = Math.round(height * (993 / 244));
  return (
    <Image src={src} alt="AlgoLend" width={width} height={height} style={{ objectFit: 'contain' }} priority />
  );
}

/* ─── Shell ──────────────────────────────────────────────────── */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname                = usePathname();
  const router                  = useRouter();
  const [hovered,   setHovered] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups]   = useState<Set<string>>(new Set());
  const [newOpen,    setNewOpen]    = useState(false);
  const [bellOpen,   setBellOpen]   = useState(false);
  const [searchQ,    setSearchQ]    = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  type NotifItem = { kind: 'warn' | 'info' | 'ok'; text: string; sub: string; href: string };
  const [notifs,        setNotifs]        = useState<NotifItem[]>([]);
  const [notifsLoaded,  setNotifsLoaded]  = useState(false);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const { theme, toggle }       = useTheme();
  const [userEmail,    setUserEmail]    = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('SA');
  const [userName,     setUserName]     = useState('Super Admin');
  const [userRole,     setUserRole]     = useState<string>('super_admin');
  const [appOpen, setAppOpen] = useState(false);
  const appRef    = useRef<HTMLDivElement>(null);
  const newRef    = useRef<HTMLDivElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand accordion group when a child route is active
  useEffect(() => {
    for (const entry of nav) {
      if ('group' in entry && entry.items.some(item =>
        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
      )) {
        setOpenGroups(prev => { const s = new Set(prev); s.add(entry.group); return s; });
      }
    }
  }, [pathname]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const email    = user.email ?? '';
      const name     = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'Admin';
      const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'SA';
      setUserEmail(email);
      setUserName(name);
      setUserInitials(initials);
      setUserRole((user.user_metadata?.role as string | undefined) ?? 'super_admin');
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (appRef.current && !appRef.current.contains(e.target as Node)) setAppOpen(false);
      if (newRef.current && !newRef.current.contains(e.target as Node)) setNewOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function openBell() {
    setBellOpen(o => !o);
    if (notifsLoaded) return;
    setNotifsLoading(true);
    try {
      const { clients } = await fetch('/api/clients').then(r => r.json());
      const items: NotifItem[] = [];
      if (Array.isArray(clients)) {
        const suspended = clients.filter((c: Record<string, unknown>) => c.status === 'suspended');
        const trials    = clients.filter((c: Record<string, unknown>) => c.status === 'trial');
        const noMrr     = clients.filter((c: Record<string, unknown>) => c.status === 'active' && Number(c.monthly_fee_cents ?? 0) === 0);
        suspended.forEach((c: Record<string, unknown>) =>
          items.push({ kind: 'warn', text: `${c.name} suspended`, sub: 'Portal unreachable — check payment status', href: `/clients/${c.id}` }));
        noMrr.forEach((c: Record<string, unknown>) =>
          items.push({ kind: 'warn', text: `${c.name} has no MRR`, sub: 'Active client with R 0 monthly fee set', href: `/clients/${c.id}` }));
        if (trials.length > 0)
          items.push({ kind: 'info', text: `${trials.length} trial client${trials.length > 1 ? 's' : ''} pending`, sub: 'Convert to active to start billing', href: '/clients' });
        if (items.length === 0)
          items.push({ kind: 'ok', text: 'All clear', sub: 'No issues detected across your platform', href: '/' });
      }
      setNotifs(items);
      setNotifsLoaded(true);
    } catch {
      setNotifs([{ kind: 'warn', text: 'Could not load notifications', sub: 'Check your Supabase connection', href: '/settings' }]);
    } finally {
      setNotifsLoading(false);
    }
  }

  // Keyboard shortcut ⌘K / Ctrl+K to focus search
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') { setSearchOpen(false); setNewOpen(false); }
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    const match = flatNav.find(n => n.label.toLowerCase().includes(q.toLowerCase()));
    if (match) router.push(match.href);
    else router.push(`/clients?q=${encodeURIComponent(q)}`);
    setSearchQ('');
    setSearchOpen(false);
  }

  const filteredNav = searchQ.trim()
    ? flatNav.filter(n => n.label.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  const isLight = theme === 'light';

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
    iconNormalBg: isLight ? 'rgba(0,0,0,0.04)'      : 'rgba(255,255,255,0.04)',
    wordmarkGrad: isLight
      ? 'linear-gradient(135deg, #1A1F36 0%, #6D28D9 100%)'
      : 'linear-gradient(135deg, #EEF0FF 0%, #C4B5FD 100%)',
    subText:      isLight ? 'rgba(109,40,217,0.45)'  : 'rgba(167,139,250,0.5)',
    liveText:     isLight ? 'rgba(16,185,129,0.7)'   : 'rgba(52,211,153,0.6)',
    signOutNorm:  isLight ? '#8B90B4' : 'var(--color-text3)',
    topBarBg:     isLight
      ? 'rgba(248,246,255,0.97)'
      : 'rgba(12,14,26,0.94)',
    topBarBorder: isLight ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.18)',
    topBarShadow: isLight
      ? '0 1px 12px rgba(0,0,0,0.06), 0 1px 0 rgba(124,58,237,0.08)'
      : '0 1px 0 rgba(124,58,237,0.16), 0 4px 24px rgba(0,0,0,0.25)',
    searchBg:     isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>

      {/* ── Mobile header ────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30"
        style={{ background: 'var(--color-surface)', borderBottom: `1px solid ${navColors.topBarBorder}` }}
      >
        <div className="flex items-center">
          <AlgoLendLogo height={22} isLight={isLight} />
        </div>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle menu"
          className="w-11 h-11 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text2)' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Desktop top bar ──────────────────────────────────── */}
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
        {/* Page context pill — icon + label */}
        {(() => {
          const page = flatNav.find(n => n.href === '/' ? pathname === '/' : pathname.startsWith(n.href));
          const PageIcon = page?.icon;
          return (
            <div className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.22)' }}>
              {PageIcon && <PageIcon size={12} style={{ color: 'var(--color-violet)' }} />}
              <span className="text-xs font-semibold" style={{ color: 'var(--color-violet)' }}>
                {page?.label ?? 'Dashboard'}
              </span>
            </div>
          );
        })()}
        <span style={{ color: 'var(--color-border3)', fontSize: 12, lineHeight: 1, opacity: 0.5 }}>›</span>

        {/* ── Search ── */}
        <div ref={searchRef} className="flex-1 max-w-md relative">
          <form onSubmit={handleSearch}>
            <div className="relative flex items-center">
              <input
                ref={searchInputRef}
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search…"
                aria-label="Search navigation"
                className="w-full pl-4 pr-16 py-1.5 text-sm rounded-xl transition-all field-input"
                style={{
                  background: navColors.searchBg,
                  border: `1px solid ${searchOpen ? 'rgba(124,58,237,0.4)' : navColors.topBarBorder}`,
                  color: 'var(--color-text)',
                  boxShadow: searchOpen ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
                }}
              />
              {!searchQ && (
                <kbd
                  className="absolute right-3 text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  ⌘K
                </kbd>
              )}
            </div>
          </form>

          {/* Search dropdown */}
          {searchOpen && filteredNav.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.1)',
              }}
            >
              {filteredNav.slice(0, 6).map(n => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => { setSearchOpen(false); setSearchQ(''); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--color-text2)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)';
                  }}
                >
                  <n.icon size={14} className="shrink-0 opacity-60" />
                  {n.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Notifications bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={openBell}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{
                color: bellOpen ? 'var(--color-violet)' : 'var(--color-text3)',
                background: bellOpen ? 'rgba(124,58,237,0.1)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!bellOpen) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)';
                }
              }}
              onMouseLeave={e => {
                if (!bellOpen) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)';
                }
              }}
            >
              <Bell size={15} />
              {/* Badge — only when loaded and there are actual alerts */}
              {!bellOpen && notifsLoaded && notifs.some(n => n.kind !== 'ok') && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--color-violet)', border: '1.5px solid var(--color-surface)' }} aria-hidden />
              )}
            </button>

            {/* Notification panel */}
            {bellOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border2)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.1)',
                  animation: 'slide-down 0.2s cubic-bezier(0.16,1,0.3,1) both',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Notifications</p>
                  {notifsLoaded && notifs.length > 0 && notifs[0].kind !== 'ok' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>
                      {notifs.filter(n => n.kind !== 'ok').length} item{notifs.filter(n => n.kind !== 'ok').length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Items */}
                <div className="max-h-72 overflow-y-auto">
                  {notifsLoading && (
                    <div className="flex items-center justify-center gap-2 py-8">
                      <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-purple2)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text3)' }}>Checking platform…</span>
                    </div>
                  )}
                  {!notifsLoading && notifs.map((n, i) => {
                    const icon = n.kind === 'ok'
                      ? <CheckCircle2 size={14} style={{ color: '#34D399' }} />
                      : n.kind === 'warn'
                        ? <AlertCircle size={14} style={{ color: '#F87171' }} />
                        : <AlertTriangle size={14} style={{ color: '#FBBF24' }} />;
                    const iconBg = n.kind === 'ok' ? 'rgba(52,211,153,0.1)' : n.kind === 'warn' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)';
                    const iconColor = n.kind === 'ok' ? '#34D399' : n.kind === 'warn' ? '#F87171' : '#FBBF24';
                    return (
                      <Link
                        key={i}
                        href={n.href}
                        onClick={() => setBellOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors"
                        style={{ borderBottom: i < notifs.length - 1 ? '1px solid var(--color-row-border)' : 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: iconBg, color: iconColor }}>
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{n.text}</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text3)' }}>{n.sub}</p>
                        </div>
                        {n.href !== '/' && <ChevronRight size={13} className="shrink-0 mt-1" style={{ color: 'var(--color-text3)' }} />}
                      </Link>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--color-border2)', background: 'rgba(124,58,237,0.03)' }}>
                  <button
                    onClick={async () => {
                      setNotifsLoaded(false);
                      setNotifs([]);
                      setNotifsLoading(true);
                      try {
                        const { clients } = await fetch('/api/clients').then(r => r.json());
                        const items: NotifItem[] = [];
                        if (Array.isArray(clients)) {
                          clients.filter((c: Record<string, unknown>) => c.status === 'suspended')
                            .forEach((c: Record<string, unknown>) => items.push({ kind: 'warn', text: `${c.name} suspended`, sub: 'Portal unreachable — check payment', href: `/clients/${c.id}` }));
                          clients.filter((c: Record<string, unknown>) => c.status === 'active' && Number(c.monthly_fee_cents ?? 0) === 0)
                            .forEach((c: Record<string, unknown>) => items.push({ kind: 'warn', text: `${c.name} has no MRR`, sub: 'Active client with R 0 monthly fee', href: `/clients/${c.id}` }));
                          const trials = clients.filter((c: Record<string, unknown>) => c.status === 'trial');
                          if (trials.length > 0) items.push({ kind: 'info', text: `${trials.length} trial client${trials.length > 1 ? 's' : ''}`, sub: 'Convert to active to start billing', href: '/clients' });
                          if (items.length === 0) items.push({ kind: 'ok', text: 'All clear', sub: 'No issues detected', href: '/' });
                        }
                        setNotifs(items);
                        setNotifsLoaded(true);
                      } catch {
                        setNotifs([{ kind: 'warn', text: 'Refresh failed', sub: 'Check your connection', href: '/settings' }]);
                      } finally {
                        setNotifsLoading(false);
                      }
                    }}
                    className="text-xs font-semibold transition-colors w-full text-center"
                    style={{ color: 'var(--color-violet)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)';
            }}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* New+ dropdown */}
          <div ref={newRef} className="relative">
            <button
              onClick={() => setNewOpen(o => !o)}
              className="btn-purple btn-shine inline-flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
            >
              <Plus size={13} />
              New
              <ChevronDown size={11} className={`transition-transform duration-200 ${newOpen ? 'rotate-180' : ''}`} />
            </button>

            {newOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden shadow-2xl z-50"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border2)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.12)',
                  animation: 'slide-down 0.2s cubic-bezier(0.16,1,0.3,1) both',
                }}
              >
                {NEW_ACTIONS.map(a => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setNewOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--color-text2)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)';
                    }}
                  >
                    <a.icon size={13} className="shrink-0 opacity-60" />
                    {a.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile overlay ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`sidebar-panel fixed inset-y-0 left-0 w-64 flex flex-col z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(20px)', opacity: isLight ? 0.4 : 1 }}
          aria-hidden
        />
        {/* Vertical beam */}
        <div
          className="absolute left-0 top-20 bottom-20 w-px pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.6) 30%, rgba(167,139,250,0.4) 50%, rgba(124,58,237,0.6) 70%, transparent 100%)', animation: 'glow-pulse 3s ease-in-out infinite' }}
          aria-hidden
        />

        {/* Brand + App Switcher */}
        <div className="sidebar-brand flex flex-col h-auto px-5 pt-4 pb-3 shrink-0 relative gap-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <AlgoLendLogo height={26} isLight={isLight} />
              <p className="text-[9px] tracking-widest uppercase pl-0.5" style={{ color: navColors.subText }}>Admin Console</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="relative flex items-center justify-center w-3 h-3">
                <div className="absolute w-1.5 h-1.5 rounded-full" aria-hidden style={{ background: 'var(--color-green)', animation: 'radar-ring 2s ease-out infinite' }} />
                <div className="absolute w-1.5 h-1.5 rounded-full" aria-hidden style={{ background: 'var(--color-green)', animation: 'radar-ring 2s ease-out infinite 0.6s' }} />
                <div className="absolute w-1.5 h-1.5 rounded-full" aria-hidden style={{ background: 'var(--color-green)', animation: 'radar-ring 2s ease-out infinite 1.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full relative" style={{ background: 'var(--color-green)' }} />
              </div>
              <span style={{ color: navColors.liveText, fontSize: 9, letterSpacing: '0.08em' }}>Live</span>
            </div>
          </div>

          {/* App switcher */}
          <div ref={appRef} className="relative">
            <button
              onClick={() => setAppOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isLight ? 'rgba(124,58,237,0.07)' : 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.2)',
                color: 'var(--color-violet)',
              }}
            >
              <span className="flex items-center gap-1.5">
                <LayoutDashboard size={11} />
                AlgoLend Admin
              </span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${appOpen ? 'rotate-180' : ''}`} />
            </button>
            {appOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border2)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                  animation: 'slide-down 0.18s cubic-bezier(0.16,1,0.3,1) both',
                }}
              >
                <div className="px-3 py-1.5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text3)' }}>Switch tool</p>
                </div>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-colors"
                  style={{ background: isLight ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}
                  onClick={() => setAppOpen(false)}
                >
                  <LayoutDashboard size={13} />
                  <div>
                    <p className="font-semibold">AlgoLend Admin</p>
                    <p className="text-[10px] opacity-60">Client management</p>
                  </div>
                  <CheckCircle2 size={12} className="ml-auto opacity-70" />
                </button>
                <Link
                  href="/mint-invoice"
                  onClick={() => setAppOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-text2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Receipt size={13} />
                  <div>
                    <p className="font-semibold">Mint Invoice Creator</p>
                    <p className="text-[10px] opacity-60">Internal billing tool</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto relative">
          {nav.filter(entry => {
            if ('group' in entry) return entry.items.some(i => canAccess(i.href, userRole));
            return canAccess(entry.href, userRole);
          }).map((entry) => {
            if ('group' in entry) {
              // ── Accordion group ────────────────────────────
              const isOpen     = openGroups.has(entry.group);
              const hasActive  = entry.items.some(item =>
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              );
              const isHov = hovered === entry.group;
              return (
                <div key={entry.group}>
                  <button
                    onClick={() => setOpenGroups(prev => {
                      const s = new Set(prev);
                      isOpen ? s.delete(entry.group) : s.add(entry.group);
                      return s;
                    })}
                    onMouseEnter={() => setHovered(entry.group)}
                    onMouseLeave={() => setHovered(null)}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 w-full text-left"
                    style={hasActive
                      ? { background: navColors.activeBg, color: navColors.activeText, fontWeight: 600, boxShadow: navColors.activeShadow }
                      : isHov
                        ? { background: navColors.hoverBg, color: navColors.hoverText }
                        : { color: navColors.normalText }}
                  >
                    <div className="relative z-10 w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                      style={hasActive
                        ? { color: navColors.activeText, background: navColors.iconActiveBg }
                        : { color: 'inherit', opacity: 0.65 }}>
                      <entry.icon size={14} />
                    </div>
                    <span className="relative z-10 flex-1 font-medium">{entry.group}</span>
                    <ChevronDown
                      size={12}
                      className="relative z-10 shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: hasActive ? navColors.activeText : 'inherit' }}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 ml-4 pl-3 space-y-0.5" style={{ borderLeft: `1px solid ${isLight ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.2)'}` }}>
                      {entry.items.filter(i => canAccess(i.href, userRole)).map(({ label, href, icon: Icon }) => {
                        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                        const isHovChild = hovered === href;
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setSidebarOpen(false)}
                            onMouseEnter={() => setHovered(href)}
                            onMouseLeave={() => setHovered(null)}
                            className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200"
                            style={isActive
                              ? { background: navColors.activeBg, color: navColors.activeText, fontWeight: 600, boxShadow: navColors.activeShadow }
                              : isHovChild
                                ? { background: navColors.hoverBg, color: navColors.hoverText }
                                : { color: navColors.normalText }}
                          >
                            <Icon size={12} className="shrink-0" style={{ opacity: isActive ? 1 : 0.55, color: isActive ? navColors.activeText : 'inherit' }} />
                            <span className="flex-1">{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ── Flat item ──────────────────────────────────
            const { label, href, icon: Icon } = entry;
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            const isHov    = hovered === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                style={isActive ? { background: navColors.activeBg, color: navColors.activeText, fontWeight: 600, boxShadow: navColors.activeShadow }
                  : isHov ? { background: navColors.hoverBg, color: navColors.hoverText }
                  : { color: navColors.normalText }}
              >
                <div className="relative z-10 w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                  style={isActive
                    ? { color: navColors.activeText, background: navColors.iconActiveBg }
                    : { color: 'inherit', opacity: 0.65 }}>
                  <Icon size={14} />
                </div>
                <span className="relative z-10 flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="relative z-10 shrink-0" style={{ color: 'rgba(124,58,237,0.5)' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer p-3 shrink-0">
          <div className="sidebar-user flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: '#7C3AED', color: 'white', animation: 'border-glow 3s ease-in-out infinite', boxShadow: '0 0 0 2px rgba(124,58,237,0.25)' }}>
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{userName}</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(124,58,237,0.12)', color: ROLE_LABELS[userRole]?.color ?? '#A78BFA' }}>
                  {ROLE_LABELS[userRole]?.label ?? userRole}
                </span>
              </div>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>{userEmail ?? 'mint_platforms'}</p>
            </div>
            {/* Theme toggle — sidebar (mobile only, desktop is in topbar) */}
            <button
              onClick={toggle}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="lg:hidden shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{ color: 'var(--color-text3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.12)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
            >
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs transition-all duration-150"
            style={{ color: navColors.signOutNorm }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; (e.currentTarget as HTMLElement).style.color = '#F87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = navColors.signOutNorm; }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <main id="main" className="flex-1 lg:pl-64 min-h-screen relative z-10 pt-14 lg:pt-14">
        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
