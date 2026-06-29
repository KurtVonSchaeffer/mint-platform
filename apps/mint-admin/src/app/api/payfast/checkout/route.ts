/**
 * POST /api/payfast/checkout
 *
 * Generates a PayFast payment form payload for either:
 *   - type: "once_off"    → pay a specific invoice
 *   - type: "subscription" → set up monthly recurring billing for a client
 *
 * Returns { url, fields } — the client auto-submits a hidden form to `url`
 * with the `fields` as hidden inputs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildOneOffForm, buildSubscriptionForm, PAYFAST_PROCESS_URL } from '@/lib/payfast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    type:       'once_off' | 'subscription';
    invoice_id?: string;
    client_id?:  string;
  };

  if (body.type === 'once_off') {
    if (!body.invoice_id) {
      return NextResponse.json({ error: 'invoice_id required for once_off' }, { status: 400 });
    }

    const { data: inv, error } = await supabaseAdmin
      .from('invoices')
      .select('id, reference, total_cents, status, clients(name, contact_email)')
      .eq('id', body.invoice_id)
      .single();

    if (error || !inv) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (inv.status === 'paid' || inv.status === 'void') {
      return NextResponse.json({ error: `Invoice is already ${inv.status}` }, { status: 422 });
    }

    const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
    if (!client) return NextResponse.json({ error: 'Client not found on invoice' }, { status: 422 });

    const fields = buildOneOffForm({
      invoiceId:    inv.id,
      reference:    inv.reference,
      clientName:   client.name,
      contactEmail: client.contact_email,
      amountCents:  inv.total_cents,
    });

    return NextResponse.json({ url: PAYFAST_PROCESS_URL, fields });
  }

  if (body.type === 'subscription') {
    if (!body.client_id) {
      return NextResponse.json({ error: 'client_id required for subscription' }, { status: 400 });
    }

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('id, name, contact_email, monthly_fee_cents, tier')
      .eq('id', body.client_id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    if (!client.monthly_fee_cents || client.monthly_fee_cents <= 0) {
      return NextResponse.json({ error: 'Client has no monthly fee set' }, { status: 422 });
    }

    // Include VAT (15%) in the amount charged via PayFast
    const grossCents = Math.round(client.monthly_fee_cents * 1.15);

    const fields = buildSubscriptionForm({
      clientId:           client.id,
      clientName:         client.name,
      contactEmail:       client.contact_email,
      monthlyAmountCents: grossCents,
    });

    return NextResponse.json({ url: PAYFAST_PROCESS_URL, fields });
  }

  return NextResponse.json({ error: 'type must be once_off or subscription' }, { status: 400 });
}
