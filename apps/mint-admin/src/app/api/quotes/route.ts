import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function nextRef(existing: string[]): string {
  const year = new Date().getFullYear();
  const max  = existing
    .map(r => parseInt(r.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `Q-${year}-${String(max + 1).padStart(3, '0')}`;
}

/** GET /api/quotes — list all sales quotes */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

/** POST /api/quotes — create a new sales quote */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Get existing references to compute next sequential number
  const { data: existing } = await supabaseAdmin
    .from('sales_quotes')
    .select('reference');

  const reference = nextRef((existing ?? []).map(r => r.reference));

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .insert({
      reference,
      client_name:     body.client     ?? 'New Prospect (Pty) Ltd',
      contact_name:    body.contact    ?? '',
      contact_email:   body.email      ?? '',
      setup_fee:       body.setupFee   ?? 0,
      monthly_fee:     body.monthlyFee ?? 0,
      selected_checks: body.selectedChecks ?? [],
      volume_tier:     String(body.quota ?? 50),
      branches:        body.branches   ?? 1,
      custom_items:    body.customItems ?? [],
      status:          body.status     ?? 'draft',
      sent_at:         body.sentDate   ? new Date(body.sentDate as string).toISOString() : null,
      valid_until:     body.validUntil ?? null,
      viewed_at:       body.viewedAt   ? new Date(body.viewedAt as string).toISOString() : null,
      accepted_at:     body.acceptedAt ? new Date(body.acceptedAt as string).toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data }, { status: 201 });
}
