import { NavLink } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard, FileText, CreditCard, FolderOpen, MessageSquare,
  User, HelpCircle, Users, BarChart3, ShieldCheck,
  Settings, Banknote, LogOut, Calculator, Bell, ArrowLeftRight,
} from 'lucide-react';

type NavItem = { label: string; to: string; icon: React.ReactNode; iconColor: string; };

const clientNav: NavItem[] = [
  { label: 'Dashboard',       to: '/client/dashboard',     icon: <LayoutDashboard size={16} />, iconColor: 'var(--color-brand)' },
  { label: 'Loan Calculator', to: '/client/calculator',    icon: <Calculator size={16} />,      iconColor: '#3b82f6' },
  { label: 'Apply for Loan',  to: '/client/apply',         icon: <FileText size={16} />,        iconColor: '#10b981' },
  { label: 'My Loans',        to: '/client/loans',         icon: <CreditCard size={16} />,      iconColor: '#f59e0b' },
  { label: 'Documents',       to: '/client/documents',     icon: <FolderOpen size={16} />,      iconColor: '#8b5cf6' },
  { label: 'Messages',        to: '/client/messages',      icon: <MessageSquare size={16} />,   iconColor: '#06b6d4' },
  { label: 'Notifications',   to: '/client/notifications', icon: <Bell size={16} />,            iconColor: '#ec4899' },
  { label: 'Profile',         to: '/client/profile',       icon: <User size={16} />,            iconColor: '#0ea5e9' },
  { label: 'Support',         to: '/client/support',       icon: <HelpCircle size={16} />,      iconColor: '#64748b' },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard',    to: '/admin/dashboard',    icon: <LayoutDashboard size={16} />, iconColor: 'var(--color-brand)' },
  { label: 'Applications', to: '/admin/applications', icon: <FileText size={16} />,        iconColor: '#10b981' },
  { label: 'Loan Book',    to: '/admin/portfolio',    icon: <Banknote size={16} />,        iconColor: '#f59e0b' },
  { label: 'Payments',     to: '/admin/payments',     icon: <ArrowLeftRight size={16} />,  iconColor: '#3b82f6' },
  { label: 'Compliance',   to: '/admin/compliance',   icon: <ShieldCheck size={16} />,     iconColor: '#ef4444' },
  { label: 'Reports',      to: '/admin/reports',      icon: <BarChart3 size={16} />,       iconColor: '#8b5cf6' },
  { label: 'Team',         to: '/admin/team',         icon: <Users size={16} />,           iconColor: '#06b6d4' },
  { label: 'Settings',     to: '/admin/settings',     icon: <Settings size={16} />,        iconColor: '#64748b' },
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
      style={{
        background: '#ffffff',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-16 px-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
      >
        {logo ? (
          <img src={logo} alt={name} className="h-8 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2.5">
            <Logo size={28} variant="light" />
            <span
              className="text-base font-bold tracking-tight"
              style={{ color: '#0f172a' }}
            >
              {name}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={({ isActive }) =>
              isActive
                ? {
                    background: `linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0.06) 100%)`,
                    color: 'var(--color-brand)',
                    boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.15)',
                  }
                : {
                    color: '#475569',
                  }
            }
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (!el.style.boxShadow) {
                el.style.background = 'rgba(0,0,0,0.04)';
                el.style.borderRadius = '12px';
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (!el.style.boxShadow) {
                el.style.background = 'transparent';
              }
            }}
          >
            {({ isActive }) => (
              <span
                className="flex items-center gap-3 w-full"
                style={{ color: isActive ? 'var(--color-brand)' : item.iconColor }}
              >
                <span
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isActive
                      ? 'rgba(124,58,237,0.1)'
                      : `rgba(0,0,0,0.04)`,
                    color: isActive ? 'var(--color-brand)' : item.iconColor,
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ color: isActive ? 'var(--color-brand)' : '#475569', fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.03)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'var(--color-brand)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
              {profile?.full_name ?? '—'}
            </p>
            <p className="text-[10px] truncate capitalize" style={{ color: '#94a3b8' }}>
              {profile?.role?.replace('_', ' ') ?? 'User'}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ color: '#94a3b8' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)';
            (e.currentTarget as HTMLElement).style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#94a3b8';
          }}
        >
          <LogOut size={15} />
          Sign Out
        </button>

        <p className="text-center mt-3" style={{ fontSize: '10px', color: '#cbd5e1' }}>
          Powered by <strong style={{ color: '#94a3b8' }}>Mint Platforms</strong>
        </p>
      </div>
    </aside>
  );
}
