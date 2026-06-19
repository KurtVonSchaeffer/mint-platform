import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { parseFeatures, type Features } from '@/lib/features';

export type Tenant = {
  name: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  ncr: string;
  features: Features;
  isActive: boolean;
};

const defaultTenant: Tenant = {
  name: import.meta.env.VITE_COMPANY_NAME ?? 'AlgoLend',
  logo: import.meta.env.VITE_LOGO_URL || null,
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR ?? '#7C3AED',
  secondaryColor: import.meta.env.VITE_SECONDARY_COLOR ?? '#1A1F36',
  ncr: import.meta.env.VITE_COMPANY_NCR ?? '',
  features: parseFeatures(import.meta.env.VITE_FEATURES),
  isActive: import.meta.env.VITE_PLATFORM_ACTIVE !== 'false',
};

const TenantContext = createContext<Tenant>(defaultTenant);

export function TenantProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-brand', defaultTenant.primaryColor);
    root.style.setProperty('--color-navy', defaultTenant.secondaryColor);
    document.title = defaultTenant.name;
  }, []);

  return (
    <TenantContext.Provider value={defaultTenant}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
