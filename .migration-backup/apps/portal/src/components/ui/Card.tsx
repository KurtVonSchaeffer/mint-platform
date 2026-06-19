import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border shadow-sm', className)}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 pt-6 pb-4 border-b', className)}
      style={{ borderColor: 'var(--color-border-soft)' }}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 pb-6 pt-4 border-t', className)}
      style={{ borderColor: 'var(--color-border-soft)' }}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  className,
  accent = 'brand',
}: {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     React.ReactNode;
  trend?:   { value: string; up: boolean };
  className?: string;
  accent?:  'brand' | 'success' | 'warning' | 'info';
}) {
  const accents = {
    brand:   { glow: 'rgba(124,58,237,0.10)', iconBg: 'rgba(124,58,237,0.1)', iconColor: 'var(--color-brand)' },
    success: { glow: 'rgba(16,185,129,0.10)',  iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10b981' },
    warning: { glow: 'rgba(245,158,11,0.10)',  iconBg: 'rgba(245,158,11,0.1)', iconColor: '#f59e0b' },
    info:    { glow: 'rgba(59,130,246,0.10)',  iconBg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6' },
  }[accent];

  return (
    <Card className={cn('card-shine relative p-6 overflow-hidden group cursor-default', className)}>
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle, ${accents.glow} 0%, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{ background: accents.iconBg, color: accents.iconColor }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: trend.up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color:      trend.up ? '#10b981' : '#ef4444',
            }}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="relative text-[26px] font-bold tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>{value}</p>
      <p className="relative text-sm mt-1.5" style={{ color: 'var(--color-ink-soft)' }}>{label}</p>
      {sub && <p className="relative text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>{sub}</p>}
    </Card>
  );
}
