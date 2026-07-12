import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const body = await req.json();
  const { status, title, due_date } = body;

  const patch: Record<string, unknown> = {};
  if (status !== undefined) patch.status = status;
  if (title !== undefined) patch.title = title;
  if (due_date !== undefined) patch.due_date = due_date;

  const { data, error } = await supabaseAdmin
    .from('biztech_project_tasks')
    .update(patch)
    .eq('id', taskId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const { error } = await supabaseAdmin
    .from('biztech_project_tasks')
    .delete()
    .eq('id', taskId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
