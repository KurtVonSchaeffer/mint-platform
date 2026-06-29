/**
 * PayFast payment gateway utilities.
 *
 * Handles signature generation, payment form building, and ITN verification
 * for both one-off invoice payments and monthly recurring subscriptions.
 *
 * Env vars required:
 *   PAYFAST_MERCHANT_ID   — from PayFast dashboard
 *   PAYFAST_MERCHANT_KEY  — from PayFast dashboard
 *   PAYFAST_PASSPHRASE    — set in PayFast account security settings
 *   PAYFAST_SANDBOX       — "true" to use sandbox (default false)
 *   NEXT_PUBLIC_APP_URL   — e.g. https://admin.algolend.co.za
 */

import crypto from 'crypto';

export const PAYFAST_HOST = process.env.PAYFAST_SANDBOX === 'true'
  ? 'https://sandbox.payfast.co.za'
  : 'https://www.payfast.co.za';

export const PAYFAST_PROCESS_URL = `${PAYFAST_HOST}/eng/process`;
export const PAYFAST_VALIDATE_URL = `${PAYFAST_HOST}/eng/query/validate`;

/* PayFast sends ITN from these IP ranges */
export const PAYFAST_IPS = [
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
  '41.74.179.198',
  '127.0.0.1', // sandbox / local
];

/* ── Signature ──────────────────────────────────────────────────── */
export function buildSignature(params: Record<string, string>, passphrase?: string): string {
  // Build query string in field order, excluding 'signature'
  const pairs = Object.entries(params)
    .filter(([k]) => k !== 'signature' && params[k] !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');

  const str = passphrase
    ? `${pairs}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : pairs;

  return crypto.createHash('md5').update(str).digest('hex');
}

/* ── Base merchant fields ────────────────────────────────────────── */
function merchantFields(): Record<string, string> {
  return {
    merchant_id:  process.env.PAYFAST_MERCHANT_ID  ?? '',
    merchant_key: process.env.PAYFAST_MERCHANT_KEY ?? '',
  };
}

function returnUrls(invoiceId: string): Record<string, string> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.algolend.co.za').replace(/\/$/, '');
  return {
    return_url: `${base}/invoices?pf_status=complete&inv=${invoiceId}`,
    cancel_url: `${base}/invoices?pf_status=cancelled&inv=${invoiceId}`,
    notify_url: `${base}/api/payfast/notify`,
  };
}

/* ── One-off payment ─────────────────────────────────────────────── */
export interface OneOffParams {
  invoiceId:     string;
  reference:     string;
  clientName:    string;
  contactEmail:  string;
  amountCents:   number; // total incl VAT, ZAR cents
}

export function buildOneOffForm(p: OneOffParams): Record<string, string> {
  const amount = (p.amountCents / 100).toFixed(2);
  const params: Record<string, string> = {
    ...merchantFields(),
    ...returnUrls(p.invoiceId),
    m_payment_id:    p.invoiceId,
    amount,
    item_name:       `AlgoLend Invoice ${p.reference}`,
    item_description: `Platform invoice for ${p.clientName}`,
    name_first:      p.clientName.split(' ')[0] ?? p.clientName,
    name_last:       p.clientName.split(' ').slice(1).join(' ') || p.clientName,
    email_address:   p.contactEmail,
    email_confirmation: '1',
    confirmation_address: process.env.ADMIN_NOTIFY_EMAIL ?? 'billing@mintplatforms.co.za',
  };
  params.signature = buildSignature(params, process.env.PAYFAST_PASSPHRASE);
  return params;
}

/* ── Subscription (recurring monthly) ───────────────────────────── */
export interface SubscriptionParams {
  clientId:      string;
  clientName:    string;
  contactEmail:  string;
  monthlyAmountCents: number; // ZAR cents, excl VAT — PayFast collects the gross
  billingDate?:  string;      // YYYY-MM-DD, defaults to today
}

export function buildSubscriptionForm(p: SubscriptionParams): Record<string, string> {
  const amount = (p.monthlyAmountCents / 100).toFixed(2);
  // Use a placeholder invoice ID for the initial sub setup; real invoice matched by client_id in ITN
  const pseudoInvoiceId = `sub-${p.clientId}`;
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.algolend.co.za').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const params: Record<string, string> = {
    ...merchantFields(),
    return_url: `${base}/clients/${p.clientId}?pf_status=subscribed`,
    cancel_url: `${base}/clients/${p.clientId}?pf_status=cancelled`,
    notify_url: `${base}/api/payfast/notify`,
    m_payment_id:        pseudoInvoiceId,
    amount,
    item_name:           `AlgoLend Monthly Subscription — ${p.clientName}`,
    item_description:    'Recurring monthly platform licence fee',
    name_first:          p.clientName.split(' ')[0] ?? p.clientName,
    name_last:           p.clientName.split(' ').slice(1).join(' ') || p.clientName,
    email_address:       p.contactEmail,
    email_confirmation:  '1',
    confirmation_address: process.env.ADMIN_NOTIFY_EMAIL ?? 'billing@mintplatforms.co.za',
    // Subscription fields
    subscription_type:   '1',
    billing_date:        p.billingDate ?? today,
    recurring_amount:    amount,
    frequency:           '3',  // 3 = monthly
    cycles:              '0',  // 0 = recurring indefinitely
  };
  params.signature = buildSignature(params, process.env.PAYFAST_PASSPHRASE);
  return params;
}

/* ── ITN verification ────────────────────────────────────────────── */
export interface ITNData {
  m_payment_id?:    string;
  pf_payment_id?:   string;
  payment_status?:  string;
  item_name?:       string;
  amount_gross?:    string;
  amount_fee?:      string;
  amount_net?:      string;
  merchant_id?:     string;
  token?:           string;   // subscription token — returned on first sub payment
  billing_date?:    string;
  [key: string]:    string | undefined;
}

export async function verifyITN(data: ITNData, sourceIp: string): Promise<{ valid: boolean; reason?: string }> {
  // 1. IP check (relaxed in sandbox)
  if (process.env.PAYFAST_SANDBOX !== 'true' && !PAYFAST_IPS.includes(sourceIp)) {
    return { valid: false, reason: `Untrusted IP: ${sourceIp}` };
  }

  // 2. Rebuild & verify signature
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const received   = data.signature;
  const dataNoSig  = { ...data };
  delete dataNoSig.signature;
  const expected   = buildSignature(dataNoSig as Record<string, string>, passphrase);
  if (received && received !== expected) {
    return { valid: false, reason: 'Signature mismatch' };
  }

  // 3. Post back to PayFast to confirm
  try {
    const body = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');

    const res = await fetch(PAYFAST_VALIDATE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'AlgoLend/1.0' },
      body,
    });
    const text = await res.text();
    if (!text.startsWith('VALID')) {
      return { valid: false, reason: `PayFast validation: ${text}` };
    }
  } catch (err) {
    return { valid: false, reason: `Validation request failed: ${String(err)}` };
  }

  // 4. Payment must be COMPLETE
  if (data.payment_status !== 'COMPLETE') {
    return { valid: false, reason: `Payment status: ${data.payment_status}` };
  }

  return { valid: true };
}
