'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import SignaturePadLib from 'signature_pad';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface Props {
  disabled?: boolean;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad({ disabled }, ref) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const padRef     = useRef<SignaturePadLib | null>(null);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    toDataURL: () => padRef.current?.toDataURL('image/png') ?? '',
    clear: () => padRef.current?.clear(),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale for retina displays
    function resize() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas!.width  = canvas!.offsetWidth  * ratio;
      canvas!.height = canvas!.offsetHeight * ratio;
      canvas!.getContext('2d')!.scale(ratio, ratio);
      padRef.current?.clear();
    }

    const pad = new SignaturePadLib(canvas, {
      minWidth: 1.5,
      maxWidth: 3,
      penColor: '#1a1a2e',
      backgroundColor: 'rgba(0,0,0,0)',
    });
    padRef.current = pad;

    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      pad.off();
    };
  }, []);

  useEffect(() => {
    if (!padRef.current) return;
    if (disabled) padRef.current.off();
    else padRef.current.on();
  }, [disabled]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 140,
          borderRadius: 10,
          border: `1px solid ${disabled ? 'var(--color-border)' : 'rgba(124,58,237,0.4)'}`,
          background: disabled ? 'rgba(0,0,0,0.02)' : '#fff',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          display: 'block',
          opacity: disabled ? 0.4 : 1,
          touchAction: 'none',
        }}
      />
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
        {disabled ? 'Accept the terms above to enable signing.' : 'Sign above using your mouse or finger.'}
      </p>
    </div>
  );
});
