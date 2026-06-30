import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { buildInvoiceForm, PAYFAST_PROCESS_URL } from '@/lib/payfast';
import { PayPage } from './PayPage';

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

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, reference, total_cents, due_at, status, clients(name, contact_email)')
    .eq('id', id)
    .single();

  if (!inv) notFound();
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

  const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
  const clientName   = client?.name          ?? 'Client';
  const contactEmail = client?.contact_email ?? '';

  const payfastFields = buildInvoiceForm({
    invoiceId:    inv.id,
    reference:    inv.reference,
    clientName,
    contactEmail,
    amountCents:  inv.total_cents,
  });

  return (
    <Suspense>
      <PayPage
        invoiceId={inv.id}
        reference={inv.reference}
        clientName={clientName}
        amountStr={fmt(inv.total_cents)}
        dueDate={fmtDate(inv.due_at)}
        payfastUrl={PAYFAST_PROCESS_URL}
        payfastFields={payfastFields}
        bankName={process.env.BANK_NAME        ?? 'First National Bank'}
        bankAccount={process.env.BANK_ACCOUNT  ?? ''}
        branchCode={process.env.BANK_BRANCH    ?? '250655'}
        accountType={process.env.BANK_TYPE     ?? 'Current / Cheque'}
        payRef={inv.reference}
      />
    </Suspense>
  );
}
