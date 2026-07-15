import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { buildBiztechInvoiceForm, PAYFAST_PROCESS_URL } from '@/lib/payfast';
import { BiztechInvoicePage } from './BiztechInvoicePage';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

export default async function BiztechInvoicePaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: inv } = await supabase
    .from('biztech_invoices')
    .select('id, reference, total_cents, due_at, status, biztech_clients(name)')
    .eq('id', id)
    .single();

  if (!inv) notFound();

  const { data: items } = await supabase
    .from('biztech_invoice_items')
    .select('description, quantity, unit_price_cents, total_cents')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true });

  const { data: contact } = await supabase
    .from('biztech_contacts')
    .select('email')
    .eq('client_id', (inv as unknown as { client_id?: string }).client_id ?? '')
    .not('email', 'is', null)
    .limit(1)
    .maybeSingle();

  if (inv.status === 'paid' || inv.status === 'void') {
    return (
      <div style={{ fontFamily: 'system-ui,sans-serif', background: '#07070f', color: '#e4e4e7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>
            {inv.status === 'paid' ? '✓ Invoice already paid' : 'Invoice voided'}
          </p>
          <p style={{ color: '#71717a', fontSize: 13 }}>{inv.reference}</p>
        </div>
      </div>
    );
  }

  const client = Array.isArray(inv.biztech_clients) ? inv.biztech_clients[0] : inv.biztech_clients;
  const clientName = (client as { name?: string } | null)?.name ?? 'Client';

  const payfastEnabled = !!process.env.PAYFAST_MERCHANT_ID && !!process.env.PAYFAST_MERCHANT_KEY;

  const payfastFields = payfastEnabled
    ? buildBiztechInvoiceForm({
        invoiceId:    inv.id,
        reference:    inv.reference,
        clientName,
        contactEmail: contact?.email ?? '',
        amountCents:  inv.total_cents,
      })
    : null;

  return (
    <Suspense>
      <BiztechInvoicePage
        invoiceId={inv.id}
        reference={inv.reference}
        clientName={clientName}
        amountStr={fmt(inv.total_cents)}
        dueDate={fmtDate(inv.due_at)}
        items={items ?? []}
        payfastUrl={PAYFAST_PROCESS_URL}
        payfastFields={payfastFields}
        bankName={process.env.BANK_NAME       ?? 'First National Bank'}
        bankAccount={process.env.BANK_ACCOUNT ?? ''}
        branchCode={process.env.BANK_BRANCH   ?? '250655'}
        accountType={process.env.BANK_TYPE    ?? 'Current / Cheque'}
        payRef={inv.reference}
      />
    </Suspense>
  );
}
