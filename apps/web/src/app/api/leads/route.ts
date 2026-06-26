import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTIFY_EMAIL = process.env.LEADS_NOTIFY_EMAIL ?? 'kurt.vonschaeffer@mymint.co.za';

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

  // Check for existing lead with same email — update rather than duplicate
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let lead: { id: string };
  if (existing) {
    const { data, error } = await supabase
      .from('leads')
      .update({ name, company, message })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) {
      console.error('[leads] update failed', error.message);
      return NextResponse.json({ error: 'Failed to record lead' }, { status: 500 });
    }
    lead = data;
  } else {
    const { data, error } = await supabase
      .from('leads')
      .insert({ name, email, company, message, source: 'marketing-site', status: 'new' })
      .select('id')
      .single();
    if (error) {
      console.error('[leads] insert failed', error.message);
      return NextResponse.json({ error: 'Failed to record lead' }, { status: 500 });
    }
    lead = data;
  }

  console.log('[leads] new/updated', { id: lead.id, email, company });

  // Notify the team — fire and forget
  sendEmail(
    NOTIFY_EMAIL,
    `New enquiry from ${company}`,
    `<p><strong>${name}</strong> (${email}) from <strong>${company}</strong> submitted an enquiry via the website.</p>${message ? `<blockquote style="border-left:3px solid #ccc;padding:0 1em;color:#555">${message}</blockquote>` : ''}<p><a href="https://admin.algolend.co.za/leads">View in admin →</a></p>`,
  ).catch(err => console.error('[leads] notify email failed:', err));

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
