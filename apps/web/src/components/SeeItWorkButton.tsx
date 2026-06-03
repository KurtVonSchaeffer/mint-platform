'use client';

import { useState } from 'react';
import { DemoVideoModal } from './DemoVideoModal';

export function SeeItWorkButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[var(--color-ink)] font-medium text-[14px] px-5 py-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
      >
        See how it works
      </button>

      {open && <DemoVideoModal onClose={() => setOpen(false)} />}
    </>
  );
}
