import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  return ['super_admin', 'admin', 'finance', 'manager'].includes(role);
}

const SOURCE_LABELS: Record<string, string> = {
  'marketing-site': 'algolend.co.za',
  referral:         'Referral',
  manual:           'Manual Entry',
};

const WON_STATUSES = new Set(['Won', 'Converted']);

export async function GET() {
  if (!await isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Paginate all leads to bypass PostgREST 1000-row cap
  const PAGE = 1000;
  let page = 0;
  const all: { source: string | null; tm_status: string | null }[] = [];
  while (true) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('source, tm_status')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    page++;
  }

  // Aggregate per source
  const buckets: Record<string, { count: number; won: number }> = {};
  for (const l of all) {
    const src = l.source ?? 'manual';
    if (!buckets[src]) buckets[src] = { count: 0, won: 0 };
    buckets[src].count++;
    if (WON_STATUSES.has(l.tm_status ?? '')) buckets[src].won++;
  }

  const sources = Object.entries(buckets).map(([source, b]) => ({
    source,
    label:       SOURCE_LABELS[source] ?? source,
    count:       b.count,
    won:         b.won,
    convRate:    b.count > 0 ? Math.round((b.won / b.count) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({ sources, total: all.length });
}
