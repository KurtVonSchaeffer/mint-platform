import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { title, due_date } = body;

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 422 });

  const { count } = await supabaseAdmin
    .from('biztech_project_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id);

  const { data, error } = await supabaseAdmin
    .from('biztech_project_tasks')
    .insert({ project_id: id, title, due_date, sort_order: count ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data }, { status: 201 });
}
