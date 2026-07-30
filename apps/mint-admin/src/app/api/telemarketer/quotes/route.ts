import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function nextRef(existing: string[]): string {
  const year = new Date().getFullYear();
  const max  = existing
    .map(r => parseInt(r.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `Q-${year}-${String(max + 1).padStart(3, '0')}`;
}

/** GET /api/telemarketer/quotes — list this TM's submitted quotes */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

/** POST /api/telemarketer/quotes — submit a quote for Keri-Leigh's approval */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { data: existing } = await supabaseAdmin
    .from('sales_quotes')
    .select('reference');

  const reference   = nextRef((existing ?? []).map(r => r.reference));
  const submittedBy = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Unknown';

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .insert({
      reference,
      client_name:     body.client         ?? '',
      contact_name:    body.contact        ?? '',
      contact_email:   body.email          ?? '',
      setup_fee:       body.setupFee       ?? 100000,
      monthly_fee:     body.monthlyFee     ?? 0,
      selected_checks: body.selectedChecks ?? [],
      volume_tier:     String(body.quota   ?? 0),
      branches:        body.branches       ?? 1,
      custom_items:    [],
      status:          'pending_approval',
      agent_id:        user.id,
      submitted_by:    submittedBy,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data }, { status: 201 });
}
