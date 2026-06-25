'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

const SESSION_KEY = 'algolend_prices_unlocked';

function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function setSessionUnlocked() {
  sessionStorage.setItem(SESSION_KEY, '1');
}

interface Props {
  children:      React.ReactNode;
  isSuperAdmin:  boolean;
  email:         string;
  /** Inline pill vs block — default inline */
  block?:        boolean;
}

export function PriceReveal({ children, isSuperAdmin, email, block }: Props) {
  const [unlocked,   setUnlocked]   = useState(isSessionUnlocked);
  const [showModal,  setShowModal]  = useState(false);
  const [pw,         setPw]         = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  // Non-super-admin: always show a locked pill
  if (!isSuperAdmin) {
    return (
      <span
        className={block ? 'flex items-center gap-1.5' : 'inline-flex items-center gap-1'}
        style={{
          fontSize: 10, fontWeight: 700, padding: block ? '4px 10px' : '2px 7px',
          borderRadius: 6, color: 'var(--color-text3)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--color-border2)',
        }}
      >
        <Lock size={9} />
        Restricted
      </span>
    );
  }

  // Super admin, already unlocked this session
  if (unlocked) return <>{children}</>;

  // Super admin, locked — show reveal button + modal
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1 transition-all"
        style={{
          fontSize: 10, fontWeight: 700,
          padding: block ? '5px 12px' : '2px 8px',
          borderRadius: 6,
          color: 'var(--color-violet)',
          background: 'rgba(124,58,237,0.10)',
          border: '1px solid rgba(124,58,237,0.25)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.18)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.10)'; }}
      >
        <Lock size={9} /> Show rate
      </button>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 300, background: 'rgba(6,7,13,0.75)', backdropFilter: 'blur(6px)', animation: 'fade-in 0.15s ease both' }}
          onClick={() => { setShowModal(false); setPw(''); setError(''); }}
        >
          <div
            className="w-80 rounded-2xl p-6 space-y-5"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid rgba(124,58,237,0.35)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.12)',
              animation: 'scale-in 0.2s cubic-bezier(0.16,1,0.3,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-violet)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Confirm identity</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text3)' }}>Per-check rates are super admin only</p>
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text3)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && pw) void verify(); }}
                  placeholder="Your AlgoLend password"
                  className="field-input w-full pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text3)' }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {error && (
                <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-red)' }}>{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={verify}
                disabled={!pw || loading}
                className="btn-purple btn-shine inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
              >
                <ShieldCheck size={13} />
                {loading ? 'Verifying…' : 'Unlock'}
              </button>
              <button
                onClick={() => { setShowModal(false); setPw(''); setError(''); }}
                className="py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Cancel
              </button>
            </div>

            <p className="text-[10px] text-center" style={{ color: 'var(--color-text3)' }}>
              Unlocked for this browser session only
            </p>
          </div>
        </div>
      )}
    </>
  );

  async function verify() {
    if (!pw) return;
    setLoading(true);
    setError('');
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error: authErr } = await sb.auth.signInWithPassword({ email, password: pw });
      if (authErr) {
        setError('Incorrect password. Try again.');
      } else {
        setSessionUnlocked();
        setUnlocked(true);
        setShowModal(false);
        setPw('');
      }
    } catch {
      setError('Verification failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }
}
