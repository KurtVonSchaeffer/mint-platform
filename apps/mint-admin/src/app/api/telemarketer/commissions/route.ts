import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

async function requireSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.role === 'super_admin';
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const agentId = req.nextUrl.searchParams.get('agent_id');
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 422 });

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .select('*, leads(name, company, client_stage)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ commissions: data });
}

export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { lead_id, client_name, agent_id, loan_amount, commission_amount, status, payroll_date } = body;

  if (!client_name || !agent_id || !commission_amount) {
    return NextResponse.json({ error: 'client_name, agent_id, commission_amount required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .insert({ lead_id: lead_id ?? null, client_name, agent_id, loan_amount: loan_amount ?? null, commission_amount, status: status ?? 'Pending Collection', payroll_date: payroll_date ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ commission: data }, { status: 201 });
}
