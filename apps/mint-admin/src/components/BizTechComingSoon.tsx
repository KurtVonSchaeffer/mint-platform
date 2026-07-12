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
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">MINT BizTech</p>
        <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{title}</h1>
      </div>
      <div className="bento-card p-12 flex flex-col items-center justify-center text-center gap-3" style={{ minHeight: 280 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(92,59,207,0.1)' }}>
          <Icon size={24} style={{ color: '#5C3BCF' }} />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Construction size={12} style={{ color: '#FBBF24' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Coming soon</p>
        </div>
        <p className="text-xs max-w-sm" style={{ color: 'var(--color-text3)' }}>{description}</p>
      </div>
    </div>
  );
}
