import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Final value to count up to. */
  to: number;
  /** Animation duration in ms. */
  duration?: number;
  /** Delay before starting (ms). */
  delay?: number;
  /** Decimal places to display. */
  decimals?: number;
  /** Optional formatter applied to the current numeric value. */
  format?: (n: number) => string;
  /** Static prefix (e.g. "R "). */
  prefix?: string;
  /** Static suffix (e.g. "M" or "hr"). */
  suffix?: string;
  /** className passthrough. */
  className?: string;
}

/**
 * Eased count-up to a target number. Eased with cubic-out for natural feel.
 * Animates once when mounted (or once it enters viewport).
 */
export function CountUp({
  to,
  duration = 1500,
  delay = 0,
  decimals = 0,
  format,
  prefix = '',
  suffix = '',
  className,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (startedRef.current) return;

    const start = () => {
      startedRef.current = true;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // cubic-out easing
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(eased * to);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const timer = window.setTimeout(start, delay);
    return () => {
      window.clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration, delay]);

  const display = format
    ? format(value)
    : value.toFixed(decimals);

  return <span className={className}>{prefix}{display}{suffix}</span>;
}
