import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/payfast/status — whether PayFast merchant credentials are configured. */
export async function GET() {
  const enabled = !!process.env.PAYFAST_MERCHANT_ID && !!process.env.PAYFAST_MERCHANT_KEY;
  return NextResponse.json({ enabled });
}
