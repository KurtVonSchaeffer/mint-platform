import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, biztechInvoiceReminderEmail } from '@/lib/email';
import { findClientContact } from '@/lib/biztech';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: invoice, error } = await supabaseAdmin
    .from('biztech_invoices')
    .select('*, biztech_clients(id, name)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const contact = await findClientContact(invoice.client_id);
  if (!contact) {
    return NextResponse.json({ error: 'No contact with an email address found for this client' }, { status: 422 });
  }

  const daysOverdue = invoice.due_at
    ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_at).getTime()) / 86_400_000))
    : 0;

  const result = await sendEmail({
    to: contact.email,
    subject: daysOverdue > 0
      ? `Overdue: Invoice ${invoice.reference} — ${daysOverdue} days`
      : `Payment reminder: Invoice ${invoice.reference}`,
    html: biztechInvoiceReminderEmail({
      reference: invoice.reference,
      clientName: invoice.biztech_clients?.name ?? '',
      contact: contact.name,
      totalCents: invoice.total_cents,
      dueDate: invoice.due_at ?? '',
      daysOverdue,
    }),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  await supabaseAdmin
    .from('biztech_invoices')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true, sentTo: contact.email });
}
