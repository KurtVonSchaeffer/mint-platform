import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

  const patch: Record<string, unknown> = {};

  if (action === 'send') {
    patch.status    = 'sent';
    patch.issued_at = now;
    // Set due 15 days from now if not already set
    patch.due_at    = new Date(Date.now() + 15 * 86400000).toISOString();
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
    .select('id, reference, status')
    .single();

  if (error) {
    console.error('[invoices] patch failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}
