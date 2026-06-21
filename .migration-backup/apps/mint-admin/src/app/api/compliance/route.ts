import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkSite(url: string): Promise<{ up: boolean; latencyMs: number }> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    return { up: res.ok || res.status < 500, latencyMs: Date.now() - t0 };
  } catch {
    return { up: false, latencyMs: Date.now() - t0 };
  }
}

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [clientsRes, profilesRes, usageRes] = await Promise.all([
    supabaseAdmin
      .from('clients')
      .select('id, name, slug, tier, status, contact_email, subdomain, domain')
      .is('deleted_at', null)
      .in('status', ['active', 'trial'])
      .order('name'),

    supabaseAdmin
      .from('profiles')
      .select('client_id, id, updated_at')
      .is('deleted_at', null)
      .neq('role', 'super_admin'),

    supabaseAdmin
      .from('usage_logs')
      .select('client_id, quantity')
      .gte('occurred_at', monthStart),
  ]);

  const clients = clientsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const usage = usageRes.data ?? [];

  // Group profiles by client_id
  const profilesByClient = profiles.reduce<Record<string, { total: number; active7d: number; lastSeen: string | null }>>((acc, p) => {
    if (!p.client_id) return acc;
    if (!acc[p.client_id]) acc[p.client_id] = { total: 0, active7d: 0, lastSeen: null };
    acc[p.client_id].total++;
    if (p.updated_at >= sevenDaysAgo) acc[p.client_id].active7d++;
    if (!acc[p.client_id].lastSeen || p.updated_at > acc[p.client_id].lastSeen!) {
      acc[p.client_id].lastSeen = p.updated_at;
    }
    return acc;
  }, {});

  // Sum usage by client_id
  const usageByClient = usage.reduce<Record<string, number>>((acc, u) => {
    acc[u.client_id] = (acc[u.client_id] ?? 0) + (u.quantity ?? 0);
    return acc;
  }, {});

  // Site checks — run all concurrently
  const siteChecks = await Promise.all(
    clients.map((c) => {
      const url = c.domain
        ? `https://${c.domain}`
        : `https://${c.subdomain ?? c.slug}.algolend.co.za`;
      return checkSite(url).then((r) => ({ id: c.id, url, ...r }));
    }),
  );
  const siteById = Object.fromEntries(siteChecks.map((s) => [s.id, s]));

  const result = clients.map((c) => ({
    id:                 c.id,
    name:               c.name,
    slug:               c.slug,
    tier:               c.tier,
    status:             c.status,
    contact_email:      c.contact_email,
    siteUrl:            siteById[c.id]?.url ?? '',
    siteUp:             siteById[c.id]?.up ?? false,
    latencyMs:          siteById[c.id]?.latencyMs ?? 0,
    totalUsers:         profilesByClient[c.id]?.total ?? 0,
    activeUsers7d:      profilesByClient[c.id]?.active7d ?? 0,
    lastActivity:       profilesByClient[c.id]?.lastSeen ?? null,
    apiCallsThisMonth:  usageByClient[c.id] ?? 0,
  }));

  return NextResponse.json({ clients: result, checkedAt: now.toISOString() });
}
