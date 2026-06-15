import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushLeadToAttio } from '@/lib/attio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const REQUIRED = ['name', 'email', 'company'] as const;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const errors: string[] = [];
  for (const key of REQUIRED) {
    const v = body[key];
    if (typeof v !== 'string' || v.trim().length < 1) errors.push(key);
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Missing required fields', fields: errors }, { status: 400 });
  }

  const email = String(body.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const name    = String(body.name).trim();
  const company = String(body.company).trim();
  const message = typeof body.message === 'string' ? body.message.trim() : null;

  const supabase = getSupabase();
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({ name, email, company, message, source: 'marketing-site', status: 'new' })
    .select()
    .single();

  if (error) {
    console.error('[leads] insert failed', error.message);
    return NextResponse.json({ error: 'Failed to record lead' }, { status: 500 });
  }

  console.log('[leads] new', { id: lead.id, email, company });

  // Fire-and-forget to Attio CRM — never blocks the response
  void pushLeadToAttio({ name, email, company, message: message ?? '' });

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
