import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/quotes/[id] — update a sales quote */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: Record<string, unknown> = {};
  if ('client'         in body) patch.client_name     = body.client;
  if ('contact'        in body) patch.contact_name    = body.contact;
  if ('email'          in body) patch.contact_email   = body.email;
  if ('setupFee'       in body) patch.setup_fee       = body.setupFee;
  if ('monthlyFee'     in body) patch.monthly_fee     = body.monthlyFee;
  if ('selectedChecks' in body) patch.selected_checks = body.selectedChecks;
  if ('volumeTier'     in body) patch.volume_tier     = body.volumeTier;
  if ('branches'       in body) patch.branches        = body.branches;
  if ('customItems'    in body) patch.custom_items    = body.customItems;
  if ('status'         in body) patch.status          = body.status;
  if ('sentDate'       in body) patch.sent_at         = body.sentDate ? new Date(body.sentDate as string).toISOString() : null;
  if ('validUntil'     in body) patch.valid_until     = body.validUntil;
  if ('viewedAt'       in body) patch.viewed_at       = body.viewedAt ? new Date(body.viewedAt as string).toISOString() : null;
  if ('acceptedAt'     in body) patch.accepted_at     = body.acceptedAt ? new Date(body.acceptedAt as string).toISOString() : null;

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data });
}

/** DELETE /api/quotes/[id] — delete a sales quote */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from('sales_quotes')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
