import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { OnboardingForm } from './OnboardingForm';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  onboarding_status: string;
  onboarding_data: Record<string, string> | null;
}

export default function OnboardPage() {
  // @ts-ignore
  const { token } = useParams<{ token: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState<'loading' | 'notfound' | 'ok'>('loading');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/onboard/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setStatus('notfound'); return; }
        setLead(data);
        setStatus('ok');
      })
      .catch(() => setStatus('notfound'));
  }, [token]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
      </main>
    );
  }

  if (status === 'notfound' || !lead) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
            Invalid or expired link
          </h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            This onboarding link is invalid or has expired. Please contact us at accounts@algolend.co.za.
          </p>
        </div>
      </main>
    );
  }

  if (lead.onboarding_status === 'complete') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: '#ECFDF5', fontSize: 28 }}>✓</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
            Application submitted
          </h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            We've received everything we need from {lead.company}. Our team will review your
            application and be in touch within 1 business day.
          </p>
        </div>
      </main>
    );
  }

  return (
    <OnboardingForm
      token={token!}
      leadId={lead.id}
      prefill={{
        name:    lead.name,
        email:   lead.email,
        company: lead.company,
        phone:   lead.onboarding_data?.phone ?? '',
        ncr:     lead.onboarding_data?.ncr_number ?? '',
      }}
    />
  );
}
