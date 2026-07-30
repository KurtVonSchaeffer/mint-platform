import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const agentId = user.id;
  const today = new Date().toISOString().split('T')[0];

  const [overdueRes, todayRes, newLeadsRes] = await Promise.all([
    supabaseAdmin
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('completed', false)
      .lt('due_date', today),
    supabaseAdmin
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('completed', false)
      .eq('due_date', today),
    supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', agentId)
      .eq('tm_status', 'New Lead'),
  ]);

  const overdue = overdueRes.count ?? 0;
  const dueToday = todayRes.count ?? 0;
  const newLeads = newLeadsRes.count ?? 0;
  const total = overdue + dueToday + newLeads;

  return NextResponse.json({ total, overdue, dueToday, newLeads });
}
