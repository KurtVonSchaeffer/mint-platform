import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, managerApprovalRequestEmail, proposalApprovalResultEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PORTAL_URL            = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.mintplatforms.co.za';
const APPROVAL_THRESHOLD    = 5_000_000; // R50,000 in cents
const MANAGER_ROLES         = ['super_admin', 'admin', 'manager'];

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

function isManager(role: string) { return MANAGER_ROLES.includes(role); }

// GET — list pending approvals (managers only)
export async function GET() {
  const user = await getSessionUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  if (!user || !isManager(role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .select('*, leads(name, company)')
    .eq('approval_status', 'Pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with agent names
  const enriched = await Promise.all((data ?? []).map(async (p) => {
    const { data: { user: agent } } = await supabaseAdmin.auth.admin.getUserById(p.agent_id);
    return {
      ...p,
      agentName:  (agent?.user_metadata?.full_name as string | undefined) ?? agent?.email ?? 'Unknown',
      agentEmail: agent?.email ?? '',
    };
  }));

  return NextResponse.json({ approvals: enriched });
}

// PATCH — approve or reject a proposal
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  if (!user || !isManager(role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { id: string; action: 'approve' | 'reject'; note?: string };
  if (!body.id || !['approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'id and action (approve|reject) required' }, { status: 422 });
  }

  const approved      = body.action === 'approve';
  const approvalStatus = approved ? 'Approved' : 'Rejected';

  const { data: proposal, error } = await supabaseAdmin
    .from('proposals')
    .update({ approval_status: approvalStatus, approval_note: body.note ?? null })
    .eq('id', body.id)
    .select('*, leads(name, company)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the agent
  const { data: { user: agent } } = await supabaseAdmin.auth.admin.getUserById(proposal.agent_id);
  if (agent?.email) {
    const agentName = (agent.user_metadata?.full_name as string | undefined) ?? agent.email.split('@')[0];
    await sendEmail({
      to:      agent.email,
      subject: `Proposal ${approved ? 'approved' : 'not approved'} — ${(proposal.leads as { name: string; company: string } | null)?.company ?? ''}`,
      html:    proposalApprovalResultEmail({
        agentName,
        leadName:      (proposal.leads as { name: string } | null)?.name    ?? '',
        company:       (proposal.leads as { company: string } | null)?.company ?? '',
        amountCents:   proposal.amount_cents ?? 0,
        approved,
        rejectionNote: body.note,
      }),
    });
  }

  return NextResponse.json({ proposal, approved });
}

// Called by proposals POST to trigger approval flow for high-value deals
export async function triggerApprovalFlow(opts: {
  proposalId:  string;
  agentId:     string;
  leadId:      string;
  amountCents: number;
}) {
  if (opts.amountCents < APPROVAL_THRESHOLD) return;

  // Fetch lead details
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('name, company')
    .eq('id', opts.leadId)
    .single();

  // Fetch agent name
  const { data: { user: agent } } = await supabaseAdmin.auth.admin.getUserById(opts.agentId);
  const agentName = (agent?.user_metadata?.full_name as string | undefined) ?? agent?.email?.split('@')[0] ?? 'Unknown';

  // Email all managers
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const managers = users.filter(u => MANAGER_ROLES.includes((u.user_metadata?.role as string | undefined) ?? ''));

  await Promise.all(managers.map(mgr => {
    if (!mgr.email) return;
    const mgrName = (mgr.user_metadata?.full_name as string | undefined) ?? mgr.email.split('@')[0];
    return sendEmail({
      to:      mgr.email,
      subject: `Approval required: ${agentName} — R${Math.round(opts.amountCents / 100).toLocaleString('en-ZA')}`,
      html:    managerApprovalRequestEmail({
        managerName: mgrName,
        agentName,
        leadName:    lead?.name    ?? '',
        company:     lead?.company ?? '',
        amountCents: opts.amountCents,
        proposalId:  opts.proposalId,
        adminUrl:    PORTAL_URL,
      }),
    });
  }));
}
