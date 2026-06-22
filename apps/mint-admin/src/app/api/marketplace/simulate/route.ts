import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/simulate
 *
 * Admin-only proxy to /api/marketplace/evaluate.
 * Requires a valid Supabase session (admin user) — the browser never needs
 * to know ADMIN_SIMULATE_SECRET; this route adds it server-side.
 *
 * The middleware passes /api/marketplace/* through without auth because
 * the evaluate endpoint uses Bearer token auth for MINT. This route lives
 * under that path but gates on session cookies instead.
 */
export async function POST(req: NextRequest) {
  // Verify admin session via cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Forward to the evaluate endpoint with the server-side secret
  const body = await req.text();
  const host = req.headers.get('host') ?? 'localhost:3001';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const base = `${protocol}://${host}`;

  const evalRes = await fetch(`${base}/api/marketplace/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type':             'application/json',
      'x-admin-simulate':         '1',
      'x-admin-simulate-secret':  process.env.ADMIN_SIMULATE_SECRET ?? '',
    },
    body,
  });

  const data = await evalRes.json();
  return NextResponse.json(data, { status: evalRes.status });
}
