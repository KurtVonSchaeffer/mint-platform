import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ClientLayout, AdminLayout } from '@/components/layout/AppLayout';
import { MaintenancePage } from '@/components/Maintenance';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

import { ClientDashboard } from '@/pages/client/DashboardPage';
import { ApplyPage } from '@/pages/client/ApplyPage';
import { LoansPage } from '@/pages/client/LoansPage';
import { LoanCalculatorPage } from '@/pages/client/LoanCalculatorPage';
import { DocumentsPage } from '@/pages/client/DocumentsPage';
import { MessagesPage } from '@/pages/client/MessagesPage';
import { NotificationsPage } from '@/pages/client/NotificationsPage';
import { ProfilePage } from '@/pages/client/ProfilePage';
import { SupportPage } from '@/pages/client/SupportPage';

import { AdminDashboard } from '@/pages/admin/AdminDashboardPage';
import { ApplicationsPage } from '@/pages/admin/ApplicationsPage';
import { PortfolioPage } from '@/pages/admin/PortfolioPage';
import { PaymentsPage } from '@/pages/admin/PaymentsPage';
import { CompliancePage } from '@/pages/admin/CompliancePage';
import { ReportsPage } from '@/pages/admin/ReportsPage';
import { TeamPage } from '@/pages/admin/TeamPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';

const STAFF = ['consultant', 'branch_manager', 'admin', 'super_admin'] as const;

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth/login" replace /> },
  { path: '/maintenance', element: <MaintenancePage /> },
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/auth/register', element: <RegisterPage /> },

  /* Client portal */
  {
    element: <ProtectedRoute roles={['borrower']} />,
    children: [{
      element: <ClientLayout />,
      children: [
        { path: '/client/dashboard', element: <ClientDashboard /> },
        { path: '/client/apply', element: <ApplyPage /> },
        { path: '/client/calculator', element: <LoanCalculatorPage /> },
        { path: '/client/loans', element: <LoansPage /> },
        { path: '/client/documents', element: <DocumentsPage /> },
        { path: '/client/messages', element: <MessagesPage /> },
        { path: '/client/notifications', element: <NotificationsPage /> },
        { path: '/client/profile', element: <ProfilePage /> },
        { path: '/client/support', element: <SupportPage /> },
      ],
    }],
  },

  /* Admin portal */
  {
    element: <ProtectedRoute roles={[...STAFF]} />,
    children: [{
      element: <AdminLayout />,
      children: [
        { path: '/admin/dashboard', element: <AdminDashboard /> },
        { path: '/admin/applications', element: <ApplicationsPage /> },
        { path: '/admin/portfolio', element: <PortfolioPage /> },
        { path: '/admin/payments', element: <PaymentsPage /> },
        { path: '/admin/compliance', element: <CompliancePage /> },
        { path: '/admin/reports', element: <ReportsPage /> },
        { path: '/admin/team', element: <TeamPage /> },
        { path: '/admin/settings', element: <SettingsPage /> },
      ],
    }],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
