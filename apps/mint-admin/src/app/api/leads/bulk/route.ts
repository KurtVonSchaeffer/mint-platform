import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 500;

interface LeadRow {
  name:     string;
  email?:   string | null;
  company:  string;
  phone?:   string | null;
  message?: string | null;
  source?:  string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { leads: LeadRow[] };
  const rows = body.leads;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'leads array required' }, { status: 422 });
  }

  // Require name + company + at least one of email or phone
  const invalid = rows.filter(r => !r.name?.trim() || !r.company?.trim() || (!r.email?.trim() && !r.phone?.trim()));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `${invalid.length} row(s) missing name/company or both email and phone` }, { status: 422 });
  }

  // Collect emails + phones for dedup check
  const emails = rows.filter(r => r.email?.trim()).map(r => r.email!.toLowerCase().trim());
  const phones = rows.filter(r => r.phone?.trim()).map(r => r.phone!.trim());

  const [emailCheck, phoneCheck] = await Promise.all([
    emails.length > 0
      ? supabaseAdmin.from('leads').select('email').in('email', emails)
      : Promise.resolve({ data: [] }),
    phones.length > 0
      ? supabaseAdmin.from('leads').select('phone').in('phone', phones)
      : Promise.resolve({ data: [] }),
  ]);

  const existingEmails = new Set((emailCheck.data ?? []).map((r: { email: string }) => r.email.toLowerCase()));
  const existingPhones = new Set((phoneCheck.data ?? []).map((r: { phone: string }) => r.phone));

  // Build results — dedup by email when present, otherwise by phone
  const toInsert: LeadRow[] = [];
  const duplicates: string[] = [];

  for (const row of rows) {
    const emailNorm = row.email?.trim() ? row.email.toLowerCase().trim() : null;
    const phoneNorm = row.phone?.trim() || null;

    const isDup = (emailNorm && existingEmails.has(emailNorm)) ||
                  (!emailNorm && phoneNorm && existingPhones.has(phoneNorm));

    if (isDup) {
      duplicates.push(emailNorm ?? phoneNorm ?? '');
    } else {
      toInsert.push(row);
      if (emailNorm) existingEmails.add(emailNorm);
      if (phoneNorm) existingPhones.add(phoneNorm);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, duplicates: duplicates.length, byAgent: {} });
  }

  // Build insert payload — unassigned on import; TMs assigned manually after
  const insertPayload = toInsert.map(r => ({
    name:        r.name.trim(),
    email:       r.email?.trim() ? r.email.toLowerCase().trim() : null,
    company:     r.company.trim(),
    phone:       r.phone?.trim() ?? null,
    message:     r.message?.trim() ?? null,
    source:      r.source ?? 'import',
    status:      'new',
    assigned_to: null,
    tm_status:   null,
  }));

  // Batch insert in chunks of 500
  for (let i = 0; i < insertPayload.length; i += BATCH_SIZE) {
    const batch = insertPayload.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin.from('leads').insert(batch);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted:        toInsert.length,
    duplicates:      duplicates.length,
    duplicateEmails: duplicates,
  });
}
