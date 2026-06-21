import Link from 'next/link';

export default function NotFound() {
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
          fontSize: '48px',
          fontWeight: 800,
          color: 'var(--color-purple)',
          fontFamily: 'var(--font-jetbrains)',
          marginBottom: '12px',
          letterSpacing: '-0.04em',
        }}>
          404
        </div>
        <h1 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: '8px',
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text2)',
          marginBottom: '28px',
          lineHeight: 1.6,
        }}>
          This page doesn't exist or you don't have access to it.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '9px 24px',
            borderRadius: '8px',
            background: 'var(--color-purple)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
