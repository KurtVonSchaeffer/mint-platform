import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const month = req.nextUrl.searchParams.get('month'); // YYYY-MM

  let query = supabaseAdmin
    .from('commissions')
    .select('*, leads(name, company, client_stage)')
    .order('created_at', { ascending: false });

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1).toISOString();
    const to   = new Date(year, mon,     1).toISOString();
    query = query.gte('created_at', from).lt('created_at', to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve agent names from Supabase Auth
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const agentMap = Object.fromEntries(
    (users ?? []).map(u => [u.id, {
      name:  (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? u.id,
      email: u.email ?? '',
    }])
  );

  const commissions = (data ?? []).map(c => ({
    ...c,
    agentName:  agentMap[c.agent_id]?.name  ?? c.agent_id,
    agentEmail: agentMap[c.agent_id]?.email ?? '',
  }));

  return NextResponse.json({ commissions });
}
