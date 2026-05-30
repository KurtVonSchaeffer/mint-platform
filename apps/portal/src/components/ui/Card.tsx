import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-4 border-b border-slate-100', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pb-6 pt-4 border-t border-slate-100', className)} {...props} />
  );
}

/**
 * Premium StatCard:
 *  - Gradient background blob in the top-right corner
 *  - Icon pops + tilts on hover
 *  - Value uses tighter tracking + slight gradient
 *  - Trend chip glows on success/failure
 *  - Whole card lifts + shines on hover via `.card-shine`
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  className,
  accent = 'brand',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
  className?: string;
  /** Visual accent — defaults to brand purple. */
  accent?: 'brand' | 'success' | 'warning' | 'info';
}) {
  const accents = {
    brand:   { from: 'rgba(124,58,237,0.10)',  iconBg: 'bg-[var(--color-brand-muted)]', iconText: 'text-[var(--color-brand)]' },
    success: { from: 'rgba(16,185,129,0.10)',  iconBg: 'bg-emerald-50',                 iconText: 'text-emerald-600' },
    warning: { from: 'rgba(245,158,11,0.10)',  iconBg: 'bg-amber-50',                   iconText: 'text-amber-600' },
    info:    { from: 'rgba(59,130,246,0.10)',  iconBg: 'bg-blue-50',                    iconText: 'text-blue-600' },
  }[accent];

  return (
    <Card className={cn('card-shine relative p-6 overflow-hidden group', className)}>
      {/* Ambient accent blob */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle, ${accents.from} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
            accents.iconBg,
            accents.iconText,
          )}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full transition-all',
              trend.up
                ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                : 'bg-red-50 text-red-600 group-hover:bg-red-100',
            )}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      <p className="relative text-[26px] font-bold text-slate-900 tracking-tight leading-none">{value}</p>
      <p className="relative text-sm text-slate-500 mt-1.5">{label}</p>
      {sub && <p className="relative text-xs text-slate-400 mt-1">{sub}</p>}
    </Card>
  );
}
