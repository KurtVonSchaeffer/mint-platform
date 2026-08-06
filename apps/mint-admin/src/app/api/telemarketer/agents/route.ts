import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/telemarketer/agents — list telemarketer users, accessible to telemarketer role */
export async function GET() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const agents = users
    .filter(u => (u.user_metadata?.role ?? 'super_admin') === 'telemarketer')
    .map(u => ({
      id:   u.id,
      name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'Unknown',
    }));

  return NextResponse.json({ users: agents });
}
