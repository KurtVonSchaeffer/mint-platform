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

/** Browser-print-based document: caller opens a popup, writes this HTML, then calls window.print(). */
export function printableBiztechDoc(doc: PrintableDoc): string {
  const rows = doc.items.map(i => `
    <tr>
      <td>${i.description}</td>
      <td style="text-align:right">${i.quantity}</td>
      <td style="text-align:right">${fmt(i.unit_price_cents)}</td>
      <td style="text-align:right">${fmt(i.total_cents)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${doc.kind} ${doc.reference}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .ref { font-family: monospace; color: #666; margin: 0 0 24px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 32px; font-size: 13px; }
  .meta div { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding: 8px 4px; }
  td { font-size: 13px; padding: 8px 4px; border-bottom: 1px solid #eee; }
  .totals { margin-left: auto; width: 260px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .total { font-weight: 700; font-size: 16px; border-top: 1px solid #ddd; margin-top: 6px; padding-top: 10px; }
  .notes { margin-top: 24px; font-size: 12px; color: #666; font-style: italic; }
</style>
</head>
<body>
  <h1>${doc.kind} ${doc.reference}</h1>
  <p class="ref">Status: ${doc.status}</p>
  <div class="meta">
    <div><strong>Bill to</strong><br />${doc.clientName}</div>
    <div><strong>${doc.dateLabel}</strong><br />${fmtDate(doc.dateValue)}</div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${fmt(doc.subtotal_cents)}</span></div>
    <div><span>VAT (15%)</span><span>${fmt(doc.vat_cents)}</span></div>
    <div class="total"><span>Total</span><span>${fmt(doc.total_cents)}</span></div>
  </div>
  ${doc.notes ? `<p class="notes">${doc.notes}</p>` : ''}
</body>
</html>`;
}
