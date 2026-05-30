import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function ClientLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar mode="client" />
      <main className="flex-1 pl-64">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar mode="admin" />
      <main className="flex-1 pl-64">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
