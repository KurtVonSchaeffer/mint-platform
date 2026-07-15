import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * POST /api/biztech-quote/[id]/respond
 * Public endpoint — the client accepts/declines their own quote from the emailed link.
 * No auth beyond knowing the (unguessable) quote UUID, same pattern as /pay/[id].
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: quote, error: fetchError } = await supabase
    .from('biztech_quotes')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (quote.status !== 'sent') {
    return NextResponse.json({ error: `This quote can no longer be responded to (status: ${quote.status}).` }, { status: 422 });
  }

  const now = new Date().toISOString();
  const patch = action === 'accept'
    ? { status: 'accepted', accepted_at: now }
    : { status: 'declined', declined_at: now };

  const { error: updateError } = await supabase
    .from('biztech_quotes')
    .update(patch)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: patch.status });
}
