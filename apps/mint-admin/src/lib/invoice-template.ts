const API_USAGE_SERVICES = new Set([
  'cipc','bureau','banking','contracts','liveness','homeaff','watchlist','address',
  'trueid_lookup','experian_score','docuseal_envelope','sacrra_submission',
  'sure_systems_pull','sms_outbound','email_outbound','api_call',
]);

export interface InvoiceForTemplate {
  reference:      string;
  subtotal_cents: number;
  vat_cents:      number;
  total_cents:    number;
  period_start:   string | null;
  period_end:     string | null;
  issued_at:      string | null;
  due_at:         string | null;
  paid_at:        string | null;
  notes:          string | null;
  clients:        { name: string; slug: string } | null;
  invoice_line_items: {
    description:      string;
    quantity:         number;
    unit_price_cents: number;
    total_cents:      number;
    service?:         string | null;
  }[];
}

export function printableInvoice(inv: InvoiceForTemplate): string {
  const fmtC = (cents: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
  const fmtD = (iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const platformItems = inv.invoice_line_items.filter(
    (li) => !li.service || !API_USAGE_SERVICES.has(li.service),
  );
  const usageItems = inv.invoice_line_items.filter(
    (li) => li.service && API_USAGE_SERVICES.has(li.service),
  );
  const usageTotal = usageItems.reduce((s, l) => s + l.total_cents, 0);

  const rowHtml = (li: InvoiceForTemplate['invoice_line_items'][number]) => `
    <tr>
      <td>${li.description}</td>
      <td class="r">${li.quantity.toLocaleString()}</td>
      <td class="r">${li.unit_price_cents > 0 ? fmtC(li.unit_price_cents) : '—'}</td>
      <td class="r fw">${fmtC(li.total_cents)}</td>
    </tr>`;

  const usageSectionHtml = usageItems.length === 0 ? '' : `
  <div class="section-title" style="margin-top:28px">API usage charges</div>
  <div class="usage-note">Per-check rates include a 38% platform margin. All rates exclude VAT.</div>
  <table class="items-table" style="margin-bottom:8px">
    <thead><tr>
      <th>Check / Service</th>
      <th class="r">Calls</th>
      <th class="r">Rate / call</th>
      <th class="r">Amount</th>
    </tr></thead>
    <tbody>${usageItems.map(rowHtml).join('')}</tbody>
  </table>
  <div class="usage-subtotal">API usage subtotal: <strong>${fmtC(usageTotal)}</strong></div>`;

  const logoSvg = `<svg width="34" height="38" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0">
    <path d="M5 36 L5 13 Q5 3 16 3 Q28 3 28 14 Q28 23 19 26" stroke="#7C3AED" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="14" r="11" fill="#1a1033"/>
    <circle cx="18" cy="14" r="5" fill="#7C3AED"/>
  </svg>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${inv.reference}</title>
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
  .usage-note { font-size: 11px; color: #94a3b8; margin-bottom: 10px; font-style: italic; }
  .usage-subtotal { text-align: right; font-size: 12px; color: #64748b; margin-bottom: 24px; padding: 8px 14px; background: #f8fafc; border-radius: 6px; }
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
  .stamp { display: inline-flex; align-items: center; gap: 6px; padding: 7px 18px; border-radius: 99px; font-weight: 700; font-size: 12px; background: #d1fae5; color: #065f46; border: 1.5px solid #6ee7b7; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 32px 48px; } .no-print { display: none; } }
</style></head><body>

  <div class="header">
    <div>
      <div class="brand-logo">${logoSvg}<span class="brand-name">AlgoLend</span></div>
      <div class="brand-sub">ALGOrithm Behind Better LENDing.</div>
    </div>
    <div>
      <div class="inv-title">Tax Invoice</div>
      <div class="inv-ref">${inv.reference}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From</div>
      <div class="party-name">Mint Platforms (Pty) Ltd</div>
      <div class="party-detail">
        3 Gwen Lane, Sandown<br>
        Sandton, 2031, South Africa<br>
        VAT No. 4360329853
      </div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.clients?.name ?? '—'}</div>
      <div class="party-detail">
        ${inv.clients?.slug ? inv.clients.slug.replace(/-/g, ' ') : ''}<br>
        accounts@${inv.clients?.slug ?? 'client'}.co.za
      </div>
    </div>
  </div>

  <div class="dates">
    <div class="date-item"><div class="dl">Invoice Number</div><div class="dv">${inv.reference}</div></div>
    <div class="date-item"><div class="dl">Invoice Date</div><div class="dv">${fmtD(inv.issued_at)}</div></div>
    <div class="date-item"><div class="dl">Due Date</div><div class="dv">${fmtD(inv.due_at)}</div></div>
    ${inv.period_start ? `<div class="date-item" style="grid-column:1/-1"><div class="dl">Billing Period</div><div class="dv">${fmtD(inv.period_start)} – ${fmtD(inv.period_end)}</div></div>` : ''}
  </div>

  ${platformItems.length > 0 ? `
  <div class="section-title">Platform fees</div>
  <table class="items-table">
    <thead><tr>
      <th>Description of Services</th>
      <th class="r">Qty</th>
      <th class="r">Rate (excl. VAT)</th>
      <th class="r">Amount</th>
    </tr></thead>
    <tbody>${platformItems.map(rowHtml).join('')}</tbody>
  </table>` : ''}

  ${usageSectionHtml}

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span class="val">${fmtC(inv.subtotal_cents)}</span></div>
      <div class="totals-row"><span>VAT (15%)</span><span class="val">${fmtC(inv.vat_cents)}</span></div>
      <div class="totals-total"><span>Total Due</span><span>${fmtC(inv.total_cents)}</span></div>
    </div>
  </div>

  ${inv.paid_at ? `<div style="margin-bottom:28px"><span class="stamp">✓ Paid in full — ${fmtD(inv.paid_at)}</span></div>` : ''}

  <div class="section-title">Payment Details</div>
  <div class="payment-grid">
    <div class="pd-item"><div class="pdl">Bank Name</div><div class="pdv">Capitec Bank</div></div>
    <div class="pd-item"><div class="pdl">Account Name</div><div class="pdv">Lonwabo N Damane</div></div>
    <div class="pd-item"><div class="pdl">Account Number</div><div class="pdv">1392511168</div></div>
    <div class="pd-item"><div class="pdl">Branch Code</div><div class="pdv">470010</div></div>
    <div class="pd-item"><div class="pdl">Account Type</div><div class="pdv">Savings</div></div>
    <div class="pd-item"><div class="pdl">Reference</div><div class="pdv">${inv.reference}</div></div>
  </div>

  <div class="notes">
    <strong>Note:</strong> Please use <strong>${inv.reference}</strong> as your payment reference.
    Thank you for your business. ${inv.notes ?? 'Payment is due by the date indicated above.'}
  </div>

  <div class="footer">
    Mint Platforms (Pty) Ltd · Reg. No. 2024/123456/07 · VAT No. 4360329853 · accounts@algolend.co.za
  </div>

</body></html>`;
}
