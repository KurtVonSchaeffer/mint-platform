import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/[id]/credentials?projectId=prj_xxx
 *
 * Fetches the Supabase connection details for a specific client deployment
 * by reading their Vercel project environment variables.
 *
 * Uses the admin VERCEL_API_TOKEN (already in mint-admin env) — because all
 * client projects are in the same Vercel team, the token can read their env vars.
 *
 * Returns:
 *  { supabaseUrl, hasServiceKey, supabaseRef, mintClientId }
 *
 * NOTE: The service key itself is never returned in the response body.
 * It is only used server-side when the import route needs to write directly
 * to the client's Supabase instance.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const projectId = _req.nextUrl.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId query param required' }, { status: 400 });
  }

  const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json({ error: 'VERCEL_API_TOKEN not configured' }, { status: 503 });
  }

  const qs = new URLSearchParams({ decrypt: 'true' });
  if (teamId) qs.set('teamId', teamId);

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('[credentials] Vercel env fetch failed', res.status, body);
    return NextResponse.json(
      { error: `Vercel API returned ${res.status}. Check the token has access to this project.` },
      { status: res.status },
    );
  }

  const { envs } = await res.json() as {
    envs: Array<{ key: string; value: string; type: string }>;
  };

  const find = (key: string) => envs.find((e) => e.key === key)?.value ?? null;

  const supabaseUrl    = find('NEXT_PUBLIC_SUPABASE_URL') ?? find('SUPABASE_URL');
  const hasServiceKey  = !!(find('SUPABASE_SERVICE_ROLE_KEY'));
  const mintClientId   = find('MINT_CLIENT_ID');
  const hasTelemetryKey = !!(find('MINT_TELEMETRY_KEY'));

  // Derive project ref from URL: https://xxxx.supabase.co → xxxx
  const supabaseRef = supabaseUrl
    ? supabaseUrl.replace('https://', '').replace('.supabase.co', '').split('.')[0]
    : null;

  return NextResponse.json({
    clientId,
    projectId,
    supabaseUrl,
    supabaseRef,
    hasServiceKey,
    mintClientId,
    hasTelemetryKey,
    // Checklist — tells the UI what's configured
    checklist: {
      supabase:    !!supabaseUrl,
      serviceKey:  hasServiceKey,
      clientId:    !!mintClientId,
      telemetry:   hasTelemetryKey,
    },
  });
}
