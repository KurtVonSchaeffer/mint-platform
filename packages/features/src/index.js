/**
 * @mint/features
 *
 * Runtime feature-flag client for AlgoLend client deployments.
 * Reads from the client's own Supabase `client_features` table.
 * Results are cached in-memory so only one DB call per TTL window.
 *
 * Required env vars (already set by setup-client-env.sh):
 *   NEXT_PUBLIC_SUPABASE_URL  — client's own Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — client's own service role key
 *   MINT_CLIENT_ID            — UUID from mint-admin clients table
 *
 * Usage — Express (ZwaneOfficial):
 *   const { features, requireFeature } = require('@mint/features');
 *   app.use('/api/truid', requireFeature('open_banking'));
 *
 * Usage — Next.js Route Handler:
 *   import { getFeatures } from '@mint/features';
 *   export async function POST(req) {
 *     const f = await getFeatures();
 *     if (!f.isEnabled('open_banking')) return new Response('Not available', { status: 403 });
 *   }
 */

const { createClient } = require('@supabase/supabase-js');

// ── Config ─────────────────────────────────────────────────────────
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_ID      = process.env.MINT_CLIENT_ID;
const CACHE_TTL_MS   = 5 * 60 * 1000;  // 5 minutes

const ENABLED = Boolean(SUPABASE_URL && SERVICE_KEY && CLIENT_ID);

if (!ENABLED) {
  console.warn(
    '[mint/features] Missing env vars — all features will return false.\n' +
    '  Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MINT_CLIENT_ID',
  );
}

let supabase = null;
if (ENABLED) {
  supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── In-memory cache ────────────────────────────────────────────────
let cache = null;       // Map<string, boolean>
let cacheAt = 0;

/**
 * Fetch and cache the feature flags for this client.
 * Returns a FeatureSet object with an `isEnabled(flag)` method.
 */
async function getFeatures() {
  if (!ENABLED) return makeFeatureSet(new Map());

  const now = Date.now();
  if (cache && (now - cacheAt) < CACHE_TTL_MS) {
    return makeFeatureSet(cache);
  }

  try {
    const { data, error } = await supabase
      .from('client_features')
      .select('flag, enabled')
      .eq('client_id', CLIENT_ID);

    if (error) throw error;

    const map = new Map((data ?? []).map(r => [r.flag, r.enabled]));
    cache  = map;
    cacheAt = now;
    return makeFeatureSet(map);
  } catch (err) {
    console.warn('[mint/features] fetch failed:', err.message);
    // Return stale cache on error, or empty set if no cache exists
    return makeFeatureSet(cache ?? new Map());
  }
}

/**
 * Synchronous check — only safe to call after getFeatures() has been
 * awaited at least once (returns false if cache is empty).
 */
function isEnabled(flag) {
  return cache?.get(flag) ?? false;
}

/**
 * Bust the cache — call this if you want features to refresh immediately
 * (e.g. after receiving a webhook from mint-admin).
 */
function invalidateCache() {
  cache  = null;
  cacheAt = 0;
}

// ── Express middleware ─────────────────────────────────────────────
/**
 * Gate an Express route behind a feature flag.
 * Returns 403 if the flag is disabled.
 *
 *   app.use('/api/truid',     requireFeature('open_banking'));
 *   app.use('/api/experian',  requireFeature('credit_scoring'));
 *   app.use('/api/docuseal',  requireFeature('e_contracts'));
 *   app.use('/api/sacrra',    requireFeature('sacrra_bureau'));
 *   app.use('/api/sure',      requireFeature('sure_systems'));
 *   app.use('/api/branches',  requireFeature('multi_branch'));
 */
function requireFeature(flag) {
  return async function featureGate(req, res, next) {
    const f = await getFeatures();
    if (f.isEnabled(flag)) return next();
    return res.status(403).json({
      error:   'feature_disabled',
      message: `The '${flag}' feature is not enabled for your account. Contact Mint Platforms to activate it.`,
      feature: flag,
    });
  };
}

/**
 * Express middleware that loads all features and attaches them to req.
 * Mount this near the top of your app so every route handler can use
 * req.features.isEnabled('open_banking') synchronously.
 *
 *   app.use(attachFeatures());
 *   // then in any route:
 *   if (!req.features.isEnabled('whatsapp_notify')) { ... }
 */
function attachFeatures() {
  return async function featureAttach(req, res, next) {
    req.features = await getFeatures();
    next();
  };
}

// ── Helpers ────────────────────────────────────────────────────────
function makeFeatureSet(map) {
  return {
    isEnabled:  (flag) => map.get(flag) === true,
    isDisabled: (flag) => !map.get(flag),
    all:        () => Object.fromEntries(map),
    enabled:    () => [...map.entries()].filter(([, v]) => v).map(([k]) => k),
  };
}

module.exports = { getFeatures, isEnabled, invalidateCache, requireFeature, attachFeatures };
