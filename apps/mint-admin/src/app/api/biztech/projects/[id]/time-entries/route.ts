import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('biztech_time_entries')
    .select('*, biztech_project_tasks(title)')
    .eq('project_id', id)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { task_id, description, minutes, billable, occurred_on } = body;

  if (!minutes || minutes <= 0) {
    return NextResponse.json({ error: 'minutes must be greater than 0' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('biztech_time_entries')
    .insert({
      project_id: id,
      task_id: task_id || null,
      description: description || null,
      minutes,
      billable: billable ?? true,
      occurred_on: occurred_on || new Date().toISOString().slice(0, 10),
    })
    .select('*, biztech_project_tasks(title)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}
