import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientSupabase } from '@/lib/client-db';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fmtZar(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

/**
 * PATCH /api/marketplace/applications/[applicationId]
 * Body: { action: 'approve' | 'decline', declineReason?: string }
 *
 * Approve  → status: lender_approved  + email borrower
 * Decline  → status: lender_declined  + email borrower
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  let body: { action: 'approve' | 'decline'; declineReason?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, declineReason } = body;
  if (action !== 'approve' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be approve or decline' }, { status: 422 });
  }

  // Load the offer + request + lender
  const { data: offer, error: offerErr } = await supabaseAdmin
    .from('quote_offers')
    .select(`
      id, status, offered_amount, offered_rate_pct, monthly_installment,
      offered_term_months, client_id,
      quote_requests (
        id, reference, consumer_email, consumer_name,
        requested_amount, requested_term
      ),
      clients:client_id (name, contact_email, avg_turnaround_days:lender_policies(avg_turnaround_days))
    `)
    .eq('id', applicationId)
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (offer.status !== 'accepted') {
    return NextResponse.json({ error: `Cannot ${action} — current status is ${offer.status}` }, { status: 409 });
  }

  const newStatus = action === 'approve' ? 'lender_approved' : 'lender_declined';

  const { error: updateErr } = await supabaseAdmin
    .from('quote_offers')
    .update({ status: newStatus, [`${action === 'approve' ? 'approved' : 'declined'}_at`]: new Date().toISOString() })
    .eq('id', applicationId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Update quote_request status
  const request = Array.isArray(offer.quote_requests) ? offer.quote_requests[0] : offer.quote_requests;
  if (request?.id) {
    await supabaseAdmin
      .from('quote_requests')
      .update({ status: newStatus })
      .eq('id', request.id);
  }

  // Notify borrower by email (fire-and-forget)
  if (request?.consumer_email) {
    const lenderName = (offer.clients as { name?: string } | null)?.name ?? 'your lender';
    const turnaround: number = 2;

    if (action === 'approve') {
      sendEmail({
        to:      request.consumer_email,
        subject: `Your loan has been approved — ${lenderName}`,
        html: `
          <p>Hi ${request.consumer_name ?? 'there'},</p>
          <p>Great news — <strong>${lenderName}</strong> has approved your loan application.</p>
          <ul>
            <li>Amount: <strong>${fmtZar(offer.offered_amount)}</strong></li>
            <li>Monthly repayment: <strong>${fmtZar(offer.monthly_installment)}</strong></li>
            <li>Rate: <strong>${offer.offered_rate_pct}% p.a.</strong></li>
            <li>Term: <strong>${offer.offered_term_months} months</strong></li>
          </ul>
          <p>${lenderName} will be in touch within <strong>${turnaround} business day${turnaround !== 1 ? 's' : ''}</strong> to finalise disbursement.</p>
          <p>Reference: ${request.reference}</p>
        `,
      }).catch(err => console.error('[marketplace/applications] borrower email failed:', err));
    } else {
      sendEmail({
        to:      request.consumer_email,
        subject: `Update on your loan application`,
        html: `
          <p>Hi ${request.consumer_name ?? 'there'},</p>
          <p>Unfortunately <strong>${lenderName}</strong> was unable to proceed with your application at this time.</p>
          ${declineReason ? `<p>Reason: ${declineReason}</p>` : ''}
          <p>You may still qualify with another lender. Please log back into MINT to explore your other options.</p>
        `,
      }).catch(err => console.error('[marketplace/applications] borrower decline email failed:', err));
    }
  }

  // Sync approval/decline status into the lender's own Supabase database
  const mintRequestId = request?.id ?? null;
  const loanAppStatus = action === 'approve' ? 'approved' : 'declined';
  if (mintRequestId) {
    getClientSupabase(offer.client_id).then(async (clientDb) => {
      if (!clientDb) return;
      const appRef = `MINT-${mintRequestId.slice(0, 8).toUpperCase()}`;
      const { error } = await clientDb
        .from('loan_applications')
        .update({ status: loanAppStatus, decision_at: new Date().toISOString() })
        .eq('client_id', offer.client_id)
        .eq('reference', appRef);
      if (error) console.warn('[marketplace/applications] status sync failed:', error.message);
      else console.log(`[marketplace/applications] synced status=${loanAppStatus} ref=${appRef}`);
    }).catch(() => {/* non-blocking */});
  }

  console.log(`[marketplace/applications] ${action} applicationId=${applicationId} lenderId=${offer.client_id}`);
  return NextResponse.json({ ok: true, status: newStatus });
}
