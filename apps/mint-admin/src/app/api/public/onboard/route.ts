import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { pickNextAgent, notifyAgentNewLead } from '@/lib/lead-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, industry, website, name, email, phone, ncr_number } = body;

    if (!name || !email || !company) {
      return NextResponse.json({ error: 'name, email and company are required' }, { status: 422 });
    }

    const parts: string[] = [];
    if (industry)   parts.push(`Industry: ${industry}`);
    if (website)    parts.push(`Website: ${website}`);
    if (ncr_number) parts.push(`NCR Registration: ${ncr_number}`);
    const message = parts.join('\n') || undefined;

    const assigned_to = await pickNextAgent();

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name,
        email,
        company,
        phone:       phone ?? null,
        message:     message ?? null,
        source:      'self-onboard',
        status:      'new',
        assigned_to: assigned_to ?? null,
        tm_status:   assigned_to ? 'New Lead' : null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (assigned_to) {
      notifyAgentNewLead({
        agentId: assigned_to, leadId: data.id, leadName: name, company,
        phone: phone ?? null, email, message: message ?? null,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error('[public/onboard]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
