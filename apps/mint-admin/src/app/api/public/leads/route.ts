import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { pickNextAgent, notifyAgentNewLead, notifyAdminNewWebsiteLead } from '@/lib/lead-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public endpoint — no auth required.
// Called by the MINT/AlgoLend marketing site when a visitor submits a demo booking or contact form.
// Leads land in the admin /leads queue with status 'new' and source 'marketing-site'.
// Auto-assigned to the TM with the fewest active leads (round-robin).

const ALLOWED_ORIGINS = [
  'https://algolend.co.za',
  'https://www.algolend.co.za',
  'https://mymint.co.za',
  'https://www.mymint.co.za',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(origin) });
  }

  const { name, email, company, phone, message } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: 'name and email are required' },
      { status: 422, headers: corsHeaders(origin) },
    );
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone?.trim() ?? null;

  // Deduplicate — return the existing lead silently if same email or phone already exists
  const dupQuery = supabaseAdmin.from('leads').select('id').eq('email', cleanEmail).limit(1);
  if (cleanPhone) {
    const { data: byPhone } = await supabaseAdmin.from('leads').select('id').eq('phone', cleanPhone).limit(1);
    if (byPhone?.length) {
      return NextResponse.json({ ok: true, id: byPhone[0].id, duplicate: true }, { status: 200, headers: corsHeaders(origin) });
    }
  }
  const { data: byEmail } = await dupQuery;
  if (byEmail?.length) {
    return NextResponse.json({ ok: true, id: byEmail[0].id, duplicate: true }, { status: 200, headers: corsHeaders(origin) });
  }

  // Pick the TM with fewest active leads
  const assignedTo = await pickNextAgent();

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name:        name.trim(),
      email:       cleanEmail,
      company:     company?.trim() ?? '',
      phone:       cleanPhone,
      message:     message?.trim() ?? null,
      source:      'marketing-site',
      status:      'new',
      tm_status:   assignedTo ? 'New Lead' : null,
      assigned_to: assignedTo,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  // Notify the assigned TM — fire-and-forget, don't block the response
  if (assignedTo) {
    notifyAgentNewLead({
      agentId:  assignedTo,
      leadId:   data.id,
      leadName: name.trim(),
      company:  company?.trim() ?? '',
      phone:    cleanPhone,
      email:    cleanEmail,
      message:  message?.trim() ?? null,
    }).catch(() => {/* swallow — email is best-effort */});
  }

  // Also notify admin (Keri-Leigh) — separate from the TM's "assigned to you"
  // email, so admin gets visibility on every website lead regardless of
  // who it lands with.
  notifyAdminNewWebsiteLead({
    agentId:  assignedTo,
    leadId:   data.id,
    leadName: name.trim(),
    company:  company?.trim() ?? '',
    phone:    cleanPhone,
    email:    cleanEmail,
    message:  message?.trim() ?? null,
  }).catch(() => {/* swallow — email is best-effort */});

  return NextResponse.json(
    { ok: true, id: data.id },
    { status: 201, headers: corsHeaders(origin) },
  );
}
