import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyAdminNewSupportTicket } from '@/lib/support-notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public endpoint — called by a CLIENT's own deployed app (e.g. ZwaneOfficial),
// not by an mint-admin-authenticated user. Each client runs its own separate
// instance + database, so there's no shared session to carry here — instead
// the caller authenticates with the same lender_api_key already issued to
// them (clients.lender_api_key), sent as a Bearer token.
//
// Tickets land centrally in mint-admin's own DB (client_support_tickets) so
// the AlgoLend/MINT support team has one queue across every client, rather
// than needing to poll into each client's isolated database.

const CATEGORIES = ['technical', 'billing', 'compliance', 'feature_request', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization: Bearer <lender_api_key>' }, { status: 401, headers: corsHeaders() });
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('lender_api_key', apiKey)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders() });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders() });
  }

  const subject = body.subject?.trim();
  const message = body.message?.trim();
  if (!subject || !message) {
    return NextResponse.json({ error: 'subject and message are required' }, { status: 422, headers: corsHeaders() });
  }

  const category = CATEGORIES.includes(body.category) ? body.category : 'other';
  const priority = PRIORITIES.includes(body.priority) ? body.priority : 'normal';
  const submittedByName  = body.submitted_by_name?.trim()  || null;
  const submittedByEmail = body.submitted_by_email?.trim() || null;

  const { data: ticket, error } = await supabaseAdmin
    .from('client_support_tickets')
    .insert({
      client_id:          client.id,
      subject,
      message,
      category,
      priority,
      submitted_by_name:  submittedByName,
      submitted_by_email: submittedByEmail,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500, headers: corsHeaders() });
  }

  notifyAdminNewSupportTicket({
    clientName:       client.name,
    ticketId:         ticket.id,
    subject,
    message,
    category,
    priority,
    submittedByName,
    submittedByEmail,
  }).catch(() => {/* swallow — email is best-effort */});

  return NextResponse.json({ ok: true, id: ticket.id }, { status: 201, headers: corsHeaders() });
}
