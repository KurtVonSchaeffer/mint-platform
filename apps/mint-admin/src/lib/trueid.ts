/**
 * Server-side TruID API client.
 *
 * Adapted from ZwaneOfficial/services/truidService.js — rewritten for
 * Next.js App Router (native fetch, no axios, no CommonJS).
 *
 * Env vars required:
 *   TRUID_API_KEY           — Ocp-Apim-Subscription-Key header value
 *   TRUID_COMPANY_ID        — (also reads COMPANY_ID as fallback)
 *   TRUID_BRAND_ID          — (also reads BRAND_ID as fallback)
 *   TRUID_API_BASE          — default https://api.truidconnect.io
 *   TRUID_CONSUMER_DOMAIN   — default www.hello.truidconnect.io
 */

const env = (key: string, fallback?: string) =>
  process.env[key] ?? process.env[`VITE_${key}`] ?? fallback ?? '';

const BASE   = env('TRUID_API_BASE', 'https://api.truidconnect.io').replace(/\/$/, '');
const DOMAIN = env('TRUID_CONSUMER_DOMAIN', 'www.hello.truidconnect.io');

const COMPLETE_STATUSES = new Set([
  'connected', 'verified', 'completed', 'success',
  'approved', 'data_ready', 'ready',
]);

/* ─── Types ──────────────────────────────────────────────────────── */

export interface TruIDCollection {
  collectionId: string;
  consentId:    string;
  consumerUrl:  string;
  status:       string;
}

export interface TruIDAffordability {
  status:             'pending' | 'complete' | 'failed';
  collectionId:       string;
  monthlyIncome:      number | null;
  monthlyExpenses:    number | null;
  netMonthlyIncome:   number | null;
  salaryDate:         string | null;
  affordabilityScore: number | null;   // 0–100
  maxRecommendedLoan: number | null;   // based on 30% DSR over 24 months
  incomePayload:      unknown;
  transactionsPayload: unknown;
}

/* ─── HTTP helper ─────────────────────────────────────────────────── */

async function truidFetch(
  apiType: 'consultant-api' | 'delivery-api',
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const apiKey = env('TRUID_API_KEY');
  if (!apiKey) throw new Error('TRUID_API_KEY is not set');

  const url = `${BASE}/${apiType}/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    // Don't cache — always need live status
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TruID ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

/* ─── Create collection (initiates consent flow) ─────────────────── */

export async function createCollection(opts: {
  name?:      string;
  idNumber?:  string;
  email?:     string;
  mobile?:    string;
}): Promise<TruIDCollection> {
  const companyId = env('TRUID_COMPANY_ID', env('COMPANY_ID'));
  const brandId   = env('TRUID_BRAND_ID',   env('BRAND_ID'));

  if (!companyId) throw new Error('TRUID_COMPANY_ID is not set');
  if (!brandId)   throw new Error('TRUID_BRAND_ID is not set');

  const payload: Record<string, unknown> = {
    companyId,
    brandId,
    products: ['income', 'transactions', 'summary'],
    auto: true,
  };
  if (opts.name)     payload.name     = opts.name;
  if (opts.idNumber) payload.idNumber = opts.idNumber;
  if (opts.email)    payload.email    = opts.email;
  if (opts.mobile)   payload.mobile   = opts.mobile;

  const data = await truidFetch('consultant-api', 'POST', '/collections', payload) as {
    id?: string;
    collectionId?: string;
    consentId?: string;
    consents?: { id: string }[];
    status?: string;
    state?: string;
  };

  const collectionId = data.id ?? data.collectionId ?? '';
  const consentId    = data.consentId ?? data.consents?.[0]?.id ?? '';
  const consumerUrl  = `https://${DOMAIN}/consents/${consentId}`;

  return { collectionId, consentId, consumerUrl, status: data.status ?? data.state ?? 'created' };
}

/* ─── Poll collection status ─────────────────────────────────────── */

export async function getCollectionStatus(collectionId: string): Promise<{
  complete: boolean;
  status:   string;
}> {
  const data = await truidFetch('consultant-api', 'GET', `/collections/${collectionId}`) as {
    status?: string;
    state?:  string;
  };
  const status = (data.status ?? data.state ?? 'pending').toLowerCase();
  return { complete: COMPLETE_STATUSES.has(status), status };
}

/* ─── Fetch income + transaction data ───────────────────────────── */

export async function getAffordabilityData(collectionId: string): Promise<TruIDAffordability> {
  // Fetch income + summary products in parallel; transactions optional
  const [incomeRaw, summaryRaw] = await Promise.all([
    truidFetch('delivery-api', 'GET', `/collections/${collectionId}/products/income`)
      .catch(() => null),
    truidFetch('delivery-api', 'GET', `/collections/${collectionId}/products/summary`)
      .catch(() => null),
  ]);

  const income  = (incomeRaw  as Record<string, unknown>) ?? {};
  const summary = (summaryRaw as Record<string, unknown>) ?? {};
  const merged  = { ...summary, ...income };

  // Extract key figures using the same hint-based approach as ZwaneOfficial
  const monthlyIncome   = pickNum(merged, ['monthly_income', 'avg_monthly_income', 'average_monthly_income', 'total_income', 'salary', 'income', 'netincome']);
  const monthlyExpenses = pickNum(merged, ['monthly_expenses', 'avg_monthly_expenses', 'total_expenses', 'expenses']);
  const netMonthlyIncome = monthlyIncome !== null && monthlyExpenses !== null
    ? monthlyIncome - monthlyExpenses
    : pickNum(merged, ['net_monthly_income', 'net_income', 'netincome']);

  const salaryDate = pickDate(merged, ['salary_date', 'salarydate', 'paydate', 'next_salary', 'nextsalary']);

  // Affordability score: proportion of income that is "free" after expenses
  const affordabilityScore = netMonthlyIncome !== null && monthlyIncome !== null && monthlyIncome > 0
    ? Math.min(100, Math.round((netMonthlyIncome / monthlyIncome) * 100))
    : null;

  // Max loan: 30% DSR applied to net monthly income over 24-month horizon
  const DSR = 0.30;
  const TERM = 24;
  const maxRecommendedLoan = netMonthlyIncome !== null && netMonthlyIncome > 0
    ? Math.round(netMonthlyIncome * DSR * TERM)
    : null;

  return {
    status:             'complete',
    collectionId,
    monthlyIncome,
    monthlyExpenses,
    netMonthlyIncome,
    salaryDate,
    affordabilityScore,
    maxRecommendedLoan,
    incomePayload:       incomeRaw,
    transactionsPayload: null,
  };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = findDeep(obj, key);
    if (v !== undefined) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function pickDate(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = findDeep(obj, key);
    if (v && typeof v === 'string' && v.length >= 8) return v;
  }
  return null;
}

/** Case-insensitive deep key search */
function findDeep(obj: unknown, targetKey: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const lk = targetKey.toLowerCase();
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k.toLowerCase() === lk) return v;
    const nested = findDeep(v, targetKey);
    if (nested !== undefined) return nested;
  }
  return undefined;
}
