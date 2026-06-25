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
import { CHECK_CATALOG, MARGIN } from '@/lib/quote-pricing';

/* ─── One-time activation fees per tier (ZAR cents) ────────────────── */
export const ACTIVATION_FEES: Record<string, number> = {
  core:       500000,   // R5,000
  growth:    1000000,   // R10,000
  enterprise: 2500000,  // R25,000
};

/* ─── Per-check rates from catalog (ZAR cents, 38% margin applied) ──── */
function catalogRate(id: string): number {
  const c = CHECK_CATALOG.find((x) => x.id === id);
  return c ? Math.round(c.baseRate * (1 + MARGIN) * 100) : 0;
}

/* ─── Pass-through cost rates (ZAR cents per unit) ─────────────────── */
export const SERVICE_RATES: Record<string, number> = {
  // API check catalog — rates with 38% margin
  bureau:             catalogRate('bureau'),      // Bureau enquiry
  banking:            catalogRate('banking'),     // Bank account linking
  contracts:          catalogRate('contracts'),   // Automated contracts
  liveness:           catalogRate('liveness'),    // Liveness & ID
  homeaff:            catalogRate('homeaff'),     // Home Affairs
  watchlist:          catalogRate('watchlist'),   // Watchlist / PEPs
  address:            catalogRate('address'),     // Address verification
  // Legacy service names → mapped to catalog rates
  trueid_lookup:      catalogRate('banking'),     // TruID = bank account linking
  experian_score:     catalogRate('bureau'),      // Experian = bureau enquiry
  docuseal_envelope:  catalogRate('contracts'),   // e-contracts
  sacrra_submission:  catalogRate('watchlist'),   // SACRRA = compliance check
  sure_systems_pull:  catalogRate('banking'),     // Sure Systems = bank pull
  // Non-check pass-throughs
  sms_outbound:         80,   // R0.80
  email_outbound:       20,   // R0.20
  loan_registered:       0,   // platform event — no charge
  loan_disbursed:        0,   // platform event — no charge
  api_call:            500,   // R5.00 generic / unlabelled call
};

export const SERVICE_LABELS: Record<string, string> = {
  activation:         'Platform activation fee',
  bureau:             'Bureau enquiries (Experian standard)',
  banking:            'Bank account linking (TruID)',
  contracts:          'Automated e-contracts',
  liveness:           'Liveness & ID + phone verification',
  homeaff:            'Liveness + Home Affairs verification',
  watchlist:          'Watchlist: PEPs & Sanctions (SACRRA)',
  address:            'Address verification',
  trueid_lookup:      'Bank account linking (TruID)',
  experian_score:     'Bureau enquiries (Experian)',
  docuseal_envelope:  'E-contracts signed',
  sacrra_submission:  'SACRRA bureau submissions',
  sure_systems_pull:  'Bank debit-order pulls',
  sms_outbound:       'Outbound SMS notifications',
  email_outbound:     'Outbound email notifications',
  loan_registered:    'Loans registered',
  loan_disbursed:     'Loans disbursed',
  api_call:           'API calls',
};

/* Services that are "API usage" vs platform fees — used by invoice template */
export const API_USAGE_SERVICES = new Set([
  'bureau','banking','contracts','liveness','homeaff','watchlist','address',
  'trueid_lookup','experian_score','docuseal_envelope','sacrra_submission',
  'sure_systems_pull','sms_outbound','email_outbound','api_call',
]);

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
export async function generateMonthlyInvoices(yearMonth: string, clientId?: string): Promise<GenerateResult> {
  const { start: monthStart, end: monthEnd, daysInMonth } = monthBounds(yearMonth);
  const result: GenerateResult = {
    month: yearMonth, invoicesCreated: 0, invoicesSkipped: 0, totalCents: 0, errors: [],
  };

  // 1. Fetch active + trial clients (optionally filtered to one client)
  let query = supabaseAdmin
    .from('clients')
    .select('id, name, slug, monthly_fee_cents, status, activated_at, tier')
    .in('status', ['active', 'trial'])
    .is('deleted_at', null);
  if (clientId) query = query.eq('id', clientId);
  const { data: clients, error: clientsErr } = await query;

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

      // 4. One-time activation fee — charged on the first invoice if activated this month
      if (client.activated_at) {
        const activationDate = new Date(client.activated_at);
        const { start: mStart, end: mEnd } = monthBounds(yearMonth);
        if (activationDate >= mStart && activationDate <= mEnd) {
          // Check no prior activation fee invoice exists for this client
          const { data: existingSetup } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('client_id', client.id)
            .eq('type', 'setup')
            .single();

          if (!existingSetup) {
            const activationFee = (client as Record<string, unknown>).activation_fee_cents as number | null
              ?? ACTIVATION_FEES[client.tier]
              ?? 0;
            if (activationFee > 0) {
              lineItems.push({
                description:      `Platform activation fee — ${client.tier} tier`,
                quantity:         1,
                unit_price_cents: activationFee,
                total_cents:      activationFee,
                service:          'activation',
              });
            }
          }
        }
      }

      // 6. Usage pass-throughs from rollup
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

      // 7. Compute totals
      const subtotalCents = lineItems.reduce((s, l) => s + l.total_cents, 0);
      const vatCents      = Math.round(subtotalCents * VAT_RATE);
      const totalCents    = subtotalCents + vatCents;

      // 8. Insert invoice
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
          notes:          `Auto-generated by Mint Platforms billing engine for ${yearMonth}.`,
        })
        .select('id')
        .single();

      if (invErr || !inv) {
        result.errors.push({ clientId: client.id, clientName: client.name, error: invErr?.message ?? 'Insert failed' });
        continue;
      }

      // 9. Insert line items
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

/* ─── Send drafted invoices ─────────────────────────────────────────── */
import { sendEmail, invoiceReadyEmail } from '@/lib/email';

export interface SendResult {
  month: string; sent: number; skipped: number;
  errors: { invoiceId: string; reference: string; error: string }[];
}

export async function sendMonthlyInvoices(yearMonth: string, clientId?: string): Promise<SendResult> {
  const result: SendResult = { month: yearMonth, sent: 0, skipped: 0, errors: [] };

  let query = supabaseAdmin
    .from('invoices')
    .select('id, reference, client_id, subtotal_cents, vat_cents, total_cents, period_start, period_end, due_at, clients(name, contact_email, contact_name)')
    .eq('status', 'draft')
    .gte('period_start', `${yearMonth}-01`)
    .lte('period_start', `${yearMonth}-31`);
  if (clientId) query = query.eq('client_id', clientId);

  const { data: invoices, error } = await query;
  if (error || !invoices) throw new Error(`Failed to fetch invoices: ${error?.message}`);

  for (const inv of invoices) {
    try {
      const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string; contact_email: string; contact_name: string | null } | null;
      if (!client?.contact_email) { result.skipped++; continue; }

      const { count } = await supabaseAdmin
        .from('invoice_line_items')
        .select('id', { count: 'exact', head: true })
        .eq('invoice_id', inv.id)
        .throwOnError();

      const fmtDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

      await sendEmail({
        to:      client.contact_email,
        subject: `Invoice ${inv.reference} — ${fmtDate(inv.period_start)} to ${fmtDate(inv.period_end)}`,
        html:    invoiceReadyEmail({
          reference:     inv.reference,
          clientName:    client.name,
          contact:       client.contact_name ?? client.contact_email.split('@')[0],
          periodStart:   fmtDate(inv.period_start),
          periodEnd:     fmtDate(inv.period_end),
          subtotalCents: inv.subtotal_cents,
          vatCents:      inv.vat_cents,
          totalCents:    inv.total_cents,
          dueDate:       fmtDate(inv.due_at),
          lineCount:     count ?? 0,
        }),
      });

      await supabaseAdmin.from('invoices').update({ status: 'sent', issued_at: new Date().toISOString() }).eq('id', inv.id);
      result.sent++;
    } catch (err) {
      result.errors.push({ invoiceId: inv.id, reference: inv.reference, error: String(err) });
    }
  }

  return result;
}
