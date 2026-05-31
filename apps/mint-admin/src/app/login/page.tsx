'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

function AlgoLendMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lg1" x1="4" y1="28" x2="28" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7C3AED" />
          <stop offset="50%"  stopColor="#9B5CF6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="lg2" x1="4" y1="8" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path d="M4 26 Q4 6 16 6 Q28 6 28 26" stroke="url(#lg1)" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M9 26 Q9 12 16 12 Q23 12 23 26" stroke="url(#lg2)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <circle cx="16" cy="26" r="2" fill="url(#lg1)" />
    </svg>
  );
}

export default function LoginPage() {
  const router      = useRouter();
  const params      = useSearchParams();
  const next        = params.get('next') ?? '/';

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Create the browser Supabase client once
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // If already authed, skip straight to the app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : signInError.message,
      );
      setLoading(false);
      return;
    }

    // Middleware will now see a valid session cookie — navigate home
    router.replace(next);
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm"
        style={{ animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        {/* Card */}
        <div
          className="bento-card p-8"
          style={{ borderColor: 'rgba(124,58,237,0.2)' }}
        >
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <AlgoLendMark />
            <div className="mt-3 text-center">
              <p
                className="text-lg font-bold tracking-tight"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #EEF0FF 0%, #C4B5FD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                AlgoLend
              </p>
              <p className="text-[11px] tracking-widest uppercase mt-0.5" style={{ color: 'rgba(167,139,250,0.5)' }}>
                Admin Console
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                className="field-input"
                placeholder="admin@mintplatforms.co.za"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="field-input pr-10"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--color-text3)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: 'var(--color-red)',
                }}
              >
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text3)' }}>
          Access restricted to Mint Platforms staff only.
        </p>
      </div>
    </div>
  );
}
