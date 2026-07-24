import { NextResponse } from 'next/server';
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

export async function GET() {
  if (!await isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [usersRes, leadsRes, commissionsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),

    supabaseAdmin
      .from('leads')
      .select('assigned_to, tm_status')
      .not('assigned_to', 'is', null),

    supabaseAdmin
      .from('commissions')
      .select('agent_id, commission_amount, status'),
  ]);

  const telemarketers = (usersRes.data?.users ?? [])
    .filter(u => (u.user_metadata?.role as string | undefined) === 'telemarketer');

  const leads = leadsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  // Group leads by agent
  type LeadBucket = { total: number; converted: number; pending: number };
  const leadsByAgent = leads.reduce<Record<string, LeadBucket>>((acc, l) => {
    const id = l.assigned_to as string;
    if (!acc[id]) acc[id] = { total: 0, converted: 0, pending: 0 };
    acc[id].total++;
    if (l.tm_status === 'Converted' || l.tm_status === 'Won') acc[id].converted++;
    if (l.tm_status === 'Pending Collection') acc[id].pending++;
    return acc;
  }, {});

  // Group commissions by agent
  type CommBucket = { pending: number; ready: number; paid: number };
  const commByAgent = commissions.reduce<Record<string, CommBucket>>((acc, c) => {
    const id = c.agent_id as string;
    if (!acc[id]) acc[id] = { pending: 0, ready: 0, paid: 0 };
    if (c.status === 'Pending Collection' || c.status === 'Pending Payroll') {
      acc[id].pending += c.commission_amount ?? 0;
    } else if (c.status === 'Payroll Ready') {
      acc[id].ready += c.commission_amount ?? 0;
    } else if (c.status === 'Paid') {
      acc[id].paid += c.commission_amount ?? 0;
    }
    return acc;
  }, {});

  const COLORS = ['#A78BFA', '#34D399', '#60A5FA', '#FB923C', '#F472B6', '#FBBF24'];

  const agents = telemarketers.map((u, i) => {
    const name = (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Unknown';
    const lb = leadsByAgent[u.id] ?? { total: 0, converted: 0, pending: 0 };
    const cb = commByAgent[u.id]  ?? { pending: 0, ready: 0, paid: 0 };
    return {
      id:       u.id,
      name,
      email:    u.email ?? '',
      initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color:    COLORS[i % COLORS.length],
      leadsTotal:          lb.total,
      leadsConverted:      lb.converted,
      commissionPending:   cb.pending,
      commissionReady:     cb.ready,
      commissionPaid:      cb.paid,
    };
  });

  return NextResponse.json({ agents });
}
