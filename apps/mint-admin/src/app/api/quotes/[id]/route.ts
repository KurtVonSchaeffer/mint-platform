import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/quotes/[id] — update a sales quote */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Fetch existing quote before update so we can detect status transitions
  const { data: existing } = await supabaseAdmin
    .from('sales_quotes')
    .select('status, agent_id, client_name, setup_fee, monthly_fee')
    .eq('id', id)
    .single();

  const patch: Record<string, unknown> = {};
  if ('client'         in body) patch.client_name     = body.client;
  if ('contact'        in body) patch.contact_name    = body.contact;
  if ('email'          in body) patch.contact_email   = body.email;
  if ('setupFee'       in body) patch.setup_fee       = body.setupFee;
  if ('monthlyFee'     in body) patch.monthly_fee     = body.monthlyFee;
  if ('selectedChecks' in body) patch.selected_checks = body.selectedChecks;
  if ('quota'          in body) patch.volume_tier     = String(body.quota);
  if ('branches'       in body) patch.branches        = body.branches;
  if ('customItems'    in body) patch.custom_items    = body.customItems;
  if ('status'         in body) patch.status          = body.status;
  if ('sentDate'       in body) patch.sent_at         = body.sentDate ? new Date(body.sentDate as string).toISOString() : null;
  if ('validUntil'     in body) patch.valid_until     = body.validUntil;
  if ('viewedAt'       in body) patch.viewed_at       = body.viewedAt ? new Date(body.viewedAt as string).toISOString() : null;
  if ('acceptedAt'     in body) patch.accepted_at     = body.acceptedAt ? new Date(body.acceptedAt as string).toISOString() : null;

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Side-effects on status transitions
  const prevStatus = existing?.status as string | undefined;
  const newStatus  = body.status as string | undefined;
  const agentId    = existing?.agent_id as string | undefined;
  const clientName = (existing?.client_name as string | undefined) ?? 'client';

  if (newStatus && newStatus !== prevStatus && agentId) {
    type NotifRow = { agent_id: string; type: string; title: string; message: string; quote_id: string };
    const notifs: NotifRow[] = [];

    if (newStatus === 'draft') {
      notifs.push({
        agent_id: agentId,
        type:     'quote_approved',
        title:    'Quote approved',
        message:  `Your quote for ${clientName} was approved — the admin will send it to the client shortly.`,
        quote_id: id,
      });
    }

    if (newStatus === 'sent') {
      notifs.push({
        agent_id: agentId,
        type:     'quote_sent',
        title:    'Quote sent to client',
        message:  `Your quote for ${clientName} has been sent. You will be notified when they view or accept it.`,
        quote_id: id,
      });
    }

    if (newStatus === 'declined') {
      notifs.push({
        agent_id: agentId,
        type:     'quote_declined',
        title:    'Quote not approved',
        message:  `Your quote for ${clientName} was not approved. Speak to your manager for details.`,
        quote_id: id,
      });
    }

    if (newStatus === 'accepted') {
      // Commission = 25% of the monthly plan fee — a one-time payout, not
      // recurring — computed on monthly_fee specifically (not setup_fee,
      // even though the two are now kept equal by the quote builder).
      const monthlyFee = Number(existing?.monthly_fee ?? 0);
      const commission = Math.round(monthlyFee * 0.25 * 100) / 100;

      if (commission > 0) {
        await supabaseAdmin.from('commissions').insert({
          agent_id:          agentId,
          quote_id:          id,
          commission_amount: commission,
          status:            'Pending Collection',
          notes:             `Auto: 25% of R${monthlyFee.toLocaleString('en-ZA')} monthly fee for ${clientName}`,
        });
      }

      notifs.push({
        agent_id: agentId,
        type:     'quote_accepted',
        title:    'Quote accepted!',
        message:  commission > 0
          ? `${clientName} accepted your quote. R${commission.toLocaleString('en-ZA')} commission recorded.`
          : `${clientName} accepted your quote. Commission recorded.`,
        quote_id: id,
      });

      // Also email the TM directly
      const { data: agentRes } = await supabaseAdmin.auth.admin.getUserById(agentId);
      const agentEmail = agentRes?.user?.email;
      if (agentEmail && commission > 0) {
        sendEmail({
          to:      agentEmail,
          subject: `Commission earned — ${clientName} accepted your quote`,
          html:    `<p style="font-family:sans-serif">Hi there,</p>
                    <p style="font-family:sans-serif">Great news! <strong>${clientName}</strong> has accepted your quote.</p>
                    <p style="font-family:sans-serif">A commission of <strong>R${commission.toLocaleString('en-ZA')}</strong> has been created with status <em>Pending Collection</em>.</p>
                    <p style="font-family:sans-serif">View it on your Statements page.</p>`,
        }).catch(() => {/* non-blocking */});
      }
    }

    if (notifs.length > 0) {
      await supabaseAdmin.from('tm_notifications').insert(notifs);
    }
  }

  return NextResponse.json({ quote: data });
}

/** DELETE /api/quotes/[id] — delete a sales quote */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from('sales_quotes')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
