import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, demoBookingEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

const VALID_TM_STATUSES = [
  // Legacy (kept for backward compat)
  'Pending', 'Call Again', 'Call Back', 'Unreachable', 'Demo Booked', 'Quoted', 'Converted',
  // Current pipeline stages
  'New Lead', 'Attempted Contact', 'Contacted', 'Interested',
  'Demo Scheduled', 'Demo Completed', 'Proposal Requested', 'Proposal Sent',
  'Negotiation', 'Won', 'Lost', 'Other', 'Not Qualified',
];

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  return NextResponse.json({ lead: data });
}

// Qualification + deal fields that can be patched freely
const QUAL_FIELDS = [
  'trading_name', 'contact_person', 'position', 'website',
  'industry', 'province', 'existing_platform',
  'num_branches', 'num_employees', 'monthly_applications', 'monthly_volume', 'pain_points',
  'interest_marketplace', 'interest_white_label', 'interest_debicheck',
  'interest_credit_life', 'interest_collections', 'interest_compliance', 'interest_open_banking',
  'potential_setup_fee', 'potential_monthly_sub', 'estimated_deal_value',
  'estimated_annual_revenue', 'expected_close_date', 'deal_probability',
] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown> & {
    status?: string;
    tm_status?: string;
    assigned_to?: string | null;
    client_stage?: string | null;
    next_follow_up?: string | null;
    commission_amount?: number;
    name?: string;
    email?: string | null;
    phone?: string | null;
    company?: string;
    message?: string | null;
  };

  const update: Record<string, unknown> = {};

  if (body.name?.trim())    update.name    = body.name.trim();
  if ('email'   in body)    update.email   = body.email?.trim()   ? body.email.toLowerCase().trim() : null;
  if ('phone'   in body)    update.phone   = body.phone?.trim()   ?? null;
  if (body.company?.trim()) update.company = body.company.trim();
  if ('message' in body)    update.message = body.message?.trim() ?? null;

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
    }
    update.status = body.status;
  }

  if (body.tm_status !== undefined) {
    if (body.tm_status !== null && !VALID_TM_STATUSES.includes(body.tm_status as string)) {
      return NextResponse.json({ error: `tm_status must be one of: ${VALID_TM_STATUSES.join(', ')}` }, { status: 422 });
    }
    update.tm_status = body.tm_status;
  }

  if ('assigned_to'   in body) update.assigned_to   = body.assigned_to   ?? null;
  if ('client_stage'  in body) update.client_stage  = body.client_stage  ?? null;
  if ('next_follow_up' in body) update.next_follow_up = body.next_follow_up ?? null;

  // Qualification + deal fields
  for (const field of QUAL_FIELDS) {
    if (field in body) update[field] = body[field] ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create a commission record when a lead is marked Won (or legacy Converted)
  if ((update.tm_status === 'Won' || update.tm_status === 'Converted') && data.assigned_to) {
    const { data: existing } = await supabaseAdmin
      .from('commissions')
      .select('id')
      .eq('lead_id', id)
      .maybeSingle();

    if (!existing) {
      const commissionAmount = typeof body.commission_amount === 'number' && body.commission_amount > 0
        ? body.commission_amount
        : 0;
      await supabaseAdmin.from('commissions').insert({
        lead_id:           id,
        agent_id:          data.assigned_to,
        client_name:       data.name ?? data.company ?? 'Unknown',
        commission_amount: commissionAmount,
        loan_amount:       null,
        status:            'Pending Collection',
      });
    }
  }

  // Email admin when a demo is booked
  if (update.tm_status === 'Demo Booked') {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && data.assigned_to) {
      const agentRes = await supabaseAdmin.auth.admin.getUserById(data.assigned_to);
      const agentName = (agentRes.data.user?.user_metadata?.full_name as string | undefined)
        ?? agentRes.data.user?.email?.split('@')[0]
        ?? 'A telemarketer';
      sendEmail({
        to:      adminEmail,
        subject: `Demo booked — ${data.company ?? data.name}`,
        html:    demoBookingEmail({
          leadName:    data.name ?? '',
          leadCompany: data.company ?? '',
          leadEmail:   data.email ?? '',
          agentName,
        }),
      }).catch(() => {/* non-blocking */});
    }
  }

  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
