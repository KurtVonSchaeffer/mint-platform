import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, managerApprovalRequestEmail } from '@/lib/email';

const PORTAL_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.mintplatforms.co.za';
const APPROVAL_THRESHOLD = 5_000_000; // R50,000 in cents
const MANAGER_ROLES      = ['super_admin', 'admin', 'manager'];

export async function triggerApprovalFlow(opts: {
  proposalId:  string;
  agentId:     string;
  leadId:      string;
  amountCents: number;
}) {
  if (opts.amountCents < APPROVAL_THRESHOLD) return;

  const { data: lead } = await supabaseAdmin
    .from('leads').select('name, company').eq('id', opts.leadId).single();

  const { data: { user: agent } } = await supabaseAdmin.auth.admin.getUserById(opts.agentId);
  const agentName = (agent?.user_metadata?.full_name as string | undefined) ?? agent?.email?.split('@')[0] ?? 'Unknown';

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
