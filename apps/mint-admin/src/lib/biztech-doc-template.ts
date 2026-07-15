import { fmt, fmtDate } from '@/lib/invoice-helpers';

interface DocItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface PrintableDoc {
  kind: 'Quote' | 'Invoice';
  reference: string;
  clientName: string;
  status: string;
  dateLabel: string;
  dateValue: string | null;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  notes: string | null;
  items: DocItem[];
}

const FROM = {
  company: 'MINT PLATFORMS (PTY) LTD',
  address: ['3 Gwen Lane, Sandown', 'Sandton, 2031, South Africa'],
  email:   'info@mymint.co.za',
};

/** Browser-print-based document, styled to match the AlgoLend invoice-creator letterhead. Caller opens a popup, writes this HTML, then calls window.print(). */
export function printableBiztechDoc(doc: PrintableDoc): string {
  const rows = doc.items.map(i => `
    <tr>
      <td class="desc">${i.description}</td>
      <td class="num" style="text-align:center">${i.quantity}</td>
      <td class="num">${fmt(i.unit_price_cents)}</td>
      <td class="num strong">${fmt(i.total_cents)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${doc.kind} ${doc.reference}</title>
<style>
  * { box-sizing: border-box; }
  :root { color-scheme: light; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1f2937; background: #f3f4f6; margin: 0; padding: 32px; }
  .card { max-width: 780px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }

  .header { background: linear-gradient(135deg, #31005E 0%, #5C3BCF 100%); padding: 40px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .header-top img { height: 34px; width: auto; opacity: 0.96; }
  .header-sub { color: #c4b5fd; font-size: 12px; margin: 8px 0 0; }
  .doc-kind { color: #c4b5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 4px; text-align: right; }
  .doc-ref { color: #fff; font-size: 24px; font-weight: 700; text-align: right; line-height: 1.2; }
  .header-meta { margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(196,181,253,0.35); display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .header-meta .l { color: #a78bfa; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 3px; }
  .header-meta .v { color: #fff; font-size: 13px; font-weight: 600; margin: 0; }

  .section { padding: 32px 40px; border-bottom: 1px solid #f0f0f5; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .label { color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px; }
  .party-name { color: #111827; font-size: 14px; font-weight: 700; margin: 0; }
  .party-line { color: #6b7280; font-size: 13px; margin: 2px 0 0; line-height: 1.5; }

  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f8f7ff; }
  th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #9ca3af; padding: 12px 16px; }
  th.num { text-align: right; }
  td.desc { padding: 14px 16px; font-size: 13px; font-weight: 500; color: #374151; border-bottom: 1px solid #f3f4f6; }
  td.num { padding: 14px 16px; font-size: 13px; color: #6b7280; text-align: right; border-bottom: 1px solid #f3f4f6; }
  td.num.strong { color: #111827; font-weight: 700; }

  .totals-wrap { padding: 24px 40px 32px; display: flex; justify-content: flex-end; }
  .totals { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280; }
  .totals-row .v { font-weight: 600; color: #374151; }
  .total-due { margin-top: 10px; padding: 14px 18px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #31005E, #5C3BCF); }
  .total-due span:first-child { color: #c4b5fd; font-size: 13px; font-weight: 700; }
  .total-due span:last-child { color: #fff; font-size: 18px; font-weight: 700; }

  .notes { margin: 0 40px 24px; padding: 14px 18px; border-radius: 12px; background: #fefce8; border: 1px solid #fde68a; font-size: 13px; color: #57534e; }

  .footer { padding: 20px 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f0f0f5; }
  .footer a { color: #7c5cd6; text-decoration: none; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-top">
        <div>
          <img src="/mint-logo-white.png" alt="MINT Platforms" />
          <p class="header-sub">MINT BizTech</p>
        </div>
        <div>
          <p class="doc-kind">${doc.kind}</p>
          <p class="doc-ref">${doc.reference}</p>
        </div>
      </div>
      <div class="header-meta">
        <div><p class="l">${doc.dateLabel}</p><p class="v">${fmtDate(doc.dateValue)}</p></div>
        <div><p class="l">Status</p><p class="v" style="text-transform:capitalize">${doc.status}</p></div>
        <div><p class="l">Total</p><p class="v">${fmt(doc.total_cents)}</p></div>
      </div>
    </div>

    <div class="section">
      <div class="cols">
        <div>
          <p class="label">From</p>
          <p class="party-name">${FROM.company}</p>
          ${FROM.address.map(a => `<p class="party-line">${a}</p>`).join('')}
          <p class="party-line">${FROM.email}</p>
        </div>
        <div>
          <p class="label">Bill To</p>
          <p class="party-name">${doc.clientName}</p>
        </div>
      </div>
    </div>

    <div class="section" style="padding-bottom: 0;">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num" style="text-align:center">Qty</th>
            <th class="num">Unit Price</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span class="v">${fmt(doc.subtotal_cents)}</span></div>
        <div class="totals-row"><span>VAT (15%)</span><span class="v">${fmt(doc.vat_cents)}</span></div>
        <div class="total-due"><span>Total Due</span><span>${fmt(doc.total_cents)}</span></div>
      </div>
    </div>

    ${doc.notes ? `<div class="notes"><strong>Note:</strong> ${doc.notes}</div>` : ''}

    <div class="footer">
      ${FROM.company} · ${FROM.address.join(', ')} · <a href="mailto:support@mymint.co.za">support@mymint.co.za</a>
    </div>
  </div>
</body>
</html>`;
}
