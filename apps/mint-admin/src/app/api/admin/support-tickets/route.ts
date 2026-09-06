import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — list tickets, newest first. ?status=open filters (omit or 'all' for everything).
// ?client_id=<uuid> narrows to one client (omit or 'all' for every client).
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status   = req.nextUrl.searchParams.get('status');
  const clientId = req.nextUrl.searchParams.get('client_id');

  let query = supabaseAdmin
    .from('client_support_tickets')
    .select('*, clients(id, name)')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (clientId && clientId !== 'all') query = query.eq('client_id', clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tickets: data });
}
