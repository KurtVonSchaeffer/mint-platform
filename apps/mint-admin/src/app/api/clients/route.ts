import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ALL_FEATURES } from '@/lib/features';
import { sendEmail, welcomeClientEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface CreateClientInput {
  name: string;
  slug: string;
  legal_name?: string;
  contact_email: string;
  contact_name?: string;
  ncr_number?: string;
  tier: 'core' | 'growth' | 'enterprise';
  monthly_fee_cents: number;
  primary_color: string;
  secondary_color: string;
  support_email?: string;
  features: Record<string, boolean>;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, slug, subdomain, domain, tier, status, contact_email, contact_name, monthly_fee_cents, primary_color, secondary_color, created_at, client_features(flag, enabled)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[clients] list failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}

export async function POST(req: NextRequest) {
  let body: CreateClientInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, slug, legal_name, contact_email, contact_name, ncr_number,
          tier, monthly_fee_cents, primary_color, secondary_color,
          support_email, features } = body;

  if (!name || !slug || !contact_email || !tier) {
    return NextResponse.json({ error: 'name, slug, contact_email, and tier are required' }, { status: 422 });
  }

  // slug must be lowercase alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'slug must be lowercase alphanumeric with hyphens only' }, { status: 422 });
  }

  // Insert client row
  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients')
    .insert({
      name,
      slug,
      subdomain: slug,
      legal_name: legal_name ?? null,
      contact_email,
      contact_name: contact_name ?? null,
      ncr_number: ncr_number ?? null,
      tier,
      status: 'trial',
      monthly_fee_cents,
      primary_color,
      secondary_color,
      support_email: support_email ?? null,
    })
    .select()
    .single();

  if (clientErr) {
    console.error('[clients] insert failed', clientErr);
    const isDuplicate = clientErr.code === '23505';
    return NextResponse.json(
      { error: isDuplicate ? `A client with slug "${slug}" already exists.` : clientErr.message },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  // Seed all feature flags, enabled or not, so every flag has a row
  const featureRows = ALL_FEATURES.map((flag) => ({
    client_id: client.id,
    flag,
    enabled: features[flag] ?? false,
    enabled_at: features[flag] ? new Date().toISOString() : null,
  }));

  const { error: featErr } = await supabaseAdmin
    .from('client_features')
    .insert(featureRows);

  if (featErr) {
    // Don't fail the whole request — client row exists, features can be fixed later
    console.error('[clients] feature seed failed', featErr);
  }

  const tenantUrl = `https://${slug}.algolend.co.za`;

  // Send welcome email (fire-and-forget — never block the response)
  sendEmail({
    to:      contact_email,
    subject: `Welcome to AlgoLend — your platform is ready`,
    html:    welcomeClientEmail({
      name:      name,
      contact:   contact_name ?? contact_email.split('@')[0],
      slug,
      portalUrl: tenantUrl,
    }),
  }).catch(err => console.error('[clients] welcome email failed:', err));

  return NextResponse.json(
    { client, tenantUrl, featuresSeeded: !featErr },
    { status: 201 },
  );
}
