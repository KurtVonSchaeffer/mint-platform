

import { useEffect, useRef } from 'react';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in ms before revealing. */
  delay?: number;
  /** Tag to render (default 'div'). Use 'section' for landmark semantics. */
  as?: 'div' | 'section' | 'article' | 'header' | 'aside';
  className?: string;
  /** Override the default IntersectionObserver threshold (0–1). */
  threshold?: number;
}

/**
 * Reveal — small client component that adds `.revealed` to a node when it
 * enters the viewport, so CSS can do an opacity + translate fade-up.
 *
 * Server-Component-friendly: only the thin wrapper is client; the children
 * remain in whatever component tree they were defined in.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  threshold = 0.15,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already in view on mount (no scroll needed), reveal immediately.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const t = window.setTimeout(() => el.classList.add('revealed'), delay);
      return () => window.clearTimeout(t);
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => el.classList.add('revealed'), delay);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -80px 0px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, threshold]);

  // @ts-expect-error — ref type is fine for any HTMLElement-yielding tag
  return <Tag ref={ref} className={`reveal ${className}`}>{children}</Tag>;
}
