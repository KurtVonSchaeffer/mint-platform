import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { initials } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Check, AlertCircle } from 'lucide-react';

interface ProfileForm {
  full_name:      string;
  contact_number: string;
}

interface PasswordForm {
  current: string;
  next:    string;
  confirm: string;
}

export function ProfilePage() {
  const { profile, user } = useAuth();

  const [form, setForm] = useState<ProfileForm>({ full_name: '', contact_number: '' });
  const [pw, setPw]     = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw]           = useState(false);
  const [profileMsg, setProfileMsg]       = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pwMsg, setPwMsg]                 = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Hydrate form from loaded profile
  useEffect(() => {
    if (profile) {
      setForm({
        full_name:      profile.full_name      ?? '',
        contact_number: profile.contact_number ?? '',
      });
    }
  }, [profile]);

  async function saveProfile() {
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      if (!user) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name.trim(), contact_number: form.contact_number.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      setProfileMsg({ kind: 'success', text: 'Profile saved.' });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to save profile.';
      setProfileMsg({ kind: 'error', text });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPwMsg(null);
    if (pw.next.length < 8) {
      setPwMsg({ kind: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwMsg({ kind: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ kind: 'success', text: 'Password updated.' });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to update password.';
      setPwMsg({ kind: 'error', text });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-6 page-enter max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">Profile</h1>
        <p className="text-[var(--color-ink-soft)] text-sm mt-1">Your personal details and login security.</p>
      </div>

      {/* Identity card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-muted)] flex items-center justify-center text-[var(--color-brand)] text-xl font-bold">
              {initials(form.full_name || profile?.full_name || 'U')}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-ink)]">{form.full_name || profile?.full_name || '—'}</p>
              <p className="text-sm text-[var(--color-ink-muted)] capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <Input label="Email" value={profile?.email ?? ''} disabled hint="Email is your sign-in — contact support to change." />
          </div>
          <Input
            label="Contact Number"
            value={form.contact_number}
            onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
            placeholder="+27 ..."
          />

          {profileMsg ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              profileMsg.kind === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {profileMsg.kind === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {profileMsg.text}
            </div>
          ) : null}

          <div className="pt-2">
            <Button size="md" onClick={saveProfile} loading={savingProfile}>
              Save changes
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Password card */}
      <Card>
        <CardHeader><h3 className="font-semibold text-[var(--color-ink)]">Change password</h3></CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            hint="For audit — Supabase only needs the new password."
          />
          <Input
            label="New password"
            type="password"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          />

          {pwMsg ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              pwMsg.kind === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {pwMsg.kind === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {pwMsg.text}
            </div>
          ) : null}

          <Button variant="outline" size="md" onClick={changePassword} loading={savingPw}>
            Update password
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
