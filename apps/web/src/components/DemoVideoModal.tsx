'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Play, ExternalLink } from 'lucide-react';

interface Props {
  onClose: () => void;
}

/**
 * Demo video modal — replace DEMO_VIDEO_URL with your actual Loom or YouTube link.
 * Until a real recording exists, shows a polished placeholder with a CTA to book a live demo.
 */
const DEMO_VIDEO_URL = ''; // e.g. 'https://www.loom.com/embed/xxxx' or 'https://www.youtube-nocookie.com/embed/xxxx'

export function DemoVideoModal({ onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Close on Escape
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{
        background: `rgba(9,9,11,${visible ? '0.88' : '0'})`,
        backdropFilter: visible ? 'blur(12px)' : 'none',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onClick={e => { if (e.target === backdropRef.current) handleClose(); }}
    >
      <div
        className="relative w-full max-w-4xl"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
        >
          <X size={16} /> Close
        </button>

        {/* Video frame */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#09090B',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 0 80px rgba(124,58,237,0.2), 0 32px 64px rgba(0,0,0,0.6)',
            aspectRatio: '16 / 9',
          }}
        >
          {DEMO_VIDEO_URL ? (
            <iframe
              src={DEMO_VIDEO_URL}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="AlgoLend Platform Demo"
            />
          ) : (
            /* ── Placeholder until recording is ready ── */
            <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-8 text-center"
              style={{ background: 'linear-gradient(135deg, #0A0514 0%, #130827 50%, #090B18 100%)' }}>
              {/* Glow */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
              </div>

              {/* Play button */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
                  <Play size={28} fill="white" className="text-white ml-1" />
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(124,58,237,0.3)', animationDuration: '2s' }} />
              </div>

              <div className="relative space-y-3 max-w-md">
                <p className="text-2xl font-semibold text-white tracking-tight">
                  Demo video coming soon
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  We're recording a full walkthrough of the AlgoLend platform —
                  credit engine, borrower portal, SACRRA reporting, and admin console.
                </p>
              </div>

              <div className="relative flex flex-col sm:flex-row gap-3">
                <a
                  href="#enquire"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5CF6)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}
                >
                  Book a live walk-through
                </a>
                <a
                  href="https://app.algolend.co.za"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white/70 hover:text-white transition-colors border border-white/15 hover:border-white/30"
                >
                  <ExternalLink size={14} /> Try live demo
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        <p className="text-center text-white/30 text-xs mt-4">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
