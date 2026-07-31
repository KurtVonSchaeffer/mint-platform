import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAgentId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const agentId = await getAgentId();
  if (!agentId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  const [overdueRes, todayRes, newLeadsRes, quoteNotifsRes] = await Promise.all([
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
    supabaseAdmin
      .from('tm_notifications')
      .select('id, type, title, message, created_at')
      .eq('agent_id', agentId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const overdue      = overdueRes.count  ?? 0;
  const dueToday     = todayRes.count    ?? 0;
  const newLeads     = newLeadsRes.count ?? 0;
  const quoteUpdates = quoteNotifsRes.data ?? [];
  const total        = overdue + dueToday + newLeads + quoteUpdates.length;

  return NextResponse.json({ total, overdue, dueToday, newLeads, quoteUpdates });
}

/** PATCH — mark all unread tm_notifications as read for this agent */
export async function PATCH() {
  const agentId = await getAgentId();
  if (!agentId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  await supabaseAdmin
    .from('tm_notifications')
    .update({ read: true })
    .eq('agent_id', agentId)
    .eq('read', false);

  return NextResponse.json({ ok: true });
}
