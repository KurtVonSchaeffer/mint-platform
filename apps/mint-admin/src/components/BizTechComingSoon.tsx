import type { ComponentType } from 'react';
import { Construction } from 'lucide-react';

type IconProps = { size?: number; style?: React.CSSProperties };

/** Shared placeholder for MINT BizTech modules not yet built (Phase 2+). */
export function BizTechComingSoon({
  title, description, icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>{title}</h1>
      </div>
      <div
        className="p-12 flex flex-col items-center justify-center text-center gap-3"
        style={{ minHeight: 280, background: 'var(--color-surface)', border: '1px solid var(--color-border2)', borderRadius: 10 }}
      >
        <Icon size={22} style={{ color: 'var(--color-text3)' }} />
        <div className="flex items-center gap-1.5 mt-1">
          <Construction size={12} style={{ color: 'var(--color-amber)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Coming soon</p>
        </div>
        <p className="text-xs max-w-sm" style={{ color: 'var(--color-text3)' }}>{description}</p>
      </div>
    </div>
  );
}
