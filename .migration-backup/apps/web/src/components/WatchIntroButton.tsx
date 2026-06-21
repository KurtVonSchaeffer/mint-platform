'use client';

import { useState } from 'react';
import { DemoVideoModal } from './DemoVideoModal';

export function WatchIntroButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-white font-medium text-[14px] px-5 py-3.5 rounded-full border border-white/15 hover:bg-white/5 transition-colors cursor-pointer"
      >
        Or watch the intro
      </button>

      {open && <DemoVideoModal onClose={() => setOpen(false)} />}
    </>
  );
}
