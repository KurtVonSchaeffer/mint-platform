'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { DemoVideoModal } from './DemoVideoModal';

export function SeeItWorkButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        @keyframes siw-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          80%  { transform: scale(1.7); opacity: 0;   }
          100% { transform: scale(1.7); opacity: 0;   }
        }
        @keyframes siw-play-pulse {
          0%, 100% { box-shadow: 0 0 0 0px rgba(9,9,11,0.35); }
          50%       { box-shadow: 0 0 0 5px rgba(9,9,11,0);    }
        }
        @keyframes siw-bounce-x {
          0%, 100% { transform: translateX(0);   }
          40%      { transform: translateX(3px);  }
          60%      { transform: translateX(1.5px);}
        }
      `}</style>

      <button
        onClick={() => setOpen(true)}
        className="group relative inline-flex items-center gap-2.5 text-[var(--color-ink)] font-medium text-[14px] px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] hover:border-[var(--color-ink)] transition-all duration-200 cursor-pointer"
      >
        {/* Expanding ping rings */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-[var(--color-ink)]"
          style={{ animation: 'siw-ring 2.6s ease-out 0.8s infinite' }}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-[var(--color-ink)]"
          style={{ animation: 'siw-ring 2.6s ease-out 1.6s infinite' }}
        />

        {/* Play badge */}
        <span
          className="flex shrink-0 items-center justify-center w-[22px] h-[22px] rounded-full bg-[var(--color-ink)] transition-transform duration-200 group-hover:scale-110"
          style={{ animation: 'siw-play-pulse 2.6s ease-in-out infinite' }}
        >
          <Play size={9} fill="currentColor" className="text-[var(--color-bg)] ml-px" />
        </span>

        <span>See how it works</span>

        {/* Nudge arrow */}
        <span
          className="text-[var(--color-ink-muted)] text-[11px] transition-colors group-hover:text-[var(--color-ink)]"
          style={{ animation: 'siw-bounce-x 2.2s ease-in-out 1.2s infinite' }}
        >
          ↗
        </span>
      </button>

      {open && <DemoVideoModal onClose={() => setOpen(false)} />}
    </>
  );
}
