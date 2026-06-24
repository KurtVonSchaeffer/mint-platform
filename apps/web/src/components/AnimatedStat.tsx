'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value:  string;   // e.g. "R 2.4bn+" or "14" or "99.9%"
  label:  string;
}

function parseNumber(v: string): { prefix: string; number: number; suffix: string } | null {
  // Matches: optional prefix (R, < ), digits+optional decimal, optional suffix (%,+,bn,k etc.)
  const m = v.match(/^([^0-9]*)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], number: parseFloat(m[2]), suffix: m[3] };
}

export function AnimatedStat({ value, label }: Props) {
  const ref        = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect(); } },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!shown) return;
    const parsed = parseNumber(value);
    if (!parsed) return;

    const { prefix, number, suffix } = parsed;
    const duration = 1400;
    const steps    = 40;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease-out cubic
      const eased  = 1 - Math.pow(1 - progress, 3);
      const current = number * eased;
      // Format like original (preserve decimals)
      const formatted = number % 1 !== 0
        ? current.toFixed(1)
        : Math.round(current).toString();
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [shown, value]);

  return (
    <div ref={ref} className="group">
      <p
        className="headline text-5xl lg:text-6xl font-semibold mb-2 text-[var(--color-ink)] group-hover:text-[var(--color-brand)] transition-colors"
        style={{ transition: 'color 0.2s' }}
      >
        {display}
      </p>
      <p className="text-sm text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}
