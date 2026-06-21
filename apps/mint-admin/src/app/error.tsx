'use client';

import { useEffect } from 'react';

export default function Error({
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
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
        <h1 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: '8px',
        }}>
          Something went wrong
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text2)',
          marginBottom: '28px',
          lineHeight: 1.6,
        }}>
          {error.message || 'An unexpected error occurred. The team has been notified.'}
          {error.digest && (
            <span style={{ display: 'block', marginTop: '6px', fontFamily: 'var(--font-jetbrains)', fontSize: '11px', color: 'var(--color-text3)' }}>
              ref: {error.digest}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-purple)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface2)',
              color: 'var(--color-text2)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
