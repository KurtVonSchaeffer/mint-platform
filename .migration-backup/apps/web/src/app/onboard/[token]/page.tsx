import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { OnboardingForm } from './OnboardingForm';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function OnboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = getSupabase();
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, company, onboarding_status, onboarding_data')
    .eq('onboarding_token', token)
    .single();

  if (!lead) notFound();

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
      token={token}
      leadId={lead.id}
      prefill={{
        name:    lead.name,
        email:   lead.email,
        company: lead.company,
        phone:   (lead.onboarding_data as Record<string, string> | null)?.phone ?? '',
        ncr:     (lead.onboarding_data as Record<string, string> | null)?.ncr_number ?? '',
      }}
    />
  );
}
