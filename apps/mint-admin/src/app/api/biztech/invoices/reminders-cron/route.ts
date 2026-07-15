import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, biztechInvoiceReminderEmail } from '@/lib/email';
import { findClientContact } from '@/lib/biztech';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_REMINDERS = 3;

/**
 * GET /api/biztech/invoices/reminders-cron
 *
 * Called by Vercel Cron daily. Two jobs:
 *   1. Flip any "sent" invoice past its due_at to "overdue".
 *   2. Email a reminder for every "overdue" invoice not reminded in the
 *      last 3 days (so it nags periodically, not once and never again),
 *      capped at MAX_REMINDERS total. Stops automatically once the
 *      invoice is paid, since paid invoices no longer match status
 *      'overdue' and drop out of the query below.
 *
 * Protected by CRON_SECRET, same pattern as /api/billing/cron.
 */

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const now = new Date();

  // 1. sent → overdue
  const { error: flipError } = await supabaseAdmin
    .from('biztech_invoices')
    .update({ status: 'overdue' })
    .eq('status', 'sent')
    .lt('due_at', now.toISOString());

  if (flipError) return NextResponse.json({ error: flipError.message }, { status: 500 });

  // 2. Remind overdue invoices not nagged in the last 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();

  const { data: dueForReminder, error: fetchError } = await supabaseAdmin
    .from('biztech_invoices')
    .select('*, biztech_clients(id, name)')
    .eq('status', 'overdue')
    .lt('reminder_count', MAX_REMINDERS)
    .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${threeDaysAgo}`);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;

  for (const invoice of dueForReminder ?? []) {
    const contact = await findClientContact(invoice.client_id);
    if (!contact) { skipped++; continue; }

    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(invoice.due_at).getTime()) / 86_400_000));

    const result = await sendEmail({
      to: contact.email,
      subject: `Overdue: Invoice ${invoice.reference} — ${daysOverdue} days`,
      html: biztechInvoiceReminderEmail({
        reference: invoice.reference,
        clientName: invoice.biztech_clients?.name ?? '',
        contact: contact.name,
        totalCents: invoice.total_cents,
        dueDate: invoice.due_at,
        daysOverdue,
        invoiceId: invoice.id,
      }),
    });

    if (result.ok) {
      sent++;
      await supabaseAdmin
        .from('biztech_invoices')
        .update({ reminder_sent_at: now.toISOString(), reminder_count: (invoice.reminder_count ?? 0) + 1 })
        .eq('id', invoice.id);
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ flippedToOverdue: true, reminders: { sent, skipped, candidates: dueForReminder?.length ?? 0 } });
}
