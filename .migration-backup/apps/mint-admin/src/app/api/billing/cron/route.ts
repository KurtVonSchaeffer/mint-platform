import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyInvoices } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/billing/cron
 *
 * Called by Vercel Cron on the 1st of each month at 06:00 SAST (04:00 UTC).
 * Generates draft invoices for the previous calendar month for all active clients.
 *
 * Also callable manually: POST with { month: "YYYY-MM" } for a specific period.
 * Protected by CRON_SECRET env var in both cases.
 */

function prevMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends the secret as Bearer token
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get('month') ?? prevMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 422 });
  }

  try {
    const result = await generateMonthlyInvoices(month);
    console.log(`[billing/cron] ${month} →`, result);
    return NextResponse.json({ month, result });
  } catch (err) {
    console.error('[billing/cron]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: { month?: string; clientId?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const month = body.month ?? prevMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 422 });
  }

  try {
    const result = await generateMonthlyInvoices(month, body.clientId);
    return NextResponse.json({ month, result });
  } catch (err) {
    console.error('[billing/cron]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
