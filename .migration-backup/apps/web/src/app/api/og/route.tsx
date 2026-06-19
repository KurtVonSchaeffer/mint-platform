import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F0B1A 0%, #1A0F2E 50%, #0B0D18 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Purple glow */}
        <div style={{
          position: 'absolute', top: -100, left: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, zIndex: 1 }}>
          {/* Logo mark */}
          <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
            <path d="M4 26 Q4 6 16 6 Q28 6 28 26" stroke="#A78BFA" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d="M9 26 Q9 12 16 12 Q23 12 23 26" stroke="#7C3AED" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
            <circle cx="16" cy="26" r="2" fill="#A78BFA" />
          </svg>

          {/* Wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: '#EEF0FF', letterSpacing: '-2px', lineHeight: 1 }}>
              AlgoLend
            </div>
            <div style={{ fontSize: 24, color: 'rgba(167,139,250,0.8)', fontWeight: 400, letterSpacing: '0.05em' }}>
              End-to-End Lending Platform
            </div>
          </div>

          {/* Tag line */}
          <div style={{
            fontSize: 18, color: 'rgba(238,240,255,0.5)',
            padding: '10px 24px', borderRadius: 100,
            border: '1px solid rgba(124,58,237,0.3)',
            background: 'rgba(124,58,237,0.08)',
          }}>
            Built for South African credit providers
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
