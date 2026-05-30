import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard, FileText, CreditCard, FolderOpen, MessageSquare,
  User, HelpCircle, Users, BarChart3, ShieldCheck,
  Settings, Banknote, LogOut, Calculator, Bell, ArrowLeftRight,
} from 'lucide-react';

type NavItem = { label: string; to: string; icon: React.ReactNode; };

const clientNav: NavItem[] = [
  { label: 'Dashboard',       to: '/client/dashboard',     icon: <LayoutDashboard size={16} /> },
  { label: 'Loan Calculator', to: '/client/calculator',    icon: <Calculator size={16} /> },
  { label: 'Apply for Loan',  to: '/client/apply',         icon: <FileText size={16} /> },
  { label: 'My Loans',        to: '/client/loans',         icon: <CreditCard size={16} /> },
  { label: 'Documents',       to: '/client/documents',     icon: <FolderOpen size={16} /> },
  { label: 'Messages',        to: '/client/messages',      icon: <MessageSquare size={16} /> },
  { label: 'Notifications',   to: '/client/notifications', icon: <Bell size={16} /> },
  { label: 'Profile',         to: '/client/profile',       icon: <User size={16} /> },
  { label: 'Support',         to: '/client/support',       icon: <HelpCircle size={16} /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard',    to: '/admin/dashboard',    icon: <LayoutDashboard size={16} /> },
  { label: 'Applications', to: '/admin/applications', icon: <FileText size={16} /> },
  { label: 'Loan Book',    to: '/admin/portfolio',    icon: <Banknote size={16} /> },
  { label: 'Payments',     to: '/admin/payments',     icon: <ArrowLeftRight size={16} /> },
  { label: 'Compliance',   to: '/admin/compliance',   icon: <ShieldCheck size={16} /> },
  { label: 'Reports',      to: '/admin/reports',      icon: <BarChart3 size={16} /> },
  { label: 'Team',         to: '/admin/team',         icon: <Users size={16} /> },
  { label: 'Settings',     to: '/admin/settings',     icon: <Settings size={16} /> },
];

export function Sidebar({ mode }: { mode: 'client' | 'admin' }) {
  const { name, logo } = useTenant();
  const { profile, signOut } = useAuth();
  const nav = mode === 'client' ? clientNav : adminNav;

  const initials = profile?.full_name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col"
      style={{ background: 'var(--color-navy)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-16 px-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {logo ? (
          <img src={logo} alt={name} className="h-8 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2.5">
            <Logo size={28} variant="dark" />
            <span className="text-base font-bold text-white tracking-tight">{name}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium overflow-hidden',
                'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isActive ? 'text-white' : 'hover:bg-white/5 hover:text-white'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { color: '#fff' }
                : { color: 'rgba(255,255,255,0.5)' }
            }
          >
            {({ isActive }) => (
              <>
                {/* Sliding active background */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(90deg, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0.08) 100%)',
                      animation: 'var(--animate-fade-in)',
                    }}
                  />
                )}
                {/* Animated left accent bar */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full"
                    style={{
                      background: 'linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)',
                      boxShadow: '0 0 12px rgba(167,139,250,0.6)',
                      animation: 'var(--animate-slide-down)',
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-0.5">
                  {item.icon}
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'var(--color-brand)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name ?? '—'}</p>
            <p className="text-[10px] truncate capitalize" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {profile?.role?.replace('_', ' ') ?? 'User'}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
            (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
          }}
        >
          <LogOut size={15} />
          Sign Out
        </button>

        <p className="text-center mt-3" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>
          Powered by <strong style={{ color: 'rgba(255,255,255,0.25)' }}>Mint Platforms</strong>
        </p>
      </div>
    </aside>
  );
}
