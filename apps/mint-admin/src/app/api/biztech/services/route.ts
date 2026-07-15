import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('biztech_services')
    .select('*')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, unit_price_cents, unit } = body;

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 422 });

  const { data, error } = await supabaseAdmin
    .from('biztech_services')
    .insert({
      name,
      description: description || null,
      unit_price_cents: unit_price_cents ?? 0,
      unit: unit || 'once-off',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
