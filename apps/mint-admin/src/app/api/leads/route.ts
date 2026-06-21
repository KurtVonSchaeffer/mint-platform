import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, company, message, source = 'manual', status = 'new' } = body;

  if (!name || !email || !company) {
    return NextResponse.json({ error: 'name, email, company required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ name, email, company, message, source, status })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data }, { status: 201 });
}
