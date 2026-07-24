'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

function useBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default function TelemarketerProfilePage() {
  const supabase = useBrowserSupabase();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [pw,   setPw]   = useState({ current: '', next: '', confirm: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [savedProfile,   setSavedProfile]   = useState(false);
  const [savingPw,       setSavingPw]       = useState(false);
  const [savedPw,        setSavedPw]        = useState(false);
  const [error,          setError]          = useState('');
  const [pwError,        setPwError]        = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setForm({
          fullName: (user.user_metadata?.full_name as string) ?? '',
          email:    user.email ?? '',
          phone:    (user.user_metadata?.phone as string) ?? '',
        });
      }
      setLoadingProfile(false);
    });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({
      data: { full_name: form.fullName, phone: form.phone },
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 3000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) { setPwError('New passwords do not match.'); return; }
    if (pw.next.length < 8)    { setPwError('Password must be at least 8 characters.'); return; }
    setSavingPw(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw.next });
    setSavingPw(false);
    if (err) { setPwError(err.message); return; }
    setPw({ current: '', next: '', confirm: '' });
    setSavedPw(true);
    setTimeout(() => setSavedPw(false), 3000);
  }

  const initials = form.fullName.split(' ').map(w => w[0]).join('').slice(0, 2) || '?';

  return (
    <div className="space-y-6 page-enter max-w-lg">
      <div>
        <p className="eyebrow mb-1">Account</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>My Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#34D399,#10B981)', boxShadow: '0 0 0 4px rgba(52,211,153,0.15)' }}>
          {loadingProfile ? <Loader2 size={20} className="animate-spin" /> : initials}
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{form.fullName || '—'}</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
            Telemarketer Agent
          </span>
        </div>
      </div>

      {/* Profile form */}
      <div className="bento-card p-6">
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Personal Information</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {[
            { key: 'fullName', label: 'Full Name',   icon: User,  type: 'text',  value: form.fullName },
            { key: 'email',    label: 'Email',        icon: Mail,  type: 'email', value: form.email    },
            { key: 'phone',    label: 'Phone Number', icon: Phone, type: 'tel',   value: form.phone    },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>{f.label}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text3)' }}>
                  <f.icon size={13} />
                </div>
                <input
                  type={f.type}
                  className="field-input pl-9"
                  value={f.value}
                  disabled={f.key === 'email'}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={f.key === 'email' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                />
              </div>
              {f.key === 'email' && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>Email cannot be changed here — contact your manager.</p>
              )}
            </div>
          ))}
          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}
          <button type="submit" disabled={saving || loadingProfile}
            className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : savedProfile ? null : <Save size={13} />}
            {saving ? 'Saving…' : savedProfile ? '✓ Saved' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bento-card p-6">
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { key: 'current', label: 'Current Password' },
            { key: 'next',    label: 'New Password' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>{f.label}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text3)' }}>
                  <Lock size={13} />
                </div>
                <input
                  type="password"
                  className="field-input pl-9"
                  value={pw[f.key as keyof typeof pw]}
                  onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          {pwError && <p className="text-xs" style={{ color: '#F87171' }}>{pwError}</p>}
          <button type="submit" disabled={savingPw}
            className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-1.5">
            {savingPw ? <Loader2 size={13} className="animate-spin" /> : savedPw ? null : <Lock size={13} />}
            {savingPw ? 'Updating…' : savedPw ? '✓ Password Updated' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
