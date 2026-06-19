import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';

function TopBar({ mode: _mode }: { mode: 'client' | 'admin' }) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-8"
      style={{
        background:     'rgba(248,250,252,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom:   '1px solid rgba(0,0,0,0.06)',
        boxShadow:      '0 1px 0 rgba(255,255,255,0.8), 0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      <div />
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'transparent', color: '#64748b' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Bell size={17} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: 'var(--color-brand)' }}
          />
        </button>

        {/* User pill */}
        {firstName && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-brand)' }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'var(--color-brand)' }}
            >
              {firstName[0]}
            </div>
            {firstName}
          </div>
        )}
      </div>
    </header>
  );
}

export function ClientLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar mode="client" />
      <div className="flex-1 pl-64 flex flex-col">
        <TopBar mode="client" />
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar mode="admin" />
      <div className="flex-1 pl-64 flex flex-col">
        <TopBar mode="admin" />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
