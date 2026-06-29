/**
 * POST /api/payfast/notify
 *
 * PayFast ITN (Instant Transaction Notification) handler.
 * PayFast POSTs here after every payment event — one-off and subscription renewals.
 *
 * On COMPLETE:
 *   - One-off: marks the invoice paid, logs pf_payment_id in notes
 *   - Subscription initial: stores token on the client record
 *   - Subscription renewal: finds the current unpaid invoice for that client and marks it paid
 *
 * PayFast requires a plain 200 OK response with no body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyITN, type ITNData } from '@/lib/payfast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0';

  // Parse form-encoded body
  const text = await req.text();
  const data: ITNData = Object.fromEntries(
    text.split('&').map(pair => {
      const [k, ...rest] = pair.split('=');
      return [k, decodeURIComponent(rest.join('=').replace(/\+/g, ' '))];
    })
  );

  // Verify with PayFast
  const { valid, reason } = await verifyITN(data, ip);
  if (!valid) {
    console.error('[payfast/notify] ITN rejected:', reason, { ip, m_payment_id: data.m_payment_id });
    return new NextResponse(null, { status: 200 }); // always 200 to PayFast
  }

  const mPaymentId = data.m_payment_id ?? '';
  const pfId       = data.pf_payment_id ?? '';
  const token      = data.token;
  const now        = new Date().toISOString();

  try {
    /* ── Subscription initial setup (m_payment_id starts with "sub-") ── */
    if (mPaymentId.startsWith('sub-')) {
      const clientId = mPaymentId.replace('sub-', '');

      // Store PayFast subscription token on client (column may not exist — silent fail)
      if (token) {
        await supabaseAdmin
          .from('clients')
          .update({ payfast_token: token, payfast_subscribed_at: now } as Record<string, unknown>)
          .eq('id', clientId);
      }

      // Mark the most recent unpaid sent invoice for this client as paid
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('id, reference')
        .eq('client_id', clientId)
        .in('status', ['sent', 'draft'])
        .order('issued_at', { ascending: false })
        .limit(1)
        .single();

      if (inv) {
        await supabaseAdmin
          .from('invoices')
          .update({ status: 'paid', paid_at: now, notes: `Paid via PayFast subscription. Token: ${token ?? 'n/a'}. PF ID: ${pfId}.` })
          .eq('id', inv.id);
      }

      console.log('[payfast/notify] Subscription activated for client', clientId, { token, pfId });
      return new NextResponse(null, { status: 200 });
    }

    /* ── Subscription renewal (has token, m_payment_id is a previous sub ref) ── */
    if (token) {
      // Find client by stored token
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('payfast_token' as string, token)
        .single();

      if (client) {
        const { data: inv } = await supabaseAdmin
          .from('invoices')
          .select('id')
          .eq('client_id', client.id)
          .in('status', ['sent', 'draft'])
          .order('issued_at', { ascending: false })
          .limit(1)
          .single();

        if (inv) {
          await supabaseAdmin
            .from('invoices')
            .update({ status: 'paid', paid_at: now, notes: `Auto-paid via PayFast subscription renewal. Token: ${token}. PF ID: ${pfId}.` })
            .eq('id', inv.id);
        }
      }

      console.log('[payfast/notify] Subscription renewal', { token, pfId });
      return new NextResponse(null, { status: 200 });
    }

    /* ── One-off invoice payment ─────────────────────────────────────── */
    const { data: inv, error } = await supabaseAdmin
      .from('invoices')
      .select('id, total_cents')
      .eq('id', mPaymentId)
      .single();

    if (error || !inv) {
      console.error('[payfast/notify] Invoice not found:', mPaymentId);
      return new NextResponse(null, { status: 200 });
    }

    await supabaseAdmin
      .from('invoices')
      .update({ status: 'paid', paid_at: now, notes: `Paid via PayFast. PF ID: ${pfId}.` })
      .eq('id', inv.id);

    console.log('[payfast/notify] Invoice paid:', mPaymentId, { pfId });
  } catch (err) {
    console.error('[payfast/notify] Error processing ITN:', err);
  }

  return new NextResponse(null, { status: 200 });
}
