import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/biztech/quotes/[id]/convert-to-project
 * Closes the pipeline loop: an accepted quote becomes delivery work.
 * Mirrors the existing quotes/[id]/convert (to invoice) route.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('biztech_quotes')
    .select('*, biztech_clients(name)')
    .eq('id', id)
    .single();

  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 404 });

  if (quote.status !== 'accepted') {
    return NextResponse.json({ error: 'Only accepted quotes can be converted to a project' }, { status: 422 });
  }

  const { data: items } = await supabaseAdmin
    .from('biztech_quote_items')
    .select('description')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  const { data: project, error: projectError } = await supabaseAdmin
    .from('biztech_projects')
    .insert({
      client_id:   quote.client_id,
      name:        `${quote.biztech_clients?.name ?? 'Client'} — ${quote.reference}`,
      description: quote.notes ?? null,
      status:      'planning',
      budget_cents: quote.total_cents,
    })
    .select()
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

  // Seed one task per quoted line item so delivery starts from the scope that was sold.
  if (items?.length) {
    await supabaseAdmin
      .from('biztech_project_tasks')
      .insert(items.map((it, i) => ({
        project_id: project.id,
        title:      it.description,
        sort_order: i,
      })));
  }

  return NextResponse.json({ project }, { status: 201 });
}
