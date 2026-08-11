import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { pickNextAgent, notifyAgentNewLead } from '@/lib/lead-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mine       = searchParams.get('mine') === 'true';
  const assignedTo = searchParams.get('assigned_to');
  const tmStatus   = searchParams.get('tm_status');

  // Resolve caller identity for the 'mine' filter
  let ownerId: string | null = null;
  if (mine) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    ownerId = user.id;
  }

  // Paginate to bypass PostgREST's 1000-row server cap
  const PAGE = 1000;
  let page = 0;
  const all: Record<string, unknown>[] = [];
  while (true) {
    let q = supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    if (ownerId)    q = q.eq('assigned_to', ownerId);
    else if (assignedTo) q = q.eq('assigned_to', assignedTo);
    if (tmStatus)   q = q.eq('tm_status', tmStatus);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    page++;
  }

  return NextResponse.json({ leads: all });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, company, message, source = 'manual', status = 'new' } = body;
  const email = (body.email as string | undefined) || null;
  const phone = (body.phone as string | undefined) || null;
  let { assigned_to } = body;

  if (!name || !company) {
    return NextResponse.json({ error: 'name and company are required' }, { status: 422 });
  }

  // Auto-assign if no TM specified
  if (!assigned_to) assigned_to = await pickNextAgent();

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name, email, company, message: message || null, source, status, phone,
      assigned_to:  assigned_to ?? null,
      tm_status:    assigned_to ? 'New Lead' : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (assigned_to) {
    notifyAgentNewLead({
      agentId:  assigned_to,
      leadId:   data.id,
      leadName: name,
      company,
      phone:    phone ?? null,
      email,
      message:  message ?? null,
    }).catch(() => {});
  }

  return NextResponse.json({ lead: data }, { status: 201 });
}
