'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Building2, Briefcase, FileText, Receipt, FolderKanban,
  Users2, BarChart3, Wrench, LogOut, Sun, Moon, Menu, X, ChevronDown,
  CheckCircle2, Printer,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { createBrowserClient } from '@supabase/ssr';

/**
 * BizTechShell — the MINT BizTech workspace's own chrome, parallel to
 * Shell.tsx rather than a refactor of it.
 *
 * Phase 1 of the multi-workspace effort: prove the workspace-switcher
 * mechanism and ship an empty BizTech shell before building any of the
 * real modules (clients, quotes, invoices, projects, CRM, reports) on
 * top of it. Deliberately a SEPARATE component from Shell.tsx — cloning
 * the chrome pattern is more code than making Shell.tsx's nav config
 * driven, but it means zero risk of regressing the existing,
 * revenue-critical AlgoLend admin while this is being built out.
 * Once BizTech has real modules and the pattern has proven itself, the
 * two shells are a reasonable candidate to consolidate into one shared
 * component with a per-workspace config — not attempted yet.
 *
 * Reuses: the same Supabase auth session (no separate login), the same
 * ThemeProvider (light/dark), the same CSS custom-property system
 * (--color-surface, --color-text, etc.) — just with its own accent
 * color instead of AlgoLend's violet, so the two workspaces are
 * visually distinct at a glance.
 */

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };
type NavItem = { label: string; href: string; icon: React.ComponentType<IconProps>; comingSoon?: boolean };

const nav: NavItem[] = [
  { label: 'Dashboard',  href: '/biztech',           icon: LayoutGrid  },
  { label: 'Clients',    href: '/biztech/clients',   icon: Building2   },
  { label: 'Services',   href: '/biztech/services',  icon: Wrench,      comingSoon: true },
  { label: 'Quotes',     href: '/biztech/quotes',    icon: FileText    },
  { label: 'Invoices',   href: '/biztech/invoices',  icon: Receipt     },
  { label: 'Projects',   href: '/biztech/projects',  icon: FolderKanban },
  { label: 'CRM',        href: '/biztech/crm',       icon: Briefcase   },
  { label: 'Reports',    href: '/biztech/reports',   icon: BarChart3   },
  { label: 'Invoice Creator', href: '/biztech/invoice-creator', icon: Printer },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: '#A78BFA' },
  admin:       { label: 'Admin',       color: '#60A5FA' },
  finance:     { label: 'Finance',     color: '#34D399' },
  support:     { label: 'Support',     color: '#FBBF24' },
};

function BizTechLogo({ isLight }: { isLight: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/biztech-logo.svg"
      alt="MINT BizTech"
      className="h-8 w-auto shrink-0"
      style={{ filter: isLight ? 'none' : 'brightness(0) invert(1)' }}
    />
  );
}

export function BizTechShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggle } = useTheme();
  const isLight  = theme === 'light';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appOpen, setAppOpen]         = useState(false);
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [userName, setUserName]       = useState('');
  const [userInitials, setUserInitials] = useState('MB');
  const [userRole, setUserRole]       = useState('super_admin');
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const email    = user.email ?? '';
      const name     = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'Admin';
      const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'MB';
      setUserEmail(email);
      setUserName(name);
      setUserInitials(initials);
      setUserRole((user.user_metadata?.role as string | undefined) ?? 'super_admin');
    });
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (appRef.current && !appRef.current.contains(e.target as Node)) setAppOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const ACCENT = '#5C3BCF';
  const colors = {
    activeBg:   isLight ? 'rgba(92,59,207,0.10)' : 'rgba(167,139,250,0.14)',
    activeText: isLight ? '#5C3BCF' : '#C4B5FD',
    hoverBg:    isLight ? 'rgba(92,59,207,0.06)' : 'rgba(167,139,250,0.08)',
    normalText: isLight ? '#42466B' : 'rgba(139,144,180,0.8)',
    border:     isLight ? 'rgba(92,59,207,0.14)' : 'rgba(167,139,250,0.18)',
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>

      {/* Mobile header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30"
        style={{ background: 'var(--color-surface)', borderBottom: `1px solid ${colors.border}` }}
      >
        <BizTechLogo isLight={isLight} />
        <button
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle menu"
          className="w-11 h-11 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--color-text2)' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Desktop top bar */}
      <div
        className="hidden lg:flex fixed top-0 left-64 right-0 h-14 items-center gap-4 px-8 z-30"
        style={{
          background: isLight ? 'rgba(248,250,250,0.97)' : 'rgba(12,14,26,0.94)',
          borderBottom: `1px solid ${colors.border}`,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {(() => {
          const page = nav.find(n => n.href === '/biztech' ? pathname === '/biztech' : pathname.startsWith(n.href));
          const PageIcon = page?.icon;
          return (
            <div className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(92,59,207,0.10)', border: '1px solid rgba(92,59,207,0.22)' }}>
              {PageIcon && <PageIcon size={12} style={{ color: ACCENT }} />}
              <span className="text-xs font-semibold" style={{ color: ACCENT }}>{page?.label ?? 'Dashboard'}</span>
            </div>
          );
        })()}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--color-text3)' }}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-panel fixed inset-y-0 left-0 w-64 flex flex-col z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="sidebar-brand flex flex-col h-auto px-5 pt-4 pb-3 shrink-0 gap-2">
          <BizTechLogo isLight={isLight} />
          <p className="text-[9px] tracking-widest uppercase pl-0.5" style={{ color: 'rgba(167,139,250,0.5)' }}>
            IT Consulting &amp; Software Services
          </p>

          {/* Workspace switcher — back to AlgoLend */}
          <div ref={appRef} className="relative">
            <button
              onClick={() => setAppOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(92,59,207,0.12)', border: '1px solid rgba(92,59,207,0.2)', color: ACCENT }}
            >
              <span className="flex items-center gap-1.5"><LayoutGrid size={11} />MINT BizTech</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${appOpen ? 'rotate-180' : ''}`} />
            </button>
            {appOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
              >
                <div className="px-3 py-1.5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text3)' }}>Switch workspace</p>
                </div>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left"
                  style={{ background: 'rgba(92,59,207,0.08)', color: ACCENT }}
                  onClick={() => setAppOpen(false)}
                >
                  <LayoutGrid size={13} />
                  <div><p className="font-semibold">MINT BizTech</p><p className="text-[10px] opacity-60">IT consulting &amp; services</p></div>
                  <CheckCircle2 size={12} className="ml-auto opacity-70" />
                </button>
                <Link
                  href="/"
                  onClick={() => setAppOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium"
                  style={{ color: 'var(--color-text2)' }}
                >
                  <Building2 size={13} />
                  <div><p className="font-semibold">AlgoLend Admin</p><p className="text-[10px] opacity-60">Client management</p></div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
          {nav.map(({ label, href, icon: Icon, comingSoon }) => {
            const isActive = href === '/biztech' ? pathname === '/biztech' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                style={isActive
                  ? { background: colors.activeBg, color: colors.activeText, fontWeight: 600 }
                  : { color: colors.normalText }}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={isActive ? { color: colors.activeText, background: 'rgba(92,59,207,0.15)' } : { opacity: 0.65 }}>
                  <Icon size={14} />
                </div>
                <span className="flex-1">{label}</span>
                {comingSoon && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
                    SOON
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer p-3 shrink-0">
          <div className="sidebar-user flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: '#5C3BCF', color: 'white' }}>
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{userName}</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(92,59,207,0.12)', color: ROLE_LABELS[userRole]?.color ?? '#A78BFA' }}>
                  {ROLE_LABELS[userRole]?.label ?? userRole}
                </span>
              </div>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>{userEmail ?? ''}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs"
            style={{ color: 'var(--color-text3)' }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main" className="flex-1 lg:pl-64 min-h-screen relative z-10 pt-14 lg:pt-14">
        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
