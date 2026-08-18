import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Same roles as /api/admin/team — managers/admins viewing team performance
// need commission figures alongside call activity.
async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  return ['super_admin', 'admin', 'finance', 'manager'].includes(role);
}

export async function GET(req: NextRequest) {
  if (!await isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agent_id');
  const from    = searchParams.get('from'); // YYYY-MM-DD, inclusive
  const to      = searchParams.get('to');   // YYYY-MM-DD, inclusive

  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 422 });

  let query = supabaseAdmin
    .from('commissions')
    .select('id, agent_id, client_name, commission_amount, status, created_at, leads(name, company)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (from) query = query.gte('created_at', `${from}T00:00:00`);
  if (to)   query = query.lte('created_at', `${to}T23:59:59.999`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ commissions: data });
}
