import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, invoiceReminderEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_REMINDERS = 3;

/**
 * GET /api/invoices/reminders-cron
 *
 * Called by Vercel Cron daily. Two jobs, mirroring /api/biztech/invoices/reminders-cron:
 *   1. Flip any "sent" invoice past its due_at to "overdue".
 *   2. Email a reminder for every "overdue" invoice not reminded in the last
 *      3 days, capped at MAX_REMINDERS total. Stops automatically once the
 *      invoice is paid (PayFast webhook sets status: 'paid'), since paid
 *      invoices no longer match status 'overdue' and drop out of the query.
 *
 * This only detects and nags — it never changes a client's account status.
 * Auto-suspend on non-payment is a separate, deliberately gated step.
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
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'sent')
    .lt('due_at', now.toISOString());

  if (flipError) return NextResponse.json({ error: flipError.message }, { status: 500 });

  // 2. Remind overdue invoices not nagged in the last 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();

  const { data: dueForReminder, error: fetchError } = await supabaseAdmin
    .from('invoices')
    .select('id, reference, total_cents, due_at, reminder_count, clients(name, contact_email, contact_name)')
    .eq('status', 'overdue')
    .lt('reminder_count', MAX_REMINDERS)
    .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${threeDaysAgo}`);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;

  for (const invoice of dueForReminder ?? []) {
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
    if (!client?.contact_email) { skipped++; continue; }

    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(invoice.due_at).getTime()) / 86_400_000));

    const result = await sendEmail({
      to:      client.contact_email,
      subject: `Overdue: Invoice ${invoice.reference} — ${daysOverdue} days`,
      html:    invoiceReminderEmail({
        reference:   invoice.reference,
        clientName:  client.name,
        contact:     client.contact_name ?? client.contact_email.split('@')[0],
        totalCents:  invoice.total_cents,
        dueDate:     new Date(invoice.due_at).toLocaleDateString('en-ZA'),
        daysOverdue,
        invoiceId:   invoice.id,
      }),
    });

    if (result.ok) {
      sent++;
      await supabaseAdmin
        .from('invoices')
        .update({ reminder_sent_at: now.toISOString(), reminder_count: (invoice.reminder_count ?? 0) + 1 })
        .eq('id', invoice.id);
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ flippedToOverdue: true, reminders: { sent, skipped, candidates: dueForReminder?.length ?? 0 } });
}
