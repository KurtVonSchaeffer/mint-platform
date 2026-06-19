import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from '@/contexts/TenantContext';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  </StrictMode>
);
