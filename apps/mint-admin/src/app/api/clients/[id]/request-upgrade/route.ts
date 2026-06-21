import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, upgradeRequestEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/clients/[id]/request-upgrade
 *
 * Called by the CLIENT'S OWN PORTAL when a client wants to upgrade their
 * API quota or unlock a new feature. Creates a notification record in
 * mint-admin so the team can action it.
 *
 * Body: { type: 'quota' | 'feature', currentQuota?: number, requestedQuota?: number, feature?: string, note?: string }
 *
 * The client portal authenticates with MINT_CLIENT_ID matching the [id] param.
 * Use the service role key — the portal calls this via its own backend.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const body = await req.json() as {
    type:            'quota' | 'feature';
    currentQuota?:   number;
    requestedQuota?: number;
    feature?:        string;
    note?:           string;
  };

  if (!body.type) {
    return NextResponse.json({ error: 'type is required (quota | feature)' }, { status: 400 });
  }

  // Fetch client name for the notification
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('name, contact_email, api_quota, tier')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Build a human-readable message
  let message = '';
  if (body.type === 'quota') {
    message = `${client.name} has requested a quota upgrade from ${(body.currentQuota ?? client.api_quota ?? 0).toLocaleString()} → ${(body.requestedQuota ?? 0).toLocaleString()} calls/month.`;
  } else {
    message = `${client.name} has requested the '${body.feature}' feature to be activated.`;
  }
  if (body.note) message += ` Note: "${body.note}"`;

  // Log to audit trail (using audit_log as a notification store)
  await supabaseAdmin.from('audit_log').insert({
    client_id:   clientId,
    action:      'config_change',
    entity_type: 'upgrade_request',
    entity_id:   clientId,
    description: message,
    after_data: {
      type:           body.type,
      requested_quota: body.requestedQuota,
      feature:         body.feature,
      note:            body.note,
      contact:         client.contact_email,
      tier:            client.tier,
      requested_at:    new Date().toISOString(),
    },
  });

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? 'admin@mintplatforms.co.za';
  sendEmail({
    to:      adminEmail,
    subject: `Upgrade request — ${client.name}`,
    html:    upgradeRequestEmail({
      clientName:     client.name,
      contact:        client.contact_email,
      tier:           client.tier,
      type:           body.type,
      currentQuota:   body.currentQuota ?? (client.api_quota as number | undefined),
      requestedQuota: body.requestedQuota,
      feature:        body.feature,
      note:           body.note,
    }),
  }).catch(err => console.error('[request-upgrade] email failed:', err));

  return NextResponse.json({ ok: true, message: 'Upgrade request received. The Mint Platforms team will be in touch within 1 business day.' });
}
