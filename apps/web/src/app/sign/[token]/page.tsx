import { createClient } from '@supabase/supabase-js';
import { SignAgreementForm } from './SignAgreementForm';
import { notFound } from 'next/navigation';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabase();

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, company, onboarding_data, onboarding_status')
    .eq('onboarding_token', token)
    .single();

  if (!lead) return notFound();

  const alreadySigned = !!(lead.onboarding_data as Record<string, unknown>)?.agreement_signature;

  return (
    <SignAgreementForm
      token={token}
      leadId={lead.id}
      clientName={lead.company ?? lead.name}
      contactName={lead.name}
      alreadySigned={alreadySigned}
      signedBy={(lead.onboarding_data as Record<string, unknown>)?.agreement_signature as string | undefined}
      signedAt={(lead.onboarding_data as Record<string, unknown>)?.agreement_signed_at as string | undefined}
    />
  );
}
