import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/vercel/usage?projectId=prj_xxx&clientId=uuid&period=2026-05
 *
 * Returns API usage metrics for a specific client/project.
 * Sources (in priority order):
 *   1. mint_telemetry.api_events — real data from client deployments
 *   2. Vercel API deployment/invocation count — fallback if telemetry empty
 *
 * Response shape:
 * {
 *   source: 'telemetry' | 'vercel_api' | 'none',
 *   totalCalls: number,
 *   errorCalls: number,
 *   errorRate: number,       // 0–100
 *   avgMs: number,
 *   p99Ms: number,
 *   byEndpoint: { path, calls, errors, avgMs, p99Ms }[],
 *   byDay: { date, calls }[],
 *   deployments: { id, url, createdAt, state }[],
 * }
 */
export async function GET(req: NextRequest) {
  const p          = Object.fromEntries(req.nextUrl.searchParams.entries());
  const clientId   = p['clientId']  ?? null;
  const projectId  = p['projectId'] ?? null;
  const period     = p['period']    ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  if (!clientId && !projectId) {
    return NextResponse.json({ error: 'clientId or projectId required' }, { status: 400 });
  }

  // ── 1. Try telemetry DB first ─────────────────────────────────────
  if (clientId && supabaseAdmin) {
    const periodStart = `${period}-01`;
    const periodEnd   = new Date(new Date(periodStart).getFullYear(),
                                 new Date(periodStart).getMonth() + 1, 1).toISOString();

    const { data: events, error } = await supabaseAdmin
      .schema('mint_telemetry' as never)
      .from('api_events' as never)
      .select('path, status, duration_ms, ts')
      .eq('client_id', clientId)
      .gte('ts', periodStart)
      .lt('ts', periodEnd)
      .limit(50000)  // cap to avoid huge payloads
      .returns<{ path: string; status: number; duration_ms: number | null; ts: string }[]>();

    if (!error && events && events.length > 0) {
      return NextResponse.json(buildTelemetryResponse(events, 'telemetry'));
    }
  }

  // ── 2. Fall back to Vercel API ────────────────────────────────────
  const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return NextResponse.json({
      source:     'none',
      totalCalls: 0, errorCalls: 0, errorRate: 0, avgMs: 0, p99Ms: 0,
      byEndpoint: [], byDay: [], deployments: [],
      note: 'No telemetry data yet. Add MINT_TELEMETRY_KEY to client deployment to enable tracking.',
    });
  }

  try {
    const params = new URLSearchParams({ limit: '20', target: 'production' });
    if (teamId) params.set('teamId', teamId);

    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) throw new Error(`Vercel API ${res.status}`);

    const { deployments } = await res.json() as {
      deployments: Array<{
        uid:       string;
        url:       string;
        createdAt: number;
        state:     string;
        meta?:     { githubCommitMessage?: string };
      }>;
    };

    return NextResponse.json({
      source:     'vercel_api',
      totalCalls: 0, errorCalls: 0, errorRate: 0, avgMs: 0, p99Ms: 0,
      byEndpoint: [], byDay: [],
      deployments: deployments.slice(0, 10).map((d) => ({
        id:        d.uid,
        url:       `https://${d.url}`,
        createdAt: new Date(d.createdAt).toISOString(),
        state:     d.state,
        message:   d.meta?.githubCommitMessage?.slice(0, 80) ?? null,
      })),
      note: 'Live call counts require MINT_TELEMETRY_KEY in client deployment.',
    });
  } catch (e) {
    console.error('[vercel/usage] Vercel API error', e);
    return NextResponse.json({
      source: 'none', totalCalls: 0, errorCalls: 0, errorRate: 0,
      avgMs: 0, p99Ms: 0, byEndpoint: [], byDay: [], deployments: [],
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

type TelemetryRow = { path: string; status: number; duration_ms: number | null; ts: string };

function buildTelemetryResponse(events: TelemetryRow[], source: string) {
  const totalCalls  = events.length;
  const errorCalls  = events.filter((e) => e.status >= 400).length;
  const errorRate   = totalCalls === 0 ? 0 : Math.round((errorCalls / totalCalls) * 10000) / 100;
  const durations   = events.map((e) => e.duration_ms ?? 0).filter(Boolean).sort((a, b) => a - b);
  const avgMs       = durations.length ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : 0;
  const p99Ms       = durations.length ? durations[Math.floor(durations.length * 0.99)] ?? 0 : 0;

  // Per-endpoint rollup
  const endpointMap = new Map<string, { calls: number; errors: number; durations: number[] }>();
  for (const e of events) {
    const key = e.path;
    const rec = endpointMap.get(key) ?? { calls: 0, errors: 0, durations: [] };
    rec.calls++;
    if (e.status >= 400) rec.errors++;
    if (e.duration_ms) rec.durations.push(e.duration_ms);
    endpointMap.set(key, rec);
  }
  const byEndpoint = [...endpointMap.entries()]
    .map(([path, r]) => {
      const sorted = r.durations.sort((a, b) => a - b);
      return {
        path,
        calls:  r.calls,
        errors: r.errors,
        avgMs:  sorted.length ? Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length) : 0,
        p99Ms:  sorted.length ? sorted[Math.floor(sorted.length * 0.99)] ?? 0 : 0,
      };
    })
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 20);

  // Per-day rollup
  const dayMap = new Map<string, number>();
  for (const e of events) {
    const day = e.ts.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const byDay = [...dayMap.entries()]
    .map(([date, calls]) => ({ date, calls }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { source, totalCalls, errorCalls, errorRate, avgMs, p99Ms, byEndpoint, byDay, deployments: [] };
}
