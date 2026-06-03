import { useTenant } from '@/contexts/TenantContext';
import { WrenchIcon } from 'lucide-react';

export function MaintenancePage() {
  const { name, logo } = useTenant();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface-2)] px-4 text-center">
      <div className="mb-8">
        {logo
          ? <img src={logo} alt={name} className="h-12 mx-auto mb-6" />
          : <span className="text-2xl font-bold text-[var(--color-navy)]">{name}</span>
        }
      </div>
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-muted)] flex items-center justify-center mb-6">
        <WrenchIcon size={28} className="text-[var(--color-brand)]" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-ink)] mb-2">Platform Temporarily Unavailable</h1>
      <p className="text-[var(--color-ink-soft)] max-w-sm">
        We are performing scheduled maintenance. Please check back shortly or contact your account manager.
      </p>
      <p className="text-xs text-[var(--color-ink-muted)] mt-12">Powered by Mint Platforms</p>
    </div>
  );
}
