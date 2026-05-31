'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Zap, BarChart3,
  Settings, LogOut, TrendingUp, FileText, Receipt, ArrowDownToLine,
  ChevronRight, Sun, Moon, Calculator, UserCog, Store,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';

const nav = [
  { label: 'Dashboard',  href: '/',          icon: LayoutDashboard },
  { label: 'Clients',    href: '/clients',   icon: Users },
  { label: 'Leads',      href: '/leads',     icon: TrendingUp },
  { label: 'Pricing',    href: '/pricing',   icon: Calculator },
  { label: 'Quotes',     href: '/quotes',    icon: FileText },
  { label: 'Invoices',   href: '/invoices',  icon: Receipt },
  { label: 'Billing',    href: '/billing',   icon: CreditCard },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Features',   href: '/features',  icon: Zap },
  { label: 'API Usage',  href: '/usage',     icon: BarChart3 },
  { label: 'Migration',  href: '/migration', icon: ArrowDownToLine },
  { label: 'Users',      href: '/users',     icon: UserCog },
  { label: 'Settings',   href: '/settings',  icon: Settings },
];

/* ─── AlgoLend arch logo mark ─────────────────────────────────── */
function AlgoLendMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="al-g" x1="4" y1="28" x2="28" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7C3AED" />
          <stop offset="50%"  stopColor="#9B5CF6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="al-g2" x1="4" y1="8" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path d="M4 26 Q4 6 16 6 Q28 6 28 26" stroke="url(#al-g)" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M9 26 Q9 12 16 12 Q23 12 23 26" stroke="url(#al-g2)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <circle cx="16" cy="26" r="2" fill="url(#al-g)" />
    </svg>
  );
}

/* ─── Shell ──────────────────────────────────────────────────── */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname          = usePathname();
  const router            = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  const isLight           = theme === 'light';

  /* Nav colour tokens that flip with theme */
  const navColors = {
    activeText:  isLight ? '#6D28D9'                  : '#C4B5FD',
    hoverText:   isLight ? '#1A1F36'                  : 'rgba(238,240,255,0.85)',
    normalText:  isLight ? '#42466B'                  : 'rgba(139,144,180,0.8)',
    activeBg:    isLight
      ? 'linear-gradient(90deg, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0.03) 100%)'
      : 'linear-gradient(90deg, rgba(124,58,237,0.2) 0%, rgba(124,58,237,0.06) 100%)',
    activeShadow: isLight
      ? 'inset 2px 0 0 #7C3AED'
      : 'inset 2px 0 0 #7C3AED, 0 0 20px rgba(124,58,237,0.08)',
    hoverBg:     isLight ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.08)',
    iconActiveBg: isLight ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.2)',
    iconNormalBg: isLight ? 'rgba(0,0,0,0.04)'      : 'rgba(255,255,255,0.04)',
    wordmarkGrad: isLight
      ? 'linear-gradient(135deg, #1A1F36 0%, #6D28D9 100%)'
      : 'linear-gradient(135deg, #EEF0FF 0%, #C4B5FD 100%)',
    subText:     isLight ? 'rgba(109,40,217,0.45)'  : 'rgba(167,139,250,0.5)',
    liveText:    isLight ? 'rgba(16,185,129,0.7)'   : 'rgba(52,211,153,0.6)',
    signOutNorm: isLight ? '#8B90B4' : 'var(--color-text3)',
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="sidebar-panel fixed inset-y-0 left-0 w-64 flex flex-col z-20">
        {/* Ambient purple glow at top */}
        <div
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
            filter: 'blur(20px)',
            opacity: isLight ? 0.4 : 1,
          }}
          aria-hidden
        />

        {/* Vertical beam */}
        <div
          className="absolute left-0 top-20 bottom-20 w-px pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.6) 30%, rgba(167,139,250,0.4) 50%, rgba(124,58,237,0.6) 70%, transparent 100%)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}
          aria-hidden
        />

        {/* Brand */}
        <div className="sidebar-brand flex items-center gap-3 h-16 px-5 shrink-0 relative">
          <AlgoLendMark size={28} />
          <div>
            <p
              className="text-sm font-bold leading-tight tracking-tight"
              style={{
                background: navColors.wordmarkGrad,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              AlgoLend
            </p>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: navColors.subText }}>
              Admin Console
            </p>
          </div>

          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative w-1.5 h-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-green)' }} />
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--color-green)', animation: 'pulse-dot 2.4s ease-in-out infinite' }}
              />
            </div>
            <span style={{ color: navColors.liveText, fontSize: 9, letterSpacing: '0.15em', fontFamily: 'var(--font-mono)' }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto relative">
          {nav.map(({ label, href, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            const isHov    = hovered === href;

            return (
              <Link
                key={href}
                href={href}
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                style={isActive ? {
                  background: navColors.activeBg,
                  color:      navColors.activeText,
                  fontWeight: 600,
                  boxShadow:  navColors.activeShadow,
                } : isHov ? {
                  background: navColors.hoverBg,
                  color:      navColors.hoverText,
                } : {
                  color: navColors.normalText,
                }}
              >
                {/* Active glow orb */}
                {isActive && (
                  <div
                    className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
                      filter: 'blur(6px)',
                      animation: 'glow-pulse 3s ease-in-out infinite',
                      opacity: isLight ? 0.5 : 1,
                    }}
                    aria-hidden
                  />
                )}

                <div
                  className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                  style={isActive ? {
                    background: navColors.iconActiveBg,
                    color:      navColors.activeText,
                    boxShadow:  isLight ? 'none' : '0 0 12px rgba(124,58,237,0.3)',
                  } : {
                    background: navColors.iconNormalBg,
                    color: 'inherit',
                  }}
                >
                  <Icon size={15} />
                </div>

                <span className="relative z-10 flex-1">{label}</span>

                {isActive && (
                  <ChevronRight
                    size={12}
                    className="relative z-10 shrink-0"
                    style={{ color: 'rgba(124,58,237,0.5)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer p-3 shrink-0">
          {/* User chip */}
          <div className="sidebar-user flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', color: 'white' }}
            >
              SA
              <div
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid rgba(167,139,250,0.3)', animation: 'glow-pulse 3s ease-in-out infinite' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                Super Admin
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>
                mint_platforms
              </p>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
              style={{ color: 'var(--color-text3)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(124,58,237,0.12)';
                el.style.color      = 'var(--color-violet)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'transparent';
                el.style.color      = 'var(--color-text3)';
              }}
            >
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs transition-all duration-150 cursor-pointer"
            style={{ color: navColors.signOutNorm }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)';
              (e.currentTarget as HTMLElement).style.color      = '#F87171';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color      = navColors.signOutNorm;
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="flex-1 pl-64 min-h-screen relative z-10">
        <div
          className="pointer-events-none fixed top-0 right-0 w-96 h-96"
          style={{
            background: 'radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.06) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
