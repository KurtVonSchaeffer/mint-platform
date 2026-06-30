import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, invoiceReadyEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

type Action = 'send' | 'mark_paid' | 'void';

/**
 * PATCH /api/invoices/:id
 * Body: { action: "send" | "mark_paid" | "void" }
 *
 * State machine:
 *   draft   → send    → sent
 *   sent    → mark_paid → paid
 *   sent    → void    → void
 *   overdue → mark_paid → paid
 *   overdue → void    → void
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: { action: Action };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body;
  const now = new Date().toISOString();
  const dueAt = new Date(Date.now() + 15 * 86400000).toISOString();

  const patch: Record<string, unknown> = {};

  if (action === 'send') {
    patch.status    = 'sent';
    patch.issued_at = now;
    // Set due 15 days from now if not already set
    patch.due_at    = dueAt;
  } else if (action === 'mark_paid') {
    patch.status  = 'paid';
    patch.paid_at = now;
  } else if (action === 'void') {
    patch.status  = 'void';
    patch.void_at = now;
  } else {
    return NextResponse.json({ error: `Unknown action "${action}". Must be send | mark_paid | void.` }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .select(`
      id, reference, status,
      subtotal_cents, vat_cents, total_cents,
      period_start, period_end,
      invoice_line_items(id),
      clients(name, contact_email, slug)
    `)
    .single();

  if (error) {
    console.error('[invoices] patch failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire invoice email on send (non-blocking)
  if (action === 'send' && data) {
    const client = Array.isArray(data.clients) ? data.clients[0] : data.clients as Record<string, string> | null;
    const contactEmail = client?.contact_email ?? '';
    const clientName   = client?.name ?? 'Client';
    const clientSlug   = client?.slug ?? '';
    const toEmail      = contactEmail || `accounts@${clientSlug}.co.za`;

    if (toEmail) {
      const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

      const html = invoiceReadyEmail({
        invoiceId:    data.id,
        reference:    data.reference,
        clientName,
        contact:      clientName,
        periodStart:  data.period_start ? fmtDate(data.period_start) : '—',
        periodEnd:    data.period_end   ? fmtDate(data.period_end)   : '—',
        subtotalCents: data.subtotal_cents,
        vatCents:      data.vat_cents,
        totalCents:    data.total_cents,
        dueDate:       fmtDate(dueAt),
        lineCount:     Array.isArray(data.invoice_line_items) ? data.invoice_line_items.length : 0,
      });

      sendEmail({
        to:      toEmail,
        subject: `Invoice ${data.reference} from AlgoLend`,
        html,
        replyTo: 'accounts@algolend.co.za',
      }).catch(err => console.error('[invoices] send email failed', err));
    }
  }

  return NextResponse.json({ invoice: data });
}
