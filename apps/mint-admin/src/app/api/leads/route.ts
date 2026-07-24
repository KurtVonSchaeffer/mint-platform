import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mine      = searchParams.get('mine') === 'true';
  const assignedTo = searchParams.get('assigned_to');
  const tmStatus  = searchParams.get('tm_status');

  let query = supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (mine) {
    // Derive the caller's own user ID from their session cookie
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    query = query.eq('assigned_to', user.id);
  } else if (assignedTo) {
    query = query.eq('assigned_to', assignedTo);
  }

  if (tmStatus) query = query.eq('tm_status', tmStatus);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, company, message, source = 'manual', status = 'new', assigned_to, phone } = body;

  if (!name || !email || !company) {
    return NextResponse.json({ error: 'name, email, company required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ name, email, company, message, source, status, assigned_to: assigned_to ?? null, phone: phone ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data }, { status: 201 });
}
