import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('biztech_recurring_invoices')
    .select('*, biztech_clients(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurring: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, description, items, day_of_month } = body;

  if (!client_id || !description || !items?.length || !day_of_month) {
    return NextResponse.json({ error: 'client_id, description, items, and day_of_month are required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('biztech_recurring_invoices')
    .insert({ client_id, description, items, day_of_month })
    .select('*, biztech_clients(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurring: data }, { status: 201 });
}
