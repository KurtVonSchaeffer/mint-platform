import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — ticket detail + its reply thread
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: ticket, error } = await supabaseAdmin
    .from('client_support_tickets')
    .select('*, clients(id, name, contact_email, contact_name)')
    .eq('id', id)
    .single();

  if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const { data: replies } = await supabaseAdmin
    .from('client_support_ticket_replies')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ticket, replies: replies ?? [] });
}

// PATCH — update status / priority / assignment
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as { status?: string; priority?: string; assigned_to?: string | null };
  const update: Record<string, string | null> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 422 });
    update.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 422 });
    update.priority = body.priority;
  }
  if (body.assigned_to !== undefined) {
    update.assigned_to = body.assigned_to;
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('client_support_tickets')
    .update(update)
    .eq('id', id)
    .select('*, clients(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket });
}
