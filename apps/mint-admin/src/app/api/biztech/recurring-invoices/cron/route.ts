import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface LineItem { description: string; quantity: number; unit_price_cents: number; }

/**
 * GET /api/biztech/recurring-invoices/cron
 *
 * Called by Vercel Cron daily. For every active recurring template whose
 * day_of_month matches today, and that hasn't already generated an
 * invoice this month, create a real draft biztech_invoices row from its
 * item template (due in 30 days) and stamp last_generated_at.
 *
 * Protected by CRON_SECRET, same pattern as reminders-cron.
 */

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function computeTotals(items: LineItem[]) {
  const subtotal_cents = items.reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0);
  const vat_cents = Math.round(subtotal_cents * 0.15);
  const total_cents = subtotal_cents + vat_cents;
  return { subtotal_cents, vat_cents, total_cents };
}

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from('biztech_invoices')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);
  return `BI-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const now = new Date();
  const today = now.getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: due, error: fetchError } = await supabaseAdmin
    .from('biztech_recurring_invoices')
    .select('*')
    .eq('active', true)
    .eq('day_of_month', today)
    .or(`last_generated_at.is.null,last_generated_at.lt.${monthStart}`);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  let generated = 0;
  const errors: string[] = [];

  for (const template of due ?? []) {
    const items = (template.items ?? []) as LineItem[];
    if (!items.length) continue;

    const totals = computeTotals(items);
    const reference = await nextReference();
    const dueAt = new Date(now.getTime() + 30 * 86_400_000).toISOString();

    const { data: invoice, error: invError } = await supabaseAdmin
      .from('biztech_invoices')
      .insert({
        reference,
        client_id: template.client_id,
        due_at: dueAt,
        notes: template.description,
        ...totals,
      })
      .select()
      .single();

    if (invError || !invoice) { errors.push(`${template.id}: ${invError?.message}`); continue; }

    await supabaseAdmin
      .from('biztech_invoice_items')
      .insert(items.map((i, idx) => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
        total_cents: i.quantity * i.unit_price_cents,
        sort_order: idx,
      })));

    await supabaseAdmin
      .from('biztech_recurring_invoices')
      .update({ last_generated_at: now.toISOString() })
      .eq('id', template.id);

    generated++;
  }

  return NextResponse.json({ generated, candidates: due?.length ?? 0, errors });
}
