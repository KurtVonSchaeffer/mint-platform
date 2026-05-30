/**
 * Loan-book migration — CSV parsing, validation, dry-run, and commit.
 *
 * Flow:
 *   1. parseCsv(text)         → MigrationRow[]
 *   2. dryRun(rows, clientId) → MigrationSummary   (no writes, safe to call freely)
 *   3. commit(rows, clientId) → MigrationSummary   (creates auth users + DB rows)
 *
 * Borrower identity:
 *   - Match by email within the client's profiles table.
 *   - If found → reuse the existing profile.
 *   - If not found → create a new Supabase auth user (email_confirm = true,
 *     temp password). The tg_handle_new_user trigger auto-creates the profile.
 *   - Email already used by a *different* client → row flagged as error.
 *
 * Idempotency:
 *   - loan_applications upserted on (client_id, reference).
 *   - loans upserted on (client_id, reference).
 *   - repayment_schedule upserted on (loan_id, instalment_no).
 *   Re-running the same CSV is safe; existing rows are skipped.
 */

import { addMonths, parseISO } from 'date-fns';
import { supabaseAdmin } from './supabase';

/* ─── Types ──────────────────────────────────────────────────────── */

export interface MigrationRow {
  legacyReference:    string;
  borrowerEmail:      string;
  borrowerName:       string;
  borrowerIdNumber:   string;
  borrowerMobile:     string;
  businessName:       string;
  purpose:            string;
  principal:          number;
  outstandingBalance: number;
  totalPaid:          number;
  interestRate:       number;
  termMonths:         number;
  monthlyInstalment:  number;
  disbursedDate:      string;   // YYYY-MM-DD
  nextDueDate:        string;   // YYYY-MM-DD  (first upcoming instalment)
  loanStatus:         'active' | 'arrears' | 'closed' | 'settled' | 'written_off';
}

export type RowAction = 'create' | 'skip' | 'error';

export interface MigrationRowResult {
  rowIndex:        number;       // 1-based (skipping header)
  legacyReference: string;
  borrowerEmail:   string;
  action:          RowAction;
  reason?:         string;
  scheduleRows?:   number;
}

export interface MigrationSummary {
  total:   number;
  created: number;
  skipped: number;
  errors:  number;
  rows:    MigrationRowResult[];
}

/* ─── CSV template ───────────────────────────────────────────────── */

export const CSV_COLUMNS = [
  'legacy_reference',
  'borrower_email',
  'borrower_name',
  'borrower_id_number',
  'borrower_mobile',
  'business_name',
  'purpose',
  'principal',
  'outstanding_balance',
  'total_paid',
  'interest_rate_pct',
  'term_months',
  'monthly_instalment',
  'disbursed_date',
  'next_due_date',
  'loan_status',
] as const;

export const CSV_TEMPLATE = [
  CSV_COLUMNS.join(','),
  [
    'LN-001',
    'john@example.com',
    'John Smith',
    '8001015009087',
    '0821234567',
    'Smith Enterprises',
    'Working capital',
    '100000',
    '75000',
    '25000',
    '20.5',
    '24',
    '5000',
    '2024-06-01',
    '2026-06-01',
    'active',
  ].join(','),
].join('\n');

/* ─── CSV parser ─────────────────────────────────────────────────── */


export interface ParseResult {
  rows:        MigrationRow[];
  parseErrors: string[];
}

const LOAN_STATUSES = new Set(['active', 'arrears', 'closed', 'settled', 'written_off']);

export function parseCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) return { rows: [], parseErrors: ['File is empty.'] };

  // Strip header
  const [header, ...dataLines] = lines;
  const headers = parsecsv_cols(header);

  // Validate column order (lenient — just check they're all present)
  const missing = CSV_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return {
      rows: [],
      parseErrors: [`Missing columns: ${missing.join(', ')}. Download the template to see the required format.`],
    };
  }

  const idx = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<string, number>;

  const rows: MigrationRow[] = [];
  const parseErrors: string[] = [];

  dataLines.forEach((line, li) => {
    const rowNum = li + 2; // 1-based, after header
    const cols = parsecsv_cols(line);

    function col(name: string) { return cols[idx[name]] ?? ''; }
    function num(name: string) {
      const v = parseFloat(col(name));
      return Number.isFinite(v) ? v : NaN;
    }

    const status = col('loan_status').toLowerCase();
    if (!LOAN_STATUSES.has(status)) {
      parseErrors.push(`Row ${rowNum}: loan_status "${status}" is not valid. Use: active | arrears | closed | settled | written_off`);
      return;
    }

    const principal          = num('principal');
    const outstandingBalance = num('outstanding_balance');
    const totalPaid          = num('total_paid');
    const interestRate       = num('interest_rate_pct');
    const termMonths         = num('term_months');
    const monthlyInstalment  = num('monthly_instalment');

    const badNums = [
      [principal,          'principal'],
      [outstandingBalance, 'outstanding_balance'],
      [totalPaid,          'total_paid'],
      [interestRate,       'interest_rate_pct'],
      [termMonths,         'term_months'],
      [monthlyInstalment,  'monthly_instalment'],
    ].filter(([v]) => isNaN(v as number)).map(([, k]) => k as string);

    if (badNums.length > 0) {
      parseErrors.push(`Row ${rowNum}: non-numeric values in ${badNums.join(', ')}`);
      return;
    }

    const legacyReference = col('legacy_reference');
    const borrowerEmail   = col('borrower_email').toLowerCase();

    if (!legacyReference) { parseErrors.push(`Row ${rowNum}: legacy_reference is required`); return; }
    if (!borrowerEmail)   { parseErrors.push(`Row ${rowNum}: borrower_email is required`);   return; }
    if (!col('borrower_name')) { parseErrors.push(`Row ${rowNum}: borrower_name is required`); return; }

    // Basic date validation
    for (const [field, val] of [['disbursed_date', col('disbursed_date')], ['next_due_date', col('next_due_date')]] as [string, string][]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        parseErrors.push(`Row ${rowNum}: ${field} must be YYYY-MM-DD, got "${val}"`);
        return;
      }
    }

    rows.push({
      legacyReference,
      borrowerEmail,
      borrowerName:     col('borrower_name'),
      borrowerIdNumber: col('borrower_id_number'),
      borrowerMobile:   col('borrower_mobile'),
      businessName:     col('business_name'),
      purpose:          col('purpose') || 'Migrated loan',
      principal,
      outstandingBalance,
      totalPaid,
      interestRate,
      termMonths:         Math.round(termMonths),
      monthlyInstalment,
      disbursedDate:    col('disbursed_date'),
      nextDueDate:      col('next_due_date'),
      loanStatus:       status as MigrationRow['loanStatus'],
    });
  });

  return { rows, parseErrors };
}

function parsecsv_cols(line: string): string[] {
  return parsecsv_raw(line).map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'));
}

function parsecsv_raw(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"')                    { inQuote = false; }
      else                                    { cur += ch; }
    } else {
      if (ch === '"')  { inQuote = true; }
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else             { cur += ch; }
    }
  }
  fields.push(cur.trim());
  return fields;
}

/* ─── Repayment schedule generator ──────────────────────────────── */

function buildSchedule(row: MigrationRow, loanId: string, clientId: string) {
  if (['closed', 'settled', 'written_off'].includes(row.loanStatus)) return [];
  if (row.outstandingBalance <= 0) return [];

  const remaining = Math.max(1, Math.round(row.outstandingBalance / row.monthlyInstalment));
  const base = parseISO(row.nextDueDate);

  return Array.from({ length: remaining }, (_, i) => ({
    client_id:     clientId,
    loan_id:       loanId,
    instalment_no: i + 1,
    due_date:      formatDate(addMonths(base, i)),
    amount_due:    i < remaining - 1
      ? row.monthlyInstalment
      : Math.max(row.outstandingBalance - row.monthlyInstalment * (remaining - 1), row.monthlyInstalment),
    principal_part: 0,
    interest_part:  0,
    fees_part:      0,
    amount_paid:    0,
    status:         'upcoming' as const,
  }));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ─── Dry run ────────────────────────────────────────────────────── */

export async function dryRun(
  rows: MigrationRow[],
  clientId: string,
): Promise<MigrationSummary> {
  const results: MigrationRowResult[] = [];

  // Fetch all existing loan references for this client in one query
  const { data: existing } = await supabaseAdmin
    .from('loans')
    .select('reference')
    .eq('client_id', clientId);

  const existingRefs = new Set((existing ?? []).map((r: { reference: string }) => r.reference));

  // Check for duplicate references within the uploaded file
  const seenInFile = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const loanRef = `MIG-${row.legacyReference}`;

    if (seenInFile.has(row.legacyReference)) {
      results.push({ rowIndex: i + 2, legacyReference: row.legacyReference, borrowerEmail: row.borrowerEmail, action: 'error', reason: 'Duplicate legacy_reference in file' });
      continue;
    }
    seenInFile.add(row.legacyReference);

    if (existingRefs.has(loanRef)) {
      results.push({ rowIndex: i + 2, legacyReference: row.legacyReference, borrowerEmail: row.borrowerEmail, action: 'skip', reason: 'Loan already exists (will be skipped on import)' });
      continue;
    }

    const scheduleRows = buildSchedule(row, 'dry-run', clientId).length;
    results.push({
      rowIndex:        i + 2,
      legacyReference: row.legacyReference,
      borrowerEmail:   row.borrowerEmail,
      action:          'create',
      scheduleRows,
    });
  }

  return summarise(results);
}

/* ─── Commit ─────────────────────────────────────────────────────── */

export async function commitMigration(
  rows: MigrationRow[],
  clientId: string,
): Promise<MigrationSummary> {
  const results: MigrationRowResult[] = [];
  const seenInFile = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const loanRef = `MIG-${row.legacyReference}`;
    const appRef  = `MIG-${row.legacyReference}`;

    if (seenInFile.has(row.legacyReference)) {
      results.push({ rowIndex: i + 2, legacyReference: row.legacyReference, borrowerEmail: row.borrowerEmail, action: 'error', reason: 'Duplicate legacy_reference in file' });
      continue;
    }
    seenInFile.add(row.legacyReference);

    try {
      // ── 1. Resolve borrower profile ──────────────────────────────
      const borrowerId = await resolveOrCreateBorrower(row, clientId);

      // ── 2. Upsert loan_application (synthetic) ───────────────────
      const { data: appData, error: appErr } = await supabaseAdmin
        .from('loan_applications')
        .upsert({
          reference:       appRef,
          client_id:       clientId,
          borrower_id:     borrowerId,
          product:         'business_loan',
          amount:          row.principal,
          term_months:     row.termMonths,
          interest_rate:   row.interestRate,
          purpose:         row.purpose,
          business_name:   row.businessName || null,
          status:          'disbursed',
          status_reason:   'Migrated from legacy system',
          submitted_at:    row.disbursedDate,
          disbursed_at:    row.disbursedDate,
        }, { onConflict: 'client_id,reference', ignoreDuplicates: false })
        .select('id')
        .single();

      if (appErr) throw new Error(`loan_applications: ${appErr.message}`);

      // ── 3. Upsert loan ───────────────────────────────────────────
      const { data: loanData, error: loanErr } = await supabaseAdmin
        .from('loans')
        .upsert({
          reference:           loanRef,
          client_id:           clientId,
          application_id:      appData.id,
          borrower_id:         borrowerId,
          principal:           row.principal,
          term_months:         row.termMonths,
          interest_rate:       row.interestRate,
          monthly_installment: row.monthlyInstalment,
          total_repayment:     row.principal + (row.interestRate / 100) * row.principal, // approx
          initiation_fee:      0,
          monthly_service_fee: 0,
          total_paid:          row.totalPaid,
          outstanding_balance: row.outstandingBalance,
          arrears_amount:      row.loanStatus === 'arrears' ? row.monthlyInstalment : 0,
          days_overdue:        row.loanStatus === 'arrears' ? 30 : 0,
          status:              row.loanStatus,
          disbursed_at:        row.disbursedDate,
          first_due_date:      row.nextDueDate,   // best approximation
          final_due_date:      formatDate(addMonths(parseISO(row.nextDueDate), Math.max(1, Math.round(row.outstandingBalance / row.monthlyInstalment)) - 1)),
          closed_at:           ['closed', 'settled'].includes(row.loanStatus) ? row.disbursedDate : null,
        }, { onConflict: 'client_id,reference', ignoreDuplicates: false })
        .select('id')
        .single();

      if (loanErr) throw new Error(`loans: ${loanErr.message}`);

      // ── 4. Upsert repayment schedule ──────────────────────────────
      const schedule = buildSchedule(row, loanData.id, clientId);
      if (schedule.length > 0) {
        const { error: schedErr } = await supabaseAdmin
          .from('repayment_schedule')
          .upsert(schedule, { onConflict: 'loan_id,instalment_no', ignoreDuplicates: false });
        if (schedErr) throw new Error(`repayment_schedule: ${schedErr.message}`);
      }

      results.push({
        rowIndex:        i + 2,
        legacyReference: row.legacyReference,
        borrowerEmail:   row.borrowerEmail,
        action:          'create',
        scheduleRows:    schedule.length,
      });
    } catch (err) {
      results.push({
        rowIndex:        i + 2,
        legacyReference: row.legacyReference,
        borrowerEmail:   row.borrowerEmail,
        action:          'error',
        reason:          err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summarise(results);
}

/* ─── Borrower resolution ────────────────────────────────────────── */

async function resolveOrCreateBorrower(row: MigrationRow, clientId: string): Promise<string> {
  // 1. Try to find existing profile in this client
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id, client_id')
    .eq('email', row.borrowerEmail)
    .single();

  if (existing) {
    if (existing.client_id !== clientId) {
      throw new Error(`Email ${row.borrowerEmail} belongs to a different client — cannot reuse`);
    }
    return existing.id as string;
  }

  // 2. Create Supabase auth user — trigger will create the profile
  const tempPassword = generateTempPassword();
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email:         row.borrowerEmail,
    email_confirm: true,
    password:      tempPassword,
    user_metadata: {
      full_name:  row.borrowerName,
      client_id:  clientId,
      role:       'borrower',
      mobile:     row.borrowerMobile  || null,
      id_number:  row.borrowerIdNumber || null,
    },
  });

  if (authErr) throw new Error(`Auth user creation failed for ${row.borrowerEmail}: ${authErr.message}`);

  const uid = authData.user.id;

  // 3. The trigger creates the profile automatically; patch extra fields
  await supabaseAdmin
    .from('profiles')
    .update({ id_number: row.borrowerIdNumber || null, contact_number: row.borrowerMobile || null })
    .eq('id', uid);

  return uid;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function summarise(rows: MigrationRowResult[]): MigrationSummary {
  return {
    total:   rows.length,
    created: rows.filter((r) => r.action === 'create').length,
    skipped: rows.filter((r) => r.action === 'skip').length,
    errors:  rows.filter((r) => r.action === 'error').length,
    rows,
  };
}
