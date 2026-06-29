'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

// Swap to a Loom/YouTube embed URL to override the self-hosted video
const DEMO_VIDEO_URL = ''; // e.g. 'https://www.loom.com/embed/xxxx'
const DEMO_VIDEO_SRC = '/videos/algolend-showcase-FINAL.mp4?v=3';

export function DemoVideoModal({ onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted) return null;

  return createPortal(
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
            <video
              className="w-full h-full"
              src={DEMO_VIDEO_SRC}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label="AlgoLend platform demo video"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Caption */}
        <p className="text-center text-white/30 text-xs mt-4">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">Esc</kbd> to close
        </p>
      </div>
    </div>,
    document.body
  );
}
