/**
 * Centralised API usage logger for billing.
 * Wraps external API calls (Experian, TruID, DocuSeal, SureSystems) and
 * writes a row to `api_usage_log` after each call completes or fails.
 *
 * client_id is read from CLIENT_ID env var, falling back to
 * COMPANY_NAME → 'default'. Set CLIENT_ID per deployment so the
 * mint-admin billing engine can aggregate by tenant.
 *
 * Quota enforcement:
 *   API_QUOTA env var sets the monthly call limit (default 10 000).
 *   QUOTA_ALERT_EMAIL is the address that receives 80%/100% alerts.
 *   tracked() will throw a QuotaExceededError before the external call
 *   when the limit is reached, and fire alert emails at 80% and 100%.
 */

const { supabaseService } = require('../config/supabaseServer');

const CLIENT_ID = (
  process.env.CLIENT_ID ||
  process.env.COMPANY_NAME ||
  'default'
).toLowerCase().replace(/\s+/g, '-');

const QUOTA          = parseInt(process.env.API_QUOTA  || '10000', 10);
const ALERT_EMAIL    = process.env.QUOTA_ALERT_EMAIL   || null;
const RESEND_API_KEY = process.env.RESEND_API_KEY      || null;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL   || 'AlgoLend <noreply@mintplatforms.co.za>';

// ── Quota usage cache (refreshed every 5 minutes) ──────────────────────
let _quotaCache   = null;  // { count: number, fetchedAt: number }
const CACHE_TTL   = 5 * 60 * 1000;

async function getMonthlyUsageCount() {
  const now = Date.now();
  if (_quotaCache && (now - _quotaCache.fetchedAt) < CACHE_TTL) {
    return _quotaCache.count;
  }
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count, error } = await supabaseService
      .from('api_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', CLIENT_ID)
      .gte('created_at', monthStart.toISOString());

    if (error) throw error;
    _quotaCache = { count: count ?? 0, fetchedAt: now };
    return _quotaCache.count;
  } catch (err) {
    console.warn('[apiUsageLogger] quota check failed:', err?.message);
    return 0;
  }
}

function invalidateQuotaCache() {
  if (_quotaCache) _quotaCache.count += 1;  // optimistic increment
}

// ── Email alerts ────────────────────────────────────────────────────────
const _alertSent = { warn: false, exceeded: false };

async function sendQuotaAlert(type, used, limit) {
  if (!ALERT_EMAIL || !RESEND_API_KEY) {
    console.warn(`[quota] ${type} alert would fire (${used}/${limit}) — QUOTA_ALERT_EMAIL or RESEND_API_KEY not set`);
    return;
  }
  const isExceeded = type === 'exceeded';
  const pct = Math.round((used / limit) * 100);
  const subject = isExceeded
    ? `🚨 API quota exhausted — ${CLIENT_ID} (${used.toLocaleString()}/${limit.toLocaleString()} calls)`
    : `⚠️ API quota at ${pct}% — ${CLIENT_ID} (${used.toLocaleString()}/${limit.toLocaleString()} calls)`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:${isExceeded ? '#dc2626' : '#d97706'};padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">${isExceeded ? '🚨 Quota Exhausted' : '⚠️ Quota Warning'}</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">${CLIENT_ID} · AlgoLend Platform</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;margin:0 0 16px">
      ${isExceeded
        ? `The deployment <strong>${CLIENT_ID}</strong> has reached its monthly API quota. All further external API calls are <strong>blocked</strong> until the quota is increased or the month resets.`
        : `The deployment <strong>${CLIENT_ID}</strong> has used <strong>${pct}%</strong> of its monthly API quota.`}
    </p>
    <div style="background:${isExceeded ? '#fef2f2' : '#fffbeb'};border:1px solid ${isExceeded ? '#fecaca' : '#fde68a'};border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:36px;font-weight:700;color:${isExceeded ? '#dc2626' : '#d97706'};margin:0">${pct}%</p>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${used.toLocaleString()} of ${limit.toLocaleString()} calls used this month</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6">
      ${isExceeded
        ? 'Log in to <strong>AlgoLend Admin</strong> → Clients → top up the quota to restore service immediately.'
        : 'You may want to top up the quota before the month ends to avoid service interruption.'}
    </p>
    <div style="margin-top:24px;text-align:center">
      <a href="https://admin.algolend.co.za/clients" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
        Manage Quota →
      </a>
    </div>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: FROM_EMAIL, to: ALERT_EMAIL, subject, html }),
    });
    console.log(`[quota] ${type} alert sent to ${ALERT_EMAIL}`);
  } catch (err) {
    console.warn('[quota] email send failed:', err?.message);
  }
}

// ── QuotaExceededError ──────────────────────────────────────────────────
class QuotaExceededError extends Error {
  constructor(used, limit) {
    super(`Monthly API quota exhausted (${used}/${limit} calls). Top up via AlgoLend Admin.`);
    this.name    = 'QuotaExceededError';
    this.used    = used;
    this.limit   = limit;
    this.status  = 402;
    this.code    = 'QUOTA_EXCEEDED';
  }
}

// ── logApiCall ──────────────────────────────────────────────────────────
/**
 * Log a completed external API call.
 * @param {object} params
 * @param {'experian'|'truid'|'docuseal'|'suresystems'} params.service
 * @param {string}  params.operation
 * @param {'success'|'error'|'timeout'} params.status
 * @param {number}  [params.latencyMs]
 * @param {number}  [params.httpStatus]
 * @param {string}  [params.applicationId]
 * @param {string}  [params.userId]
 * @param {string}  [params.errorMessage]
 * @param {object}  [params.metadata]
 */
async function logApiCall({
  service, operation, status, latencyMs, httpStatus,
  applicationId, userId, errorMessage, metadata,
}) {
  try {
    await supabaseService.from('api_usage_log').insert({
      client_id:      CLIENT_ID,
      service,
      operation,
      status,
      http_status:    httpStatus    ?? null,
      latency_ms:     latencyMs     ?? null,
      application_id: applicationId ? String(applicationId) : null,
      user_id:        userId        ?? null,
      error_message:  errorMessage  ?? null,
      metadata:       metadata      ?? null,
    });
    invalidateQuotaCache();
  } catch (err) {
    console.warn('[apiUsageLogger] write failed:', err?.message || err);
  }
}

// ── tracked ─────────────────────────────────────────────────────────────
/**
 * Wrap an async function that calls an external API.
 * Checks quota before running. Measures latency and logs success/error.
 * Fires email alerts at 80% and 100% quota usage.
 *
 * @param {object}   opts
 * @param {string}   opts.service
 * @param {string}   opts.operation
 * @param {string}   [opts.applicationId]
 * @param {string}   [opts.userId]
 * @param {object}   [opts.metadata]
 * @param {Function} fn
 * @returns {Promise<*>}
 */
async function tracked(opts, fn) {
  // ── Quota pre-check ──────────────────────────────────────────────────
  const used = await getMonthlyUsageCount();

  if (used >= QUOTA) {
    if (!_alertSent.exceeded) {
      _alertSent.exceeded = true;
      sendQuotaAlert('exceeded', used, QUOTA).catch(() => {});
    }
    const err = new QuotaExceededError(used, QUOTA);
    logApiCall({ ...opts, status: 'error', errorMessage: err.message });
    throw err;
  }

  // Fire 80% warning once per process lifetime
  if (!_alertSent.warn && used >= QUOTA * 0.8) {
    _alertSent.warn = true;
    sendQuotaAlert('warning', used, QUOTA).catch(() => {});
  }

  // ── Execute and log ──────────────────────────────────────────────────
  const start = Date.now();
  try {
    const result    = await fn();
    const latencyMs = Date.now() - start;
    const httpStatus = result?.status || result?.statusCode || null;
    logApiCall({ ...opts, status: 'success', latencyMs, httpStatus });
    return result;
  } catch (err) {
    const latencyMs  = Date.now() - start;
    const httpStatus = err?.response?.status || err?.status || null;
    const errorMessage = err?.response?.data?.error || err?.message || String(err);
    logApiCall({ ...opts, status: 'error', latencyMs, httpStatus, errorMessage });
    throw err;
  }
}

// ── resetAlertFlags (called by rollup cron at month start) ──────────────
function resetAlertFlags() {
  _alertSent.warn     = false;
  _alertSent.exceeded = false;
  _quotaCache         = null;
}

module.exports = { logApiCall, tracked, CLIENT_ID, QUOTA, getMonthlyUsageCount, resetAlertFlags, QuotaExceededError };
