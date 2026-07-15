import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { BiztechQuotePage } from './BiztechQuotePage';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

export default async function BiztechQuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: quote } = await supabase
    .from('biztech_quotes')
    .select('id, reference, status, subtotal_cents, vat_cents, total_cents, valid_until, notes, biztech_clients(name)')
    .eq('id', id)
    .single();

  if (!quote) notFound();

  const { data: items } = await supabase
    .from('biztech_quote_items')
    .select('description, quantity, unit_price_cents, total_cents')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  const client = Array.isArray(quote.biztech_clients) ? quote.biztech_clients[0] : quote.biztech_clients;
  const clientName = (client as { name?: string } | null)?.name ?? 'Client';

  return (
    <Suspense>
      <BiztechQuotePage
        quoteId={quote.id}
        reference={quote.reference}
        clientName={clientName}
        status={quote.status}
        subtotalCents={quote.subtotal_cents}
        vatCents={quote.vat_cents}
        totalCents={quote.total_cents}
        validUntil={fmtDate(quote.valid_until)}
        notes={quote.notes}
        items={items ?? []}
      />
    </Suspense>
  );
}
