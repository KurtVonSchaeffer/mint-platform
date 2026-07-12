import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [
    { data: clients, error: clientsError },
    { data: quotes, error: quotesError },
    { data: invoices, error: invoicesError },
    { data: projects, error: projectsError },
  ] = await Promise.all([
    supabaseAdmin.from('biztech_clients').select('status'),
    supabaseAdmin.from('biztech_quotes').select('status, total_cents'),
    supabaseAdmin.from('biztech_invoices').select('status, total_cents, due_at'),
    supabaseAdmin.from('biztech_projects').select('status'),
  ]);

  const err = clientsError ?? quotesError ?? invoicesError ?? projectsError;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const countBy = <T extends string>(rows: { status: T }[]) =>
    rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  const revenueCents = (invoices ?? [])
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_cents, 0);

  const outstandingCents = (invoices ?? [])
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total_cents, 0);

  const quotesPipelineCents = (quotes ?? [])
    .filter(q => q.status === 'sent')
    .reduce((sum, q) => sum + q.total_cents, 0);

  return NextResponse.json({
    clients: { total: clients?.length ?? 0, byStatus: countBy(clients ?? []) },
    quotes: { total: quotes?.length ?? 0, byStatus: countBy(quotes ?? []), pipelineCents: quotesPipelineCents },
    invoices: { total: invoices?.length ?? 0, byStatus: countBy(invoices ?? []), revenueCents, outstandingCents },
    projects: { total: projects?.length ?? 0, byStatus: countBy(projects ?? []) },
  });
}
