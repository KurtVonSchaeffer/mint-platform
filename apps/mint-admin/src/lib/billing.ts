/**
 * Billing engine — core logic shared between the API route and tests.
 *
 * Generates monthly invoices by:
 *   1. Reading all active/trial clients
 *   2. Computing pro-rated licence fee if activated mid-month
 *   3. Aggregating usage_monthly_rollup pass-through costs
 *   4. INSERTing invoices + invoice_line_items rows in Supabase
 *
 * VAT: South Africa 15%.
 * Pro-rata: (days remaining in month from activation) / (total days in month).
 */

import { supabaseAdmin } from '@/lib/supabase';

/* ─── Pass-through cost rates (ZAR cents per unit) ─────────────────── */
export const SERVICE_RATES: Record<string, number> = {
  trueid_lookup:      2500,   // R25.00
  experian_score:     3500,   // R35.00
  docuseal_envelope:  1500,   // R15.00
  sacrra_submission:   500,   // R5.00
  sure_systems_pull:   800,   // R8.00
  sms_outbound:         80,   // R0.80
  email_outbound:       20,   // R0.20
  loan_registered:       0,   // platform event — no pass-through
  loan_disbursed:        0,   // platform event — no pass-through
  api_call:              5,   // R0.05
};

export const SERVICE_LABELS: Record<string, string> = {
  trueid_lookup:      'TruID affordability lookups',
  experian_score:     'Experian credit scores',
  docuseal_envelope:  'DocuSeal e-contract envelopes',
  sacrra_submission:  'SACRRA bureau submissions',
  sure_systems_pull:  'Sure Systems debit-order pulls',
  sms_outbound:       'Outbound SMS notifications',
  email_outbound:     'Outbound email notifications',
  loan_registered:    'Loans registered',
  loan_disbursed:     'Loans disbursed',
  api_call:           'API calls',
};

const VAT_RATE = 0.15;

/* ─── Date helpers ──────────────────────────────────────────────────── */
export function monthBounds(yearMonth: string): { start: Date; end: Date; daysInMonth: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0);           // last day of month
  return { start, end, daysInMonth: end.getDate() };
}

export function proRataFraction(activatedAt: Date, monthStart: Date, daysInMonth: number): number {
  if (activatedAt <= monthStart) return 1;          // active before month started — full fee
  const daysInPeriod = Math.max(0, daysInMonth - activatedAt.getDate() + 1);
  return daysInPeriod / daysInMonth;
}

/* ─── Types ─────────────────────────────────────────────────────────── */
export interface GenerateResult {
  month:         string;
  invoicesCreated: number;
  invoicesSkipped: number;   // already existed
  totalCents:    number;
  errors:        { clientId: string; clientName: string; error: string }[];
}

/* ─── Main generate function ────────────────────────────────────────── */
export async function generateMonthlyInvoices(yearMonth: string): Promise<GenerateResult> {
  const { start: monthStart, end: monthEnd, daysInMonth } = monthBounds(yearMonth);
  const result: GenerateResult = {
    month: yearMonth, invoicesCreated: 0, invoicesSkipped: 0, totalCents: 0, errors: [],
  };

  // 1. Fetch all active + trial clients
  const { data: clients, error: clientsErr } = await supabaseAdmin
    .from('clients')
    .select('id, name, slug, monthly_fee_cents, status, activated_at, tier')
    .in('status', ['active', 'trial'])
    .is('deleted_at', null);

  if (clientsErr || !clients) {
    throw new Error(`Failed to fetch clients: ${clientsErr?.message}`);
  }

  for (const client of clients) {
    try {
      // 2. Check if a licence invoice already exists for this month+client
      const refLicence = `INV-${yearMonth}-${client.slug}-LIC`;
      const { data: existing } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('reference', refLicence)
        .single();

      if (existing) {
        result.invoicesSkipped++;
        continue;
      }

      const lineItems: { description: string; quantity: number; unit_price_cents: number; total_cents: number; service: string | null }[] = [];

      // 3. Pro-rated licence fee
      const activatedAt = client.activated_at ? new Date(client.activated_at) : monthStart;
      const fraction    = proRataFraction(activatedAt, monthStart, daysInMonth);
      const licenceCents = Math.round(client.monthly_fee_cents * fraction);

      if (licenceCents > 0) {
        const proRataNote = fraction < 1
          ? ` (pro-rated ${Math.round(fraction * daysInMonth)}/${daysInMonth} days)`
          : '';
        lineItems.push({
          description:      `Monthly licence fee — ${client.tier} tier${proRataNote}`,
          quantity:         1,
          unit_price_cents: licenceCents,
          total_cents:      licenceCents,
          service:          null,
        });
      }

      // 4. Usage pass-throughs from rollup
      const { data: usageRows } = await supabaseAdmin
        .from('usage_monthly_rollup')
        .select('service, total_quantity, total_cost_cents')
        .eq('client_id', client.id)
        .eq('month', monthStart.toISOString().slice(0, 10));

      if (usageRows && usageRows.length > 0) {
        for (const row of usageRows) {
          const rate       = SERVICE_RATES[row.service] ?? 0;
          const totalCents = rate > 0
            ? row.total_quantity * rate
            : row.total_cost_cents;      // use recorded cost for zero-rate services with override

          if (totalCents <= 0) continue;

          lineItems.push({
            description:      SERVICE_LABELS[row.service] ?? row.service,
            quantity:         row.total_quantity,
            unit_price_cents: rate,
            total_cents:      totalCents,
            service:          row.service,
          });
        }
      }

      if (lineItems.length === 0) {
        result.invoicesSkipped++;
        continue;
      }

      // 5. Compute totals
      const subtotalCents = lineItems.reduce((s, l) => s + l.total_cents, 0);
      const vatCents      = Math.round(subtotalCents * VAT_RATE);
      const totalCents    = subtotalCents + vatCents;

      // 6. Insert invoice
      const issuedAt = new Date();
      const dueAt    = new Date(issuedAt);
      dueAt.setDate(dueAt.getDate() + 15);     // net-15

      const { data: inv, error: invErr } = await supabaseAdmin
        .from('invoices')
        .insert({
          reference:      refLicence,
          client_id:      client.id,
          type:           'monthly_licence',
          status:         'draft',
          subtotal_cents: subtotalCents,
          vat_cents:      vatCents,
          total_cents:    totalCents,
          period_start:   monthStart.toISOString().slice(0, 10),
          period_end:     monthEnd.toISOString().slice(0, 10),
          issued_at:      issuedAt.toISOString(),
          due_at:         dueAt.toISOString(),
          notes:          `Auto-generated by AlgoLend billing engine for ${yearMonth}.`,
        })
        .select('id')
        .single();

      if (invErr || !inv) {
        result.errors.push({ clientId: client.id, clientName: client.name, error: invErr?.message ?? 'Insert failed' });
        continue;
      }

      // 7. Insert line items
      const { error: lineErr } = await supabaseAdmin
        .from('invoice_line_items')
        .insert(lineItems.map((l) => ({
          invoice_id:       inv.id,
          description:      l.description,
          quantity:         l.quantity,
          unit_price_cents: l.unit_price_cents,
          total_cents:      l.total_cents,
          service:          l.service,
        })));

      if (lineErr) {
        result.errors.push({ clientId: client.id, clientName: client.name, error: `Line items: ${lineErr.message}` });
        // Don't fail — invoice header exists, line items can be fixed
      }

      result.invoicesCreated++;
      result.totalCents += totalCents;

    } catch (err) {
      result.errors.push({ clientId: client.id, clientName: client.name, error: String(err) });
    }
  }

  return result;
}
