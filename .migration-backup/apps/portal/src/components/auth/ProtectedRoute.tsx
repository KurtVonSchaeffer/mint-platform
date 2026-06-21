import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth();
  const { isActive } = useTenant();

  if (!isActive) return <Navigate to="/maintenance" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth/login" replace />;

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'borrower' ? '/client/dashboard' : '/admin/dashboard'} replace />;
  }

  return <Outlet />;
}
