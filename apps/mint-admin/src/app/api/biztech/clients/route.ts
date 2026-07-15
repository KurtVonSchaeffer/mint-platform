import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('biztech_clients')
    .select('*, biztech_contacts(name, email, is_primary)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clients = (data ?? []).map(({ biztech_contacts, ...client }) => {
    const contacts = (biztech_contacts ?? []) as { name: string; email: string | null; is_primary: boolean }[];
    const primary = contacts.find(c => c.is_primary) ?? contacts[0] ?? null;
    return { ...client, primary_contact: primary ? { name: primary.name, email: primary.email } : null };
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, industry, website, address, notes, status = 'lead', assigned_to } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('biztech_clients')
    .insert({ name, industry, website, address, notes, status, assigned_to: assigned_to || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data }, { status: 201 });
}
