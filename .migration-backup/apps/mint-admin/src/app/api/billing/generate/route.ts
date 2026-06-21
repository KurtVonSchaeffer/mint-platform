import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyInvoices, sendMonthlyInvoices } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/billing/generate
 * Body: { month: "2026-05", clientId?: string, autoSend?: boolean }
 *
 * Generates draft invoices then optionally emails them to clients.
 * Idempotent — skips clients who already have an invoice for the period.
 */
export async function POST(req: NextRequest) {
  let body: { month?: string; clientId?: string; autoSend?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { month, clientId, autoSend = false } = body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month is required in YYYY-MM format' }, { status: 422 });
  }

  try {
    const generateResult = await generateMonthlyInvoices(month, clientId);
    if (!autoSend) return NextResponse.json(generateResult);

    const sendResult = await sendMonthlyInvoices(month, clientId);
    return NextResponse.json({ ...generateResult, send: sendResult });
  } catch (err) {
    console.error('[billing/generate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
