import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, biztechInvoiceReadyEmail } from '@/lib/email';
import { findClientContact } from '@/lib/biztech';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
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

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('biztech_invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true });

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ invoice, items });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { status, due_at, notes } = body;

  const patch: Record<string, unknown> = {};
  if (status) {
    patch.status = status;
    if (status === 'sent') patch.issued_at = new Date().toISOString();
    if (status === 'paid') patch.paid_at = new Date().toISOString();
    if (status === 'void') patch.void_at = new Date().toISOString();
  }
  if (due_at !== undefined) patch.due_at = due_at;
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabaseAdmin
    .from('biztech_invoices')
    .update(patch)
    .eq('id', id)
    .select('*, biztech_clients(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === 'sent') {
    const contact = await findClientContact(data.client_id);
    if (contact) {
      await sendEmail({
        to: contact.email,
        subject: `Invoice ${data.reference} from MINT BizTech`,
        html: biztechInvoiceReadyEmail({
          reference: data.reference,
          clientName: data.biztech_clients?.name ?? '',
          contact: contact.name,
          totalCents: data.total_cents,
          dueDate: data.due_at ?? '',
          invoiceId: data.id,
        }),
      });
    }
  }

  return NextResponse.json({ invoice: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_invoices')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
