import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyInvoices } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;       // billing run can take a while for many clients

/**
 * POST /api/billing/generate
 * Body: { month: "2026-05" }
 *
 * Generates draft invoices for all active/trial clients for the given month.
 * Idempotent — skips clients who already have an invoice for the period.
 */
export async function POST(req: NextRequest) {
  let body: { month?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { month } = body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month is required in YYYY-MM format' }, { status: 422 });
  }

  try {
    const result = await generateMonthlyInvoices(month);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('[billing/generate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
