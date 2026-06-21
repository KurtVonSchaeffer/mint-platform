import { NextRequest, NextResponse } from 'next/server';
import { parseCsv, dryRun, commitMigration, CSV_TEMPLATE } from '@/lib/migration';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';
export const maxDuration = 120;   // large imports can take a while

/**
 * GET /api/migration/loans
 * Returns the CSV template as a file download.
 */
export async function GET() {
  return new NextResponse(CSV_TEMPLATE, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="loanbook-import-template.csv"',
    },
  });
}

/**
 * POST /api/migration/loans?clientId=<uuid>&dryRun=true|false
 *
 * Body: multipart/form-data  →  field "file" (CSV)
 *    OR application/octet-stream / text/csv  (raw CSV body)
 *
 * Returns MigrationSummary JSON.
 */
export async function POST(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId');
  const isDryRun = req.nextUrl.searchParams.get('dryRun') !== 'false';

  if (!clientId) {
    return NextResponse.json({ error: 'clientId query param is required' }, { status: 400 });
  }

  // Accept both multipart and raw body
  let csvText: string;
  try {
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file field in form data' }, { status: 400 });
      }
      csvText = await (file as File).text();
    } else {
      csvText = await req.text();
    }
  } catch {
    return NextResponse.json({ error: 'Could not read request body' }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }

  // Parse
  const { rows, parseErrors } = parseCsv(csvText);
  if (parseErrors.length > 0) {
    return NextResponse.json({ error: 'CSV parse errors', parseErrors }, { status: 422 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 422 });
  }

  try {
    const summary = isDryRun
      ? await dryRun(rows, clientId)
      : await commitMigration(rows, clientId);

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error('[migration/loans]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
