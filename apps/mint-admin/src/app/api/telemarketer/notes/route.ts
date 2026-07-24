import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id');
  if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 422 });

  const { data, error } = await supabaseAdmin
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lead_id, agent_id, content } = body;

  if (!lead_id || !agent_id || !content) {
    return NextResponse.json({ error: 'lead_id, agent_id, content required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('lead_notes')
    .insert({ lead_id, agent_id, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
