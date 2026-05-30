'use client';

import { useEffect } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

const cfg: Record<ToastKind, {
  bg: string; border: string; iconColor: string; glow: string; icon: typeof Check;
}> = {
  success: {
    bg:        'rgba(13,21,37,0.95)',
    border:    'rgba(52,211,153,0.25)',
    iconColor: '#34D399',
    glow:      'rgba(52,211,153,0.12)',
    icon:      Check,
  },
  error: {
    bg:        'rgba(13,21,37,0.95)',
    border:    'rgba(248,113,113,0.25)',
    iconColor: '#F87171',
    glow:      'rgba(248,113,113,0.12)',
    icon:      AlertCircle,
  },
  info: {
    bg:        'rgba(13,21,37,0.95)',
    border:    'rgba(124,58,237,0.35)',
    iconColor: '#A78BFA',
    glow:      'rgba(124,58,237,0.12)',
    icon:      Info,
  },
};

interface ToastProps {
  kind:      ToastKind;
  message:   string;
  onClose:   () => void;
  duration?: number;
}

export function Toast({ kind, message, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    if (duration === 0) return;
    const t = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(t);
  }, [duration, onClose]);

  const c = cfg[kind];
  const Icon = c.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 right-5 z-50 flex items-start gap-3 max-w-sm rounded-2xl px-4 py-3"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 0 0 1px ${c.border}, 0 20px 40px rgba(0,0,0,0.5), 0 0 30px ${c.glow}`,
        animation: 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      {/* Icon with glow */}
      <div
        className="mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: c.glow, color: c.iconColor }}
      >
        <Icon size={13} />
      </div>

      <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--color-text)' }}>
        {message}
      </p>

      <button
        onClick={onClose}
        className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg transition-colors"
        aria-label="Dismiss"
        style={{ color: 'var(--color-text3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
