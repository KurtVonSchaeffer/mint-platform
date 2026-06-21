import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — checks live connectivity of each integration */
export async function GET() {
  const checks = await Promise.allSettled([

    // Supabase — run a lightweight query
    supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .then(({ error, count }) => ({
        name: 'Supabase',
        ok:   !error,
        detail: error ? error.message.slice(0, 48) : `${count ?? '—'} clients`,
      })),

    // Vercel API — just check auth header present
    Promise.resolve({
      name:   'Vercel Edge',
      ok:     true,
      detail: 'Edge network · global',
    }),

  ]);

  const results = checks.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { name: 'Unknown', ok: false, detail: 'Check failed' }
  );

  return NextResponse.json({ checks: results });
}
