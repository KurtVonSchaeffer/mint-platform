import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SERVICE_RATES } from '@/lib/billing';
import { sendEmail, quotaWarningEmail, quotaExceededEmail } from '@/lib/email';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_SERVICES = new Set([
  'trueid_lookup','experian_score','docuseal_envelope','sacrra_submission',
  'sure_systems_pull','sms_outbound','email_outbound',
  'loan_registered','loan_disbursed','api_call',
  'cipc','bureau','banking','contracts','liveness','homeaff','watchlist','address',
]);

interface LogBody {
  client_id?:      string;   // dev fallback only — use API key in production
  service:         string;
  quantity?:       number;
  cost_cents?:     number;
  metadata?:       Record<string, unknown>;
  application_id?: string;
  loan_id?:        string;
  user_id?:        string;
}

async function resolveClient(req: NextRequest, bodyClientId?: string) {
  // Prefer Bearer token auth
  const auth = req.headers.get('authorization') ?? '';
  const rawKey = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;

  if (rawKey) {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const { data: keyRow } = await supabaseAdmin
      .from('client_api_keys')
      .select('client_id, id')
      .eq('key_hash', hash)
      .is('revoked_at', null)
      .single();

    if (!keyRow) return { error: 'Invalid or revoked API key', status: 401 };

    // Update last_used_at (fire-and-forget)
    void supabaseAdmin.from('client_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id);

    return { clientId: keyRow.client_id };
  }

  // Dev fallback: accept client_id in body (non-production only)
  if (process.env.NODE_ENV !== 'production' && bodyClientId) {
    return { clientId: bodyClientId };
  }

  return { error: 'Authorization header with API key required', status: 401 };
}

export async function POST(req: NextRequest) {
  let body: LogBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { service, quantity = 1, cost_cents, metadata, application_id, loan_id, user_id } = body;

  // Resolve client from API key or dev fallback
  const resolved = await resolveClient(req, body.client_id);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const client_id = resolved.clientId;

  if (!service) return NextResponse.json({ error: 'service is required' }, { status: 422 });
  if (!VALID_SERVICES.has(service)) return NextResponse.json({ error: `Unknown service "${service}"` }, { status: 422 });
  if (quantity < 1 || quantity > 10000) return NextResponse.json({ error: 'quantity must be 1–10000' }, { status: 422 });

  // Fetch client
  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients')
    .select('id, name, slug, contact_email, contact_name, api_quota, status, tier')
    .eq('id', client_id)
    .is('deleted_at', null)
    .single();

  if (clientErr || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if (client.status === 'suspended' || client.status === 'churned')
    return NextResponse.json({ error: 'Client account is not active' }, { status: 403 });

  const quota: number = client.api_quota ?? 10000;

  // Real-time usage count
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const { data: usageRows, error: usageErr } = await supabaseAdmin
    .from('usage_logs').select('quantity')
    .eq('client_id', client_id).gte('occurred_at', monthStart.toISOString());

  if (usageErr) return NextResponse.json({ error: 'Failed to check quota' }, { status: 500 });

  const usedThisMonth = (usageRows ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  const remaining = quota - usedThisMonth;

  const resetDate = new Date(monthStart);
  resetDate.setMonth(resetDate.getMonth() + 1);
  const resetTimestamp = Math.floor(resetDate.getTime() / 1000);

  const rateLimitHeaders = {
    'X-RateLimit-Limit':     String(quota),
    'X-RateLimit-Remaining': String(Math.max(0, remaining - quantity)),
    'X-RateLimit-Reset':     String(resetTimestamp),
    'X-RateLimit-Used':      String(usedThisMonth),
  };

  const isOverage = remaining <= 0;

  // First call past quota: notify client that overage billing has started
  if (isOverage && remaining === 0) {
    sendEmail({ to: client.contact_email, subject: `API overage billing started — ${client.name}`,
      html: quotaExceededEmail({ clientName: client.name, contact: client.contact_name ?? client.contact_email.split('@')[0], slug: client.slug, used: usedThisMonth, limit: quota }) }).catch(() => {});
  }

  const computedCost = cost_cents ?? (SERVICE_RATES[service] ?? 0) * quantity;

  const { error: insertErr } = await supabaseAdmin.from('usage_logs').insert({
    client_id, service, quantity, cost_cents: computedCost,
    metadata: { ...(metadata ?? {}), ...(isOverage ? { is_overage: true } : {}) },
    application_id: application_id ?? null,
    loan_id: loan_id ?? null, user_id: user_id ?? null,
    occurred_at: new Date().toISOString(),
  });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const usedAfter  = usedThisMonth + quantity;
  const pctAfter   = Math.round((usedAfter / quota) * 100);
  const pctBefore  = Math.round((usedThisMonth / quota) * 100);
  if (pctBefore < 80 && pctAfter >= 80) {
    sendEmail({ to: client.contact_email, subject: `⚠️ API quota at ${pctAfter}% — ${client.name}`,
      html: quotaWarningEmail({ clientName: client.name, contact: client.contact_name ?? client.contact_email.split('@')[0], slug: client.slug, used: usedAfter, limit: quota, pct: pctAfter }) }).catch(() => {});
  }

  return NextResponse.json(
    { logged: true, quota, used: usedAfter, remaining: Math.max(0, remaining - quantity), resets_at: resetDate.toISOString(), ...(isOverage ? { overage: true, overage_cost_cents: computedCost } : {}) },
    { status: 201, headers: rateLimitHeaders },
  );
}
