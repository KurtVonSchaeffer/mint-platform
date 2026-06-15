'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#0B0D18',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: '#101525',
          border: '1px solid rgba(124,58,237,0.12)',
          borderRadius: '16px',
          padding: '40px 36px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '22px',
          }}>
            ⚠
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#EEF0FF', marginBottom: '8px' }}>
            Critical error
          </h1>
          <p style={{ fontSize: '13px', color: '#8B90B4', marginBottom: '28px', lineHeight: 1.6 }}>
            The application encountered a fatal error and could not recover.
            {error.digest && (
              <span style={{ display: 'block', marginTop: '6px', fontFamily: 'monospace', fontSize: '11px', color: '#6E74A4' }}>
                ref: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#7C3AED',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
