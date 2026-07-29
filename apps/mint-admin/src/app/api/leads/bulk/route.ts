import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { pickNextAgent } from '@/lib/lead-distribution';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LeadRow {
  name:    string;
  email:   string;
  company: string;
  phone?:  string | null;
  message?: string | null;
  source?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { leads: LeadRow[] };
  const rows = body.leads;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'leads array required' }, { status: 422 });
  }

  // Validate each row has the minimum required fields
  const invalid = rows.filter(r => !r.name?.trim() || !r.email?.trim() || !r.company?.trim());
  if (invalid.length > 0) {
    return NextResponse.json({ error: `${invalid.length} row(s) missing name, email, or company` }, { status: 422 });
  }

  // Collect all emails + phones for dedup check
  const emails = rows.map(r => r.email.toLowerCase().trim());
  const phones = rows.filter(r => r.phone?.trim()).map(r => r.phone!.trim());

  const [emailCheck, phoneCheck] = await Promise.all([
    supabaseAdmin.from('leads').select('email').in('email', emails),
    phones.length > 0
      ? supabaseAdmin.from('leads').select('phone').in('phone', phones)
      : Promise.resolve({ data: [] }),
  ]);

  const existingEmails = new Set((emailCheck.data ?? []).map((r: { email: string }) => r.email.toLowerCase()));
  const existingPhones = new Set((phoneCheck.data ?? []).map((r: { phone: string }) => r.phone));

  // Build results
  const toInsert: LeadRow[]     = [];
  const duplicates: string[] = [];

  for (const row of rows) {
    const emailNorm = row.email.toLowerCase().trim();
    const phoneNorm = row.phone?.trim();

    if (existingEmails.has(emailNorm) || (phoneNorm && existingPhones.has(phoneNorm))) {
      duplicates.push(row.email);
    } else {
      toInsert.push(row);
      existingEmails.add(emailNorm); // prevent intra-batch dups
      if (phoneNorm) existingPhones.add(phoneNorm);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      inserted: 0,
      duplicates: duplicates.length,
      byAgent: {},
    });
  }

  // Round-robin assign each lead
  const assignments: Array<LeadRow & { assigned_to: string | null }> = [];
  for (const row of toInsert) {
    const agentId = await pickNextAgent();
    assignments.push({ ...row, assigned_to: agentId });
  }

  // Insert
  const insertPayload = assignments.map(r => ({
    name:        r.name.trim(),
    email:       r.email.toLowerCase().trim(),
    company:     r.company.trim(),
    phone:       r.phone?.trim() ?? null,
    message:     r.message?.trim() ?? null,
    source:      r.source ?? 'import',
    status:      'new',
    assigned_to: r.assigned_to,
    tm_status:   r.assigned_to ? 'New Lead' : null,
  }));

  const { error } = await supabaseAdmin.from('leads').insert(insertPayload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget: notify each agent (grouped)
  const grouped: Record<string, typeof assignments> = {};
  for (const r of assignments) {
    if (r.assigned_to) {
      grouped[r.assigned_to] = grouped[r.assigned_to] ?? [];
      grouped[r.assigned_to].push(r);
    }
  }

  // Tally per-agent for response
  const byAgent: Record<string, number> = {};
  for (const [agentId, leads] of Object.entries(grouped)) {
    byAgent[agentId] = leads.length;
    // Notify with first lead's info (one email per agent)
    const first = leads[0];
    ;(async () => {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(agentId);
        if (!user?.email) return;
        const agentName = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0];
        const count = leads.length;
        await sendEmail({
          to:      user.email,
          subject: `${count} new lead${count > 1 ? 's' : ''} assigned to you`,
          html: `<p>Hi ${agentName},</p>
<p>${count} new lead${count > 1 ? 's have' : ' has'} been imported and assigned to you:</p>
<ul>${leads.map(l => `<li><strong>${l.name}</strong> — ${l.company}</li>`).join('')}</ul>
<p>Log in to your portal to start following up.</p>`,
        });
      } catch { /* fire and forget */ }
    })();
  }

  return NextResponse.json({
    inserted:   toInsert.length,
    duplicates: duplicates.length,
    byAgent,
  });
}
