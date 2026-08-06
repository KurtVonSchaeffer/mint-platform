/**
 * Round-robin lead distribution.
 * Picks the telemarketer with the fewest active (non-terminal) leads.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, newLeadNotificationEmail } from '@/lib/email';

const TERMINAL_STATUSES = ['Won', 'Lost', 'Other', 'Not Qualified', 'Not Interested', 'Converted'];
const PORTAL_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.mintplatforms.co.za';

export async function pickNextAgent(): Promise<string | null> {
  // 1. List all active telemarketer accounts
  const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const telemarketers = (usersPage?.users ?? []).filter(
    u => (u.user_metadata?.role as string | undefined) === 'telemarketer',
  );
  if (telemarketers.length === 0) return null;

  // 2. Count active leads per TM
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('assigned_to, tm_status')
    .not('assigned_to', 'is', null);

  const activeCounts: Record<string, number> = {};
  for (const tm of telemarketers) activeCounts[tm.id] = 0;

  for (const lead of leads ?? []) {
    const aid = lead.assigned_to as string;
    if (aid in activeCounts && !TERMINAL_STATUSES.includes(lead.tm_status ?? '')) {
      activeCounts[aid]++;
    }
  }

  // 3. Pick the TM with the fewest active leads (ties broken by array order)
  let chosen = telemarketers[0].id;
  let min    = activeCounts[chosen] ?? 0;
  for (const tm of telemarketers) {
    const n = activeCounts[tm.id] ?? 0;
    if (n < min) { chosen = tm.id; min = n; }
  }
  return chosen;
}

export async function notifyAgentNewLead(opts: {
  agentId:  string;
  leadId:   string;
  leadName: string;
  company:  string;
  phone:    string | null;
  email:    string;
  message:  string | null;
}) {
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(opts.agentId);
  if (!user?.email) return;

  const agentName = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0];

  const html = newLeadNotificationEmail({
    agentName,
    lead: {
      id:      opts.leadId,
      name:    opts.leadName,
      company: opts.company,
      phone:   opts.phone,
      email:   opts.email,
      message: opts.message,
    },
    portalUrl: PORTAL_URL,
  });

  await sendEmail({
    to:      user.email,
    subject: `New lead assigned: ${opts.leadName} — ${opts.company}`,
    html,
  });
}
