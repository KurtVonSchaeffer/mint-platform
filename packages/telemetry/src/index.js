/**
 * @mint/telemetry  v0.2.0
 *
 * Ships API usage events from each client deployment into the central
 * mint_telemetry Supabase project. Mint Admin reads from there.
 *
 * Required env vars per client deployment:
 *   MINT_TELEMETRY_URL    — https://<mint-admin-supabase>.supabase.co
 *   MINT_TELEMETRY_KEY    — service-role key (INSERT only, mint_telemetry schema)
 *   MINT_CLIENT_ID        — UUID from mint-admin clients table
 *
 * Optional (auto-set by Vercel):
 *   VERCEL_DEPLOYMENT_ID  — links events to a specific build
 *   VERCEL_REGION         — edge region the function ran in
 */

const { createClient } = require('@supabase/supabase-js');

const ENABLED     = Boolean(
  process.env.MINT_TELEMETRY_URL &&
  process.env.MINT_TELEMETRY_KEY &&
  process.env.MINT_CLIENT_ID,
);
const CLIENT_ID   = process.env.MINT_CLIENT_ID   ?? null;
const DEPLOY_ID   = process.env.VERCEL_DEPLOYMENT_ID ?? null;
const REGION      = process.env.VERCEL_REGION        ?? null;

let supa = null;
if (ENABLED) {
  supa = createClient(
    process.env.MINT_TELEMETRY_URL,
    process.env.MINT_TELEMETRY_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ── Batch buffer ───────────────────────────────────────────────────
// Avoids one Supabase round-trip per request — flushes every 5s or
// when 50 events accumulate.
const BATCH_MS   = 5_000;
const BATCH_SIZE = 50;
const buffer     = [];
let   flushTimer = null;

async function flush() {
  if (!buffer.length || !supa) return;
  const batch = buffer.splice(0, buffer.length);
  try {
    const { error } = await supa
      .schema('mint_telemetry')
      .from('api_events')
      .insert(batch);
    if (error) console.warn('[mint-telemetry] flush failed:', error.message);
  } catch (err) {
    console.warn('[mint-telemetry] flush exception:', err.message);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, BATCH_MS);
}

function queue(event) {
  buffer.push({
    client_id:     CLIENT_ID,
    deployment_id: DEPLOY_ID,
    region:        REGION,
    ...event,
  });
  if (buffer.length >= BATCH_SIZE) flush();
  else scheduleFlush();
}

// ── Express/ZwaneOfficial middleware ──────────────────────────────
/**
 * Mount as early as possible so it wraps every /api route.
 *
 *   const { telemetry } = require('@mint/telemetry');
 *   app.use('/api', telemetry());
 */
function telemetry(options = {}) {
  const { ignorePaths = [/\/health$/, /\/favicon/] } = options;

  return function telemetryMiddleware(req, res, next) {
    if (!ENABLED) return next();
    if (ignorePaths.some((re) => re.test(req.originalUrl))) return next();

    const t0 = Date.now();
    res.on('finish', () => {
      try {
        queue({
          method:      req.method,
          path:        req.route?.path || req.path || req.originalUrl,
          status:      res.statusCode,
          duration_ms: Date.now() - t0,
        });
      } catch { /* swallow — telemetry must never break the request path */ }
    });

    next();
  };
}

// ── Next.js App Router helper ─────────────────────────────────────
/**
 * Wrap a Next.js Route Handler to log every call automatically.
 *
 *   import { withTelemetry } from '@mint/telemetry/next';
 *
 *   export const GET = withTelemetry(async (req) => {
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * Or wrap the whole router object:
 *   export const { GET, POST } = withTelemetry({ GET: handler1, POST: handler2 });
 */
function withTelemetry(handlerOrMap) {
  if (typeof handlerOrMap === 'function') {
    return wrapOne(handlerOrMap);
  }
  // Object of { GET, POST, … }
  return Object.fromEntries(
    Object.entries(handlerOrMap).map(([method, h]) => [method, wrapOne(h)]),
  );
}

function wrapOne(handler) {
  return async function wrappedHandler(req, ctx) {
    if (!ENABLED) return handler(req, ctx);
    const t0  = Date.now();
    let status = 200;
    try {
      const res = await handler(req, ctx);
      status = res?.status ?? 200;
      return res;
    } catch (err) {
      status = 500;
      throw err;
    } finally {
      try {
        const url  = req.url ? new URL(req.url) : null;
        queue({
          method:      req.method ?? 'GET',
          path:        url?.pathname ?? '/',
          status,
          duration_ms: Date.now() - t0,
        });
      } catch { /* swallow */ }
    }
  };
}

// ── External provider call tracker ───────────────────────────────
/**
 * Log a paid external API call (Experian, TruID, DocuSeal, SureSystems).
 * These are stored separately so cost attribution is accurate.
 *
 *   await logExternal({ provider: 'experian', endpoint: 'consumer_score',
 *                        cost_zar_cents: 800, status: 'success' });
 */
async function logExternal({ provider, endpoint, cost_zar_cents = 0, reference = null, status = 'success' }) {
  if (!supa) return;
  try {
    await supa
      .schema('mint_telemetry')
      .from('external_api_calls')
      .insert({ client_id: CLIENT_ID, provider, endpoint, cost_zar_cents, reference, status });
  } catch (err) {
    console.warn('[mint-telemetry] logExternal failed:', err.message);
  }
}

// Flush on graceful shutdown
process.on('SIGTERM', flush);
process.on('SIGINT',  flush);

module.exports = { telemetry, withTelemetry, logExternal, flush };
