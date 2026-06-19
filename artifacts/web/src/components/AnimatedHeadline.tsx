

import { useEffect, useState } from 'react';

const WORDS = ['South African', 'alternative', 'bespoke', 'modern', 'SME'];

export function AnimatedHeadline() {
  const [index, setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
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
      aria-label="The lending platform for credit providers"
    >
      The lending platform<br />
      for{' '}
      <span className="relative inline-block">
        {/* Underline SVG — always visible */}
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

        {/* Animated word */}
        <span
          className="relative z-10 transition-all duration-300"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-10px)',
            display: 'inline-block',
          }}
        >
          {WORDS[index]} credit
        </span>
      </span>{' '}
      providers.
    </h1>
  );
}
