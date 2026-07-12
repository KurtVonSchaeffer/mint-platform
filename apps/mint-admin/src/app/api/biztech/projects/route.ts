import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('biztech_projects')
    .select('*, biztech_clients(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, name, description, start_date, due_date, budget_cents } = body;

  if (!client_id || !name) {
    return NextResponse.json({ error: 'client_id and name required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('biztech_projects')
    .insert({ client_id, name, description, start_date, due_date, budget_cents })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
