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

// ── Invoice totals ────────────────────────────────────────────────────
const TOTAL_CENTS   = 9_900_00;   // R9,900.00
const VAT_CENTS     = 0;          // Not a VAT vendor yet
const REFERENCE     = 'ALGZWANE-JUN2026';

// ── Cost breakdown (must sum to TOTAL_CENTS) ─────────────────────────
// Each item: description, quantity, unit_price_cents, total_cents, service (optional)
// service codes: 'bureau', 'banking', 'contracts', 'sure_systems_pull',
//                'sms_outbound', 'email_outbound', 'api_call', null (platform)
const LINE_ITEMS = [
  {
    description:      'Server hosting, core labour and server costs',
    detail:           'Admin console, borrower portal, rule engine, audit trail, cloud infrastructure and technical operations',
    quantity:         1,
    unit_price_cents: 4_750_00,
    total_cents:      4_750_00,
    service:          null,
  },
  {
    description:      'Infrastructure & hosting — Vercel + Supabase',
    detail:           'Cloud hosting, PostgreSQL database, auth, file storage',
    quantity:         1,
    unit_price_cents: 2_500_00,
    total_cents:      2_500_00,
    service:          null,
  },
  {
    description:      'E-signature loan contracts — DocuSeal',
    detail:           'Digital loan agreement sent to borrower per approval',
    quantity:         2_000,
    unit_price_cents: 25,
    total_cents:      500_00,
    service:          'contracts',
  },
  {
    description:      'SACRRA automated engine — MOVEit / Experian',
    detail:           'Monthly MFT batch submission of regulated loan data to SACRRA credit bureau',
    quantity:         1,
    unit_price_cents: 950_00,
    total_cents:      950_00,
    service:          'sacrra_submission',
  },
  {
    description:      'Debit order integration and tracking — SureSystems',
    detail:           'Mandate creation, tracking, and repayment processing',
    quantity:         1,
    unit_price_cents: 800_00,
    total_cents:      800_00,
    service:          'sure_systems_pull',
  },
  {
    description:      'Notifications bundle — SMS + Email',
    detail:           'BulkSMS + Resend transactional email (1,000 messages/month)',
    quantity:         1_000,
    unit_price_cents: 40,
    total_cents:      400_00,
    service:          'sms_outbound',
  },
];

// Sanity check
const lineTotal = LINE_ITEMS.reduce((s, l) => s + l.total_cents, 0);
if (lineTotal !== TOTAL_CENTS) {
  console.error(`❌  Line items total ${lineTotal / 100} but TOTAL_CENTS is ${TOTAL_CENTS / 100}. Fix the breakdown.`);
  process.exit(1);
}

// Due date = 30 days from today
const dueDate = new Date();
dueDate.setDate(dueDate.getDate() + 30);
const DUE_DATE = dueDate.toISOString().split('T')[0];

// ── Find or create Zwane client ───────────────────────────────────────
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
      contact_email:      'admin@zwanefin.co.za',
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
  console.log(`ℹ️   Invoice ${REFERENCE} already exists (${existing.id}) — refreshing line items…`);
  invoiceId = existing.id;
  // Delete old line items and re-insert with the new breakdown
  await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId);
} else {
  const now = new Date().toISOString();
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      client_id:       client.id,
      reference:       REFERENCE,
      type:            'setup',
      status:          'draft',
      subtotal_cents:  TOTAL_CENTS,
      vat_cents:       VAT_CENTS,
      total_cents:     TOTAL_CENTS,
      issued_at:       now,
      due_at:          new Date(DUE_DATE).toISOString(),
      notes:           'Monthly subscription. Included quotas reset on the 1st of each month. Additional usage billed at pay-as-you-use rates.',
    })
    .select('id')
    .single();

  if (invErr) { console.error('❌  Invoice insert failed:', invErr.message); process.exit(1); }
  invoiceId = inv.id;
  console.log(`✅  Invoice created: ${REFERENCE} (${invoiceId})`);
}

// ── Insert line items ─────────────────────────────────────────────────
const { error: liErr } = await supabase.from('invoice_line_items').insert(
  LINE_ITEMS.map(li => ({
    invoice_id:       invoiceId,
    description:      li.description,
    quantity:         li.quantity,
    unit_price_cents: li.unit_price_cents,
    total_cents:      li.total_cents,
    service:          li.service ?? null,
  }))
);
if (liErr) { console.error('❌  Line items insert failed:', liErr.message); process.exit(1); }
console.log(`✅  ${LINE_ITEMS.length} line items saved.`);

// ── Generate printable HTML ───────────────────────────────────────────
const fmtC = (cents) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
const fmtD = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const fmtDT = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const now   = new Date().toISOString();
const today = fmtDT(now);
const due   = fmtD(new Date(DUE_DATE).toISOString());

const logoSvg = `<svg width="34" height="38" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0">
  <path d="M5 36 L5 13 Q5 3 16 3 Q28 3 28 14 Q28 23 19 26" stroke="#7C3AED" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="18" cy="14" r="11" fill="#1a1033"/>
  <circle cx="18" cy="14" r="5" fill="#7C3AED"/>
</svg>`;

// Categorise items
const platformItems = LINE_ITEMS.filter(li => !li.service);
const apiItems      = LINE_ITEMS.filter(li => li.service);

const rowHtml = (li) => `
  <tr>
    <td>${li.description}${li.detail ? `<br><span class="row-detail">${li.detail}</span>` : ''}</td>
    <td class="r">${li.quantity.toLocaleString('en-ZA')}</td>
    <td class="r">${li.unit_price_cents >= 100 ? fmtC(li.unit_price_cents) : `R ${(li.unit_price_cents / 100).toFixed(2)}`}</td>
    <td class="r fw">${fmtC(li.total_cents)}</td>
  </tr>`;

// Margin summary (internal, never prints)
const costFloor    = LINE_ITEMS
  .filter(li => li.service)
  .reduce((s, li) => s + li.total_cents, 0); // rough cost proxy using API item totals
const platformFees = LINE_ITEMS
  .filter(li => !li.service)
  .reduce((s, li) => s + li.total_cents, 0);

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
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 10px; margin-top: 28px; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .items-table thead tr { background: #f8fafc; }
  .items-table th { padding: 10px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
  .items-table th.r { text-align: right; }
  .items-table td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; vertical-align: top; }
  .items-table td.r { text-align: right; color: #64748b; white-space: nowrap; }
  .items-table td.fw { text-align: right; font-weight: 600; color: #0f172a; white-space: nowrap; }
  .items-table tbody tr:last-child td { border-bottom: none; }
  .row-detail { font-size: 11px; color: #94a3b8; margin-top: 2px; display: block; }
  .section-subtotal { text-align: right; font-size: 12px; color: #64748b; padding: 8px 14px; background: #f8fafc; border-radius: 6px; margin-bottom: 4px; }
  .totals-wrap { display: flex; justify-content: flex-end; margin: 28px 0 36px; }
  .totals { width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #64748b; }
  .totals-row .val { font-family: monospace; }
  .totals-total { display: flex; justify-content: space-between; padding: 10px 0 0 0; font-size: 17px; font-weight: 700; color: #0f172a; border-top: 2px solid #7C3AED; margin-top: 4px; }
  .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 28px; }
  .pd-item .pdl { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 2px; }
  .pd-item .pdv { font-size: 13px; font-weight: 600; color: #0f172a; }
  .note-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; font-size: 12px; color: #78350f; margin-bottom: 28px; }
  .info-box { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 14px 20px; font-size: 11.5px; color: #3730a3; margin-bottom: 28px; line-height: 1.6; }
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
      <div class="inv-title">Tax Invoice</div>
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

  <!-- Platform fees -->
  <div class="section-title" style="margin-top:0">Platform fees</div>
  <table class="items-table">
    <thead><tr>
      <th>Service</th>
      <th class="r">Qty</th>
      <th class="r">Rate (excl. VAT)</th>
      <th class="r">Amount</th>
    </tr></thead>
    <tbody>${platformItems.map(rowHtml).join('')}</tbody>
  </table>
  <div class="section-subtotal">Platform subtotal: <strong>${fmtC(platformItems.reduce((s,l)=>s+l.total_cents,0))}</strong></div>

  <!-- API & third-party services -->
  <div class="section-title">Included API &amp; third-party services</div>
  <p style="font-size:11px;color:#94a3b8;margin-bottom:10px;font-style:italic;">Bundled monthly quota. Rates shown include AlgoLend platform margin. All amounts exclude VAT.</p>
  <table class="items-table">
    <thead><tr>
      <th>Service</th>
      <th class="r">Monthly quota</th>
      <th class="r">Rate / call</th>
      <th class="r">Amount</th>
    </tr></thead>
    <tbody>${apiItems.map(rowHtml).join('')}</tbody>
  </table>
  <div class="section-subtotal">API services subtotal: <strong>${fmtC(apiItems.reduce((s,l)=>s+l.total_cents,0))}</strong></div>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span class="val">${fmtC(TOTAL_CENTS)}</span></div>
      <div class="totals-row"><span>VAT (0% — not a registered VAT vendor)</span><span class="val">${fmtC(VAT_CENTS)}</span></div>
      <div class="totals-total"><span>Total Due</span><span>${fmtC(TOTAL_CENTS)}</span></div>
    </div>
  </div>

  <!-- Usage disclaimer -->
  <div class="info-box">
    <strong>Usage disclaimer:</strong> Monthly quotas shown above are included in the subscription fee. Any calls exceeding the included quota are billed on a <strong>pay-as-you-use</strong> basis at the then-current AlgoLend market rate. Usage reports and real-time call counts are available via your AlgoLend dashboard.
  </div>

  <!-- Payment details -->
  <div class="section-title">Payment Details</div>
  <div class="payment-grid">
    <div class="pd-item"><div class="pdl">Bank Name</div><div class="pdv">Capitec Bank</div></div>
    <div class="pd-item"><div class="pdl">Account Name</div><div class="pdv">ALGOHIVE PTY LTD</div></div>
    <div class="pd-item"><div class="pdl">Account Number</div><div class="pdv">1053045883</div></div>
    <div class="pd-item"><div class="pdl">Branch Code</div><div class="pdv">450105</div></div>
    <div class="pd-item"><div class="pdl">Account Type</div><div class="pdv">Business Account</div></div>
    <div class="pd-item"><div class="pdl">Reference</div><div class="pdv">${REFERENCE}</div></div>
  </div>

  <div class="note-box">
    <strong>Note:</strong> Please use <strong>${REFERENCE}</strong> as your payment reference. Monthly subscription renews automatically. Thank you for your business.
  </div>

  <div class="footer">
    ALGOHIVE PTY LTD · Reg. No. 2024/644796/07 · accounts@algolend.co.za
  </div>

  <!-- Internal margin summary — screen only, never prints -->
  <div class="no-print" style="margin-top:40px;border:1.5px dashed #e2e8f0;border-radius:12px;padding:20px 24px;background:#f8fafc;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin-bottom:14px;">Internal — Margin Summary (not printed)</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:4px 0;color:#64748b;">Revenue</td><td style="text-align:right;font-weight:600;color:#0f172a;font-family:monospace;">${fmtC(TOTAL_CENTS)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Platform fees (fixed cost)</td><td style="text-align:right;font-family:monospace;color:#64748b;">${fmtC(platformFees)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">API bundle (pass-through cost estimate)</td><td style="text-align:right;font-family:monospace;color:#64748b;">${fmtC(costFloor)}</td></tr>
      <tr style="border-top:2px solid #7C3AED;">
        <td style="padding:8px 0 4px;font-weight:700;color:#0f172a;">Est. net margin</td>
        <td style="text-align:right;font-weight:700;font-size:16px;color:#7C3AED;font-family:monospace;padding:8px 0 4px;">${fmtC(TOTAL_CENTS - platformFees - costFloor)}</td>
      </tr>
      <tr><td style="color:#94a3b8;font-size:11px;">Margin %</td><td style="text-align:right;color:#94a3b8;font-size:11px;font-family:monospace;">${(((TOTAL_CENTS - platformFees - costFloor) / TOTAL_CENTS) * 100).toFixed(1)}%</td></tr>
    </table>
  </div>

</body></html>`;

const outFile = resolve(ROOT, 'scripts', 'zwane-invoice.html');
writeFileSync(outFile, html, 'utf8');
console.log(`\n📄  Invoice HTML saved → ${outFile}`);
console.log(`💰  Breakdown: ${LINE_ITEMS.length} line items totalling ${fmtC(TOTAL_CENTS)}`);
console.log('🖨   Opening in browser — click "Save as PDF" or ⌘P to print.\n');
execSync(`open "${outFile}"`);
