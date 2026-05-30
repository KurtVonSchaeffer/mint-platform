import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/email
 * Generic email sender. Body: { to, subject, html, replyTo? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, subject, html, replyTo } = body;
  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'to, subject, html required' }, { status: 400 });
  }
  const result = await sendEmail({ to, subject, html, replyTo });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id });
}
