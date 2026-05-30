import { NextRequest, NextResponse } from 'next/server';
import { appendLead } from '@/lib/leads-store';
import { pushLeadToAttio } from '@/lib/attio';

// Run on Node (not Edge) — we need fs access for the dev store.
export const runtime = 'nodejs';

const REQUIRED = ['name', 'email', 'company'] as const;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate
  const errors: string[] = [];
  for (const key of REQUIRED) {
    const v = body[key];
    if (typeof v !== 'string' || v.trim().length < 1) errors.push(key);
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Missing required fields', fields: errors }, { status: 400 });
  }

  // Light email sanity check
  const email = String(body.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  try {
    const lead = await appendLead({
      name:    String(body.name).trim(),
      email,
      company: String(body.company).trim(),
      message: typeof body.message === 'string' ? body.message.trim() : '',
      source:  'marketing-site',
    });
    console.log('[leads] new', { id: lead.id, email: lead.email, company: lead.company });

    // Fire-and-forget to Attio CRM. Never blocks the response — Attio outages
    // must not break the public form. The lead is already persisted locally.
    void pushLeadToAttio({
      name:    lead.name,
      email:   lead.email,
      company: lead.company,
      message: lead.message,
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error('[leads] write failed', err);
    return NextResponse.json({ error: 'Failed to record lead' }, { status: 500 });
  }
}
