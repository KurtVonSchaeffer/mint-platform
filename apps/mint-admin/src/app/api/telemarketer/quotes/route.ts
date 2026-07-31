import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function nextRef(existing: string[]): string {
  const year = new Date().getFullYear();
  const max  = existing
    .map(r => parseInt(r.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `Q-${year}-${String(max + 1).padStart(3, '0')}`;
}

/** GET /api/telemarketer/quotes — list this TM's submitted quotes */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

/** POST /api/telemarketer/quotes — submit a quote for Keri-Leigh's approval */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { data: existing } = await supabaseAdmin
    .from('sales_quotes')
    .select('reference');

  const reference   = nextRef((existing ?? []).map(r => r.reference));
  const submittedBy = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Unknown';

  const { data, error } = await supabaseAdmin
    .from('sales_quotes')
    .insert({
      reference,
      client_name:     body.client         ?? '',
      contact_name:    body.contact        ?? '',
      contact_email:   body.email          ?? '',
      setup_fee:       body.setupFee       ?? 100000,
      monthly_fee:     body.monthlyFee     ?? 0,
      selected_checks: body.selectedChecks ?? [],
      volume_tier:     String(body.quota   ?? 0),
      branches:        body.branches       ?? 1,
      custom_items:    [],
      status:          'pending_approval',
      agent_id:        user.id,
      submitted_by:    submittedBy,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email all super admins so they know a quote is waiting for review
  const { data: usersRes } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const superAdmins = (usersRes?.users ?? []).filter(
    u => (u.user_metadata?.role as string | undefined) === 'super_admin' && u.email,
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  await Promise.all(superAdmins.map(u =>
    sendEmail({
      to:      u.email!,
      subject: `Quote for review — ${String(body.client ?? 'client')} (${reference})`,
      html:    `<p style="font-family:sans-serif"><strong>${submittedBy}</strong> submitted a quote that needs your approval.</p>
                <table style="font-family:sans-serif;border-collapse:collapse;width:100%;max-width:480px">
                  <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Client</td><td style="padding:6px 12px">${String(body.client ?? '—')}</td></tr>
                  <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Reference</td><td style="padding:6px 12px">${reference}</td></tr>
                  <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Setup fee</td><td style="padding:6px 12px">R${Number(body.setupFee ?? 0).toLocaleString('en-ZA')}</td></tr>
                  <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Monthly fee</td><td style="padding:6px 12px">R${Number(body.monthlyFee ?? 0).toLocaleString('en-ZA')}/mo</td></tr>
                </table>
                <p style="font-family:sans-serif;margin-top:20px"><a href="${appUrl}/quotes" style="background:#7C3AED;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review quote →</a></p>`,
    }).catch(() => null),
  ));

  return NextResponse.json({ quote: data }, { status: 201 });
}
