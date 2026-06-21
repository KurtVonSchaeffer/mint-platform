import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Large CSV uploads need more time
export const maxDuration = 300;

/**
 * POST /api/migration/import-loanbook
 *
 * Accepts a multipart form with:
 *   - clientId     (uuid)        — the mint-admin client record
 *   - projectId    (string)      — Vercel project ID (prj_xxx)
 *   - file         (CSV file)    — exported from ZwaneOfficial
 *
 * Steps:
 *   1. Fetch the client's Supabase URL + service key from their Vercel env vars
 *   2. Parse the CSV
 *   3. Map ZwaneOfficial schema → Mint Platform schema
 *   4. Upsert rows into the client's own Supabase instance
 *   5. Write a log record to mint_telemetry.loanbook_import_log
 *   6. Update clients.migration_status
 *
 * CSV expected columns (ZwaneOfficial export):
 *   id, reference, borrower_name, borrower_email, borrower_phone,
 *   business_name, loan_amount, term_months, interest_rate, status,
 *   purpose, monthly_revenue, monthly_expenses, cipc_number,
 *   created_at, submitted_at, disbursed_at, decision_at
 */
export async function POST(req: NextRequest) {
  const start = Date.now();
  const log   = (msg: string, meta?: object) =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), route: 'import-loanbook', msg, ...meta }));

  try {
  const form = await req.formData();

  const clientId  = form.get('clientId')  as string | null;
  const projectId = form.get('projectId') as string | null;
  const file      = form.get('file')      as File   | null;

  log('request received', { clientId, projectId, fileName: file?.name, fileSize: file?.size });

  if (!clientId || !projectId || !file) {
    log('validation failed', { clientId: !!clientId, projectId: !!projectId, file: !!file });
    return NextResponse.json(
      { error: 'clientId, projectId, and file are all required' },
      { status: 400 },
    );
  }

  // ── Step 1: fetch client Supabase credentials from Vercel ─────────
  const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json({ error: 'VERCEL_API_TOKEN not configured' }, { status: 503 });
  }

  const qs = new URLSearchParams({ decrypt: 'true' });
  if (teamId) qs.set('teamId', teamId);

  const envRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!envRes.ok) {
    return NextResponse.json(
      { error: `Could not fetch Vercel env vars (${envRes.status})` },
      { status: 502 },
    );
  }

  const { envs } = await envRes.json() as { envs: Array<{ key: string; value: string }> };
  const find = (key: string) => envs.find((e) => e.key === key)?.value ?? null;

  const clientSupabaseUrl  = find('NEXT_PUBLIC_SUPABASE_URL') ?? find('SUPABASE_URL');
  const clientServiceKey   = find('SUPABASE_SERVICE_ROLE_KEY');

  if (!clientSupabaseUrl || !clientServiceKey) {
    return NextResponse.json(
      {
        error: 'Client Vercel project is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
               'Set these env vars in the client\'s Vercel project, then retry.',
      },
      { status: 422 },
    );
  }

  // ── Step 2: parse CSV ─────────────────────────────────────────────
  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV is empty or could not be parsed' }, { status: 422 });
  }

  // ── Step 3: map to Mint Platform schema ───────────────────────────
  const mapped = rows.map(mapZwaneRow);

  // ── Step 4: write to client's Supabase ───────────────────────────
  const clientDb = createClient(clientSupabaseUrl, clientServiceKey, {
    auth: { persistSession: false },
  });

  const errors: Array<{ row: number; message: string }> = [];
  let successCount = 0;

  // Process in batches of 100
  const BATCH = 100;
  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH);

    // First ensure profiles (borrowers) exist
    const profiles = batch
      .filter((r) => r.borrower_email)
      .map((r) => ({
        id:          r._borrower_id,
        full_name:   r._borrower_name,
        email:       r.borrower_email,
        phone:       r._borrower_phone,
        client_id:   clientId,
        role:        'borrower',
        created_at:  r.created_at,
      }));

    if (profiles.length) {
      await clientDb.from('profiles').upsert(profiles, {
        onConflict: 'email',
        ignoreDuplicates: true,
      });
    }

    // Now insert loan applications
    const apps = batch.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _borrower_id, _borrower_name, _borrower_phone, borrower_email, ...app } = r;
      return { ...app, client_id: clientId, borrower_id: _borrower_id };
    });

    const { error } = await clientDb.from('loan_applications').upsert(apps, {
      onConflict: 'client_id,reference',
      ignoreDuplicates: true,
    });

    if (error) {
      for (let j = 0; j < batch.length; j++) {
        errors.push({ row: i + j + 2, message: error.message }); // +2 for 1-index + header
      }
    } else {
      successCount += batch.length;
    }
  }

  // ── Step 5: log to mint_telemetry ────────────────────────────────
  if (supabaseAdmin) {
    const logData = {
      client_id:     clientId,
      source_file:   file.name,
      row_count:     rows.length,
      success_count: successCount,
      error_count:   errors.length,
      errors:        errors.length ? errors.slice(0, 50) : null,
      status:        errors.length === rows.length ? 'failed' : 'done',
      completed_at:  new Date().toISOString(),
    };

    await (supabaseAdmin.schema('mint_telemetry' as never) as ReturnType<typeof supabaseAdmin.schema>)
      .from('loanbook_import_log' as never)
      .insert(logData);

    // ── Step 6: update client migration_status ──────────────────────
    await supabaseAdmin.from('clients').update({
      migration_status:       errors.length === rows.length ? 'failed' : 'completed',
      migration_completed_at: new Date().toISOString(),
      migrated_loan_count:    successCount,
      migration_error:        errors.length ? `${errors.length} rows failed` : null,
    }).eq('id', clientId);
  }

  log('import complete', { rowCount: rows.length, successCount, errorCount: errors.length, durationMs: Date.now() - start });

  return NextResponse.json({
    success:      true,
    rowCount:     rows.length,
    successCount,
    errorCount:   errors.length,
    errors:       errors.slice(0, 20),
  });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('unhandled error', { error: message, durationMs: Date.now() - start });
    console.error('[import-loanbook] unhandled error', err);
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 });
  }
}

// ── CSV parser ────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines  = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());

    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  }).filter((r) => Object.values(r).some(Boolean)); // skip fully blank rows
}

// ── ZwaneOfficial → Mint Platform schema mapper ───────────────────────

const STATUS_MAP: Record<string, string> = {
  pending:      'submitted',
  under_review: 'under_review',
  approved:     'approved',
  declined:     'declined',
  disbursed:    'disbursed',
  closed:       'closed',
  rejected:     'declined',
  active:       'disbursed',
  completed:    'closed',
  draft:        'draft',
  withdrawn:    'withdrawn',
};

function mapZwaneRow(row: Record<string, string>) {
  const borrowerId = crypto.randomUUID(); // will be upserted on email conflict

  return {
    // Borrower profile (stripped before DB insert, used only to seed profiles table)
    _borrower_id:    borrowerId,
    _borrower_name:  row['borrower_name']  || row['applicant_name']  || 'Unknown',
    _borrower_phone: row['borrower_phone'] || row['applicant_phone'] || null,
    borrower_email:  row['borrower_email'] || row['applicant_email'] || null,

    // Loan application columns
    reference:             row['reference'] || row['id'] || `LEGACY-${Date.now()}`,
    product:               'business_loan' as const,
    amount:                parseFloat(row['loan_amount'] || row['amount'] || '0') || 0,
    term_months:           parseInt(row['term_months'] || '12', 10) || 12,
    interest_rate:         parseFloat(row['interest_rate'] || '0') || 0,
    initiation_fee:        parseFloat(row['initiation_fee'] || '0') || 0,
    monthly_service_fee:   parseFloat(row['monthly_service_fee'] || '0') || 0,
    purpose:               row['purpose'] || null,

    // Business snapshot
    business_name:         row['business_name'] || null,
    cipc_number:           row['cipc_number'] || null,
    monthly_revenue:       parseFloat(row['monthly_revenue'] || '0') || null,
    monthly_expenses:      parseFloat(row['monthly_expenses'] || '0') || null,

    // Status
    status: (STATUS_MAP[row['status']?.toLowerCase?.()] ?? 'draft') as
      'draft' | 'submitted' | 'under_review' | 'approved' | 'declined' | 'disbursed' | 'closed',

    // Timestamps
    created_at:    row['created_at']    || new Date().toISOString(),
    updated_at:    row['updated_at']    || new Date().toISOString(),
    submitted_at:  row['submitted_at']  || null,
    decision_at:   row['decision_at']   || null,
    disbursed_at:  row['disbursed_at']  || null,
  };
}
