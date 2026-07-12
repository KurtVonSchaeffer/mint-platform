import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: project, error } = await supabaseAdmin
    .from('biztech_projects')
    .select('*, biztech_clients(id, name)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('biztech_project_tasks')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true });

  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });

  return NextResponse.json({ project, tasks });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, status, start_date, due_date, budget_cents } = body;

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (status !== undefined) patch.status = status;
  if (start_date !== undefined) patch.start_date = start_date;
  if (due_date !== undefined) patch.due_date = due_date;
  if (budget_cents !== undefined) patch.budget_cents = budget_cents;

  const { data, error } = await supabaseAdmin
    .from('biztech_projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_projects')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
