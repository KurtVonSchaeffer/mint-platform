'use client';

import { useEffect, useState } from 'react';

const WORDS = ['lowest rate', 'best offer', 'right lender', 'fastest approval'];

export function AnimatedHeadline() {
  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      className="headline text-[clamp(3rem,8vw,6.5rem)] font-semibold mb-6 max-w-5xl mx-auto"
      style={{ animation: 'var(--animate-fade-up)', animationDelay: '80ms' }}
      aria-label="One application. Every lender competes."
    >
      One application.<br />
      Get the{' '}
      <span className="relative inline-block">
        <svg
          className="absolute -bottom-1 left-0 w-full pointer-events-none"
          viewBox="0 0 200 12"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <path
            d="M3 8 Q60 2, 100 6 T197 5"
            stroke="#7C3AED"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span
          className="relative z-10 transition-all duration-300"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-10px)',
            display: 'inline-block',
          }}
        >
          {WORDS[index]}
        </span>
      </span>.
    </h1>
  );
}
