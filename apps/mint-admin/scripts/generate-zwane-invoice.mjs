/**
 * generate-zwane-invoice.mjs
 * Creates the Zwane activation invoice in Supabase and opens the printable HTML.
 *
 * Usage:
 *   node scripts/generate-zwane-invoice.mjs
 *
 * Reads credentials from .env.local automatically.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');

// ── Parse .env.local ──────────────────────────────────────────────────
function loadEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, 'utf8')
        .split('\n')
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
    );
  } catch { return {}; }
}
const env = { ...loadEnv(resolve(ROOT, '.env.local')), ...process.env };

const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Invoice data ──────────────────────────────────────────────────────
const ACTIVATION_CENTS   = 9_900_00;  // R9,900
const VAT_CENTS          = 0;         // Not a VAT vendor
const TOTAL_CENTS        = ACTIVATION_CENTS;
const REFERENCE          = 'ALGZWANE-JUN2026';
const PAYFAST_LINK       = 'PAYFAST_SUBSCRIPTION_URL_HERE'; // ← paste PayFast link here

// Due date = 30 days from today (subscription billing cycle)
const dueDate = new Date();
dueDate.setDate(dueDate.getDate() + 30);
const DUE_DATE = dueDate.toISOString().split('T')[0];

// ── Find Zwane client ─────────────────────────────────────────────────
console.log('🔍  Looking up Zwane client…');
const { data: clients } = await supabase
  .from('clients')
  .select('id, name, slug')
  .ilike('name', '%zwane%')
  .limit(5);

let client = clients?.[0] ?? null;

if (!client) {
  console.log('⚠️   No client named Zwane found — creating a placeholder…');
  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      name:               'Zwane Financial Services',
      slug:               'zwane',
      status:             'trial',
      tier:               'core',
      monthly_fee_cents:  0,
      api_quota:          500,
      contact_email:      'accounts@zwane.co.za',
    })
    .select('id, name, slug')
    .single();
  if (error) { console.error('❌  Could not create client:', error.message); process.exit(1); }
  client = created;
  console.log(`✅  Created client: ${client.name} (${client.id})`);
} else {
  console.log(`✅  Found client: ${client.name} (${client.id})`);
}

// ── Check for duplicate invoice ───────────────────────────────────────
const { data: existing } = await supabase
  .from('invoices')
  .select('id, reference')
  .eq('reference', REFERENCE)
  .maybeSingle();

let invoiceId;

if (existing) {
  console.log(`ℹ️   Invoice ${REFERENCE} already exists (${existing.id}) — regenerating HTML only.`);
  invoiceId = existing.id;
} else {
  // ── Insert invoice ────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      client_id:       client.id,
      reference:       REFERENCE,
      type:            'setup',
      status:          'draft',
      subtotal_cents:  ACTIVATION_CENTS,
      vat_cents:       VAT_CENTS,
      total_cents:     TOTAL_CENTS,
      issued_at:       now,
      due_at:          new Date(DUE_DATE).toISOString(),
      notes:           'Activation fee includes 1,000 API calls/type/month. Additional calls billed at market rate (pay-as-you-use).',
    })
    .select('id')
    .single();

  if (invErr) { console.error('❌  Invoice insert failed:', invErr.message); process.exit(1); }
  invoiceId = inv.id;

  // ── Insert line items ─────────────────────────────────────────────
  await supabase.from('invoice_line_items').insert([
    {
      invoice_id:       invoiceId,
      description:      'AlgoLend platform activation — Core tier (1,000 API calls/type/month)',
      quantity:         1,
      unit_price_cents: ACTIVATION_CENTS,
      total_cents:      ACTIVATION_CENTS,
      service:          null,
    },
  ]);

  console.log(`✅  Invoice created: ${REFERENCE} (${invoiceId})`);
}

// ── Generate printable HTML ───────────────────────────────────────────
const fmtC = (cents) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
const fmtD = (iso) => iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const now   = new Date().toISOString();
const today = fmtD(now);
const due   = fmtD(new Date(DUE_DATE).toISOString());

const logoSvg = `<svg width="34" height="38" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0">
  <path d="M5 36 L5 13 Q5 3 16 3 Q28 3 28 14 Q28 23 19 26" stroke="#7C3AED" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="18" cy="14" r="11" fill="#1a1033"/>
  <circle cx="18" cy="14" r="5" fill="#7C3AED"/>
</svg>`;

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${REFERENCE}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #fff; padding: 56px 72px; max-width: 860px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #7C3AED; margin-bottom: 36px; }
  .brand-logo { display: flex; align-items: center; gap: 10px; }
  .brand-name { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: #1a1033; }
  .brand-sub { font-size: 11px; color: #94a3b8; margin-top: 3px; }
  .inv-title { font-size: 28px; font-weight: 700; color: #7C3AED; text-align: right; }
  .inv-ref { font-size: 13px; color: #7C3AED; font-weight: 700; font-family: monospace; text-align: right; margin-top: 4px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
  .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .party-detail { font-size: 12px; color: #64748b; line-height: 1.7; }
  .dates { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 32px; }
  .date-item .dl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 3px; }
  .date-item .dv { font-size: 13px; font-weight: 600; color: #0f172a; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .items-table thead tr { background: #f8fafc; }
  .items-table th { padding: 10px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
  .items-table th.r { text-align: right; }
  .items-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; vertical-align: top; }
  .items-table td.r { text-align: right; color: #64748b; }
  .items-table td.fw { text-align: right; font-weight: 600; color: #0f172a; }
  .items-table tbody tr:last-child td { border-bottom: none; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 36px; }
  .totals { width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #64748b; }
  .totals-row .val { font-family: monospace; }
  .totals-total { display: flex; justify-content: space-between; padding: 10px 0 0 0; font-size: 17px; font-weight: 700; color: #0f172a; border-top: 2px solid #7C3AED; margin-top: 4px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 12px; }
  .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 28px; }
  .pd-item .pdl { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 2px; }
  .pd-item .pdv { font-size: 13px; font-weight: 600; color: #0f172a; }
  .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; font-size: 12px; color: #78350f; margin-bottom: 28px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #7C3AED; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 20px rgba(124,58,237,0.4); }
  @media print { body { padding: 32px 48px; } .print-btn, .no-print { display: none; } }
</style></head><body>

  <button class="print-btn" onclick="window.print()">⬇ Save as PDF</button>

  <div class="header">
    <div>
      <div class="brand-logo">${logoSvg}<span class="brand-name">AlgoLend</span></div>
      <div class="brand-sub">A product of Mint Platforms (Pty) Ltd</div>
    </div>
    <div>
      <div class="inv-title">Invoice</div>
      <div class="inv-ref">${REFERENCE}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From</div>
      <div class="party-name">Mint Platforms (Pty) Ltd</div>
      <div class="party-detail">
        3 Gwen Lane, Sandown<br>
        Sandton, 2031, South Africa
      </div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${client.name}</div>
      <div class="party-detail">
        2nd Floor, Northlands Corner Rd<br>
        Hoogland, Randburg<br>
        Johannesburg, 2169<br>
        010 500 0978<br>
        admin@zwanefin.co.za
      </div>
    </div>
  </div>

  <div class="dates">
    <div class="date-item"><div class="dl">Invoice Number</div><div class="dv">${REFERENCE}</div></div>
    <div class="date-item"><div class="dl">Invoice Date</div><div class="dv">${today}</div></div>
    <div class="date-item"><div class="dl">Due Date</div><div class="dv">${due}</div></div>
  </div>

  <div class="section-title">Platform fees</div>
  <table class="items-table">
    <thead><tr>
      <th>Description of Services</th>
      <th class="r">Qty</th>
      <th class="r">Rate (excl. VAT)</th>
      <th class="r">Amount</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>AlgoLend platform activation — Core tier<br><span style="font-size:11px;color:#94a3b8">Includes 1,000 API calls/type/month</span></td>
        <td class="r">1</td>
        <td class="r">${fmtC(ACTIVATION_CENTS)}</td>
        <td class="fw">${fmtC(ACTIVATION_CENTS)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-total"><span>Total Due</span><span>${fmtC(TOTAL_CENTS)}</span></div>
    </div>
  </div>

  <!-- PayFast subscription CTA -->
  <div style="text-align:center;margin-bottom:32px;padding:32px 24px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd;border-radius:14px;">
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#7C3AED;margin-bottom:8px;">Activate Your Subscription</p>
    <p style="font-size:13px;color:#4c1d95;margin-bottom:20px;line-height:1.6;">Click below to set up your monthly subscription via PayFast.<br>Your platform access activates automatically on payment — no manual steps required.</p>
    <a href="${PAYFAST_LINK}" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;box-shadow:0 6px 20px rgba(124,58,237,0.35);">
      Activate &amp; Pay — R 9,900.00 /mo →
    </a>
    <p style="font-size:10.5px;color:#7c6aac;margin-top:14px;">Recurring monthly subscription · Cancel anytime · Powered by PayFast</p>
  </div>

  <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 20px;font-size:11.5px;color:#3730a3;margin-bottom:28px;line-height:1.6;">
    <strong>Usage disclaimer:</strong> This activation package includes <strong>1,000 API calls/type/month</strong>. Any API calls consumed beyond the included quota are billed on a <strong>pay-as-you-use basis</strong> at the then-current AlgoLend market rate. Usage reports are available via your AlgoLend dashboard.
  </div>

  <div class="footer">
    Mint Platforms (Pty) Ltd · Reg. No. 2024/123456/07 · accounts@algolend.co.za<br>
    <span style="font-size:10px;color:#cbd5e1;">A product of Mint Platforms (Pty) Ltd</span>
  </div>

  <!-- Internal margin summary — screen only, never prints -->
  <div class="no-print" style="margin-top:40px;border:1.5px dashed #e2e8f0;border-radius:12px;padding:20px 24px;background:#f8fafc;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin-bottom:14px;">Internal — Margin Summary (not printed)</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:4px 0;color:#64748b;">Revenue</td><td style="text-align:right;font-weight:600;color:#0f172a;font-family:monospace;">R 9,900.00</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Max allowable cost (1,000 calls × R3)</td><td style="text-align:right;font-family:monospace;color:#64748b;">R 3,000.00</td></tr>
      <tr style="border-top:2px solid #7C3AED;">
        <td style="padding:8px 0 4px;font-weight:700;color:#0f172a;">Margin</td>
        <td style="text-align:right;font-weight:700;font-size:16px;color:#7C3AED;font-family:monospace;padding:8px 0 4px;">R 6,900.00</td>
      </tr>
      <tr><td style="color:#94a3b8;font-size:11px;">Margin %</td><td style="text-align:right;color:#94a3b8;font-size:11px;font-family:monospace;">69.7%</td></tr>
      <tr><td style="color:#94a3b8;font-size:11px;">Revenue per check</td><td style="text-align:right;color:#94a3b8;font-size:11px;font-family:monospace;">R 9.90</td></tr>
      <tr><td style="color:#94a3b8;font-size:11px;">Cost per check (max)</td><td style="text-align:right;color:#94a3b8;font-size:11px;font-family:monospace;">R 3.00</td></tr>
    </table>
  </div>

</body></html>`;

const outFile = resolve(ROOT, 'scripts', 'zwane-invoice.html');
writeFileSync(outFile, html, 'utf8');
console.log(`\n📄  Invoice HTML saved → ${outFile}`);
console.log('🖨   Opening in browser — click "Save as PDF" or ⌘P to print.\n');
execSync(`open "${outFile}"`);
