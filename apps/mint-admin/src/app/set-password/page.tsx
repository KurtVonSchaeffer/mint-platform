'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, Loader2, LinkIcon } from 'lucide-react';
import Image from 'next/image';

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function parseHashError(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const errorCode = params.get('error_code');
  if (!errorCode) return null;
  if (errorCode === 'otp_expired') return 'expired';
  if (errorCode === 'access_denied') return 'expired';
  return 'invalid';
}

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const code   = params.get('code');

  const [ready, setReady]       = useState(false);
  const [expired, setExpired]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    // Check for Supabase error in URL hash immediately — no waiting
    const hashErr = parseHashError();
    if (hashErr) {
      setExpired(true);
      return;
    }

    // Path 1: PKCE flow — ?code= in query string
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) setExpired(true);
        else setReady(true);
      });
      return;
    }

    // Path 2: Implicit flow — #access_token= in hash (Supabase admin generateLink)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback timeout — only fires if no hash error and no session resolved
  useEffect(() => {
    if (ready || expired || error) return;
    const t = setTimeout(() => { if (!ready) setExpired(true); }, 6000);
    return () => clearTimeout(t);
  }, [ready, expired, error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }

    setError(null);
    setLoading(true);

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.replace('/'), 1500);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="pointer-events-none fixed inset-0" aria-hidden
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm" style={{ animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="bento-card p-8" style={{ borderColor: expired ? 'rgba(248,113,113,0.3)' : 'rgba(124,58,237,0.2)' }}>
          <div className="flex flex-col items-center mb-8">
            <Image src="/algolend-logo-dark.png" alt="AlgoLend" width={160} height={40} style={{ objectFit: 'contain' }} priority className="light-hidden" />
            <Image src="/algolend-logo.png"      alt="AlgoLend" width={160} height={40} style={{ objectFit: 'contain' }} priority className="light-only" />
            <p className="text-[11px] tracking-widest uppercase mt-2" style={{ color: expired ? 'rgba(248,113,113,0.6)' : 'rgba(167,139,250,0.5)' }}>
              {expired ? 'Link expired' : 'Set your password'}
            </p>
          </div>

          {/* ── Expired state ── */}
          {expired && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
                <LinkIcon size={22} style={{ color: 'var(--color-red)' }} />
              </div>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: 'var(--color-text)' }}>
                  This link has expired
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text3)' }}>
                  Password links are valid for 24 hours. Ask your admin to send you a new one from the Users page.
                </p>
              </div>
              <div className="w-full pt-2 mt-2" style={{ borderTop: '1px solid var(--color-border2)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                  Admin: go to <span className="font-mono" style={{ color: 'var(--color-violet)' }}>/users</span> → Reset password
                </p>
              </div>
            </div>
          )}

          {/* ── Success state ── */}
          {!expired && done && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={36} style={{ color: 'var(--color-teal)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Password set! Redirecting…</p>
            </div>
          )}

          {/* ── Loading / verifying ── */}
          {!expired && !done && !ready && !error && (
            <div className="flex items-center justify-center gap-2 py-6" style={{ color: 'var(--color-text3)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Verifying link…</span>
            </div>
          )}

          {/* ── Password form ── */}
          {!expired && !done && ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text3)' }}>
                Choose a password to secure your account.
              </p>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="field-input pr-10"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ color: 'var(--color-text3)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className="field-input"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--color-red)' }}>
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                {loading ? 'Saving…' : 'Set password & sign in'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text3)' }}>
          Access restricted to Mint Platforms staff only.
        </p>
      </div>
    </div>
  );
}
