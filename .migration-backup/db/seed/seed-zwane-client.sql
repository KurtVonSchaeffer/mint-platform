-- =====================================================================
-- Zwane Official — full client seed for MINT demo
-- =====================================================================
-- Run in Supabase SQL editor after all 12 migrations have applied.
-- Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE.
-- =====================================================================

-- ── 1. Client record ────────────────────────────────────────────────
insert into clients (
  id, slug, name, legal_name, subdomain,
  ncr_number, tier, status,
  primary_color, secondary_color,
  contact_email, contact_name,
  monthly_fee_cents, api_quota,
  activated_at, created_at
) values (
  '10000000-0000-0000-0000-000000000001',
  'zwane-official',
  'Zwane Official',
  'Zwane Official Financial Services (Pty) Ltd',
  'zwane-official',
  'NCRCP89123',
  'growth',
  'active',
  '#7C3AED', '#1A1F36',
  'sipho@zwane-official.co.za',
  'Sipho Zwane',
  2200000,   -- R22,000/month — growth tier
  10000,     -- 10,000 API calls/month quota
  '2026-01-15 08:00:00+02',
  '2026-01-10 09:00:00+02'
) on conflict (id) do nothing;

-- ── 2. Growth-tier feature flags ────────────────────────────────────
insert into client_features (client_id, flag, enabled, enabled_at)
values
  ('10000000-0000-0000-0000-000000000001', 'open_banking',       true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'e_contracts',        true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'credit_scoring',     true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'sacrra_bureau',      true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'multi_branch',       true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'term_loans',         true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'whatsapp_notify',    true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'sure_systems',       true,  '2026-01-15 08:00:00+02'),
  ('10000000-0000-0000-0000-000000000001', 'working_capital',    false, null),
  ('10000000-0000-0000-0000-000000000001', 'invoice_finance',    false, null),
  ('10000000-0000-0000-0000-000000000001', 'advanced_analytics', false, null),
  ('10000000-0000-0000-0000-000000000001', 'biometric_kyc',      false, null)
on conflict (client_id, flag) do nothing;

-- ── 3. Usage logs — April 2026 ──────────────────────────────────────
-- TruID open banking lookups (bank verification per application)
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'trueid_lookup',
  1,
  850,
  '2026-04-' || lpad(d::text, 2, '0') || ' 09:00:00+02'
from generate_series(1, 28) d
where d % 2 = 0  -- ~14 lookups/month on even days
limit 14;

-- Experian credit scores
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'experian_score',
  1,
  667,
  '2026-04-' || lpad(d::text, 2, '0') || ' 10:30:00+02'
from generate_series(1, 30) d
where d % 2 = 1  -- ~15 scores on odd days
limit 15;

-- DocuSeal e-contracts
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'docuseal_envelope',
  1,
  360,
  '2026-04-' || lpad(d::text, 2, '0') || ' 14:00:00+02'
from generate_series(2, 28, 3) d  -- every 3rd day
limit 9;

-- SACRRA monthly submission (1 batch on the 5th)
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
values (
  '10000000-0000-0000-0000-000000000001',
  'sacrra_submission', 1, 50000, '2026-04-05 08:00:00+02'
);

-- SMS notifications
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'sms_outbound',
  3,  -- 3 SMSes per active day (approval + contract + disbursement)
  150, -- 50c each × 3
  '2026-04-' || lpad(d::text, 2, '0') || ' 11:00:00+02'
from generate_series(1, 28) d
where d % 2 = 0
limit 14;

-- Email notifications
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'email_outbound',
  2,
  40,  -- 20c each × 2
  '2026-04-' || lpad(d::text, 2, '0') || ' 11:30:00+02'
from generate_series(1, 30) d
where d % 2 = 1
limit 15;

-- Loans registered
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'loan_registered',
  1, 0,
  '2026-04-' || lpad(d::text, 2, '0') || ' 15:00:00+02'
from generate_series(1, 28) d
where d % 3 = 0
limit 9;

-- Loans disbursed
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select
  '10000000-0000-0000-0000-000000000001',
  'loan_disbursed',
  1, 0,
  '2026-04-' || lpad(d::text, 2, '0') || ' 16:00:00+02'
from generate_series(1, 28) d
where d % 3 = 0
limit 9;

-- ── 4. Usage logs — May 2026 (higher volume — growth month) ─────────
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'trueid_lookup',      1, 850,   '2026-05-' || lpad(d::text, 2, '0') || ' 09:00:00+02' from generate_series(1, 30) d where d % 2 = 0 limit 15;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'experian_score',     1, 667,   '2026-05-' || lpad(d::text, 2, '0') || ' 10:00:00+02' from generate_series(1, 31) d where d % 2 = 1 limit 16;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'docuseal_envelope',  1, 360,   '2026-05-' || lpad(d::text, 2, '0') || ' 14:00:00+02' from generate_series(1, 30, 2) d limit 15;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
values ('10000000-0000-0000-0000-000000000001', 'sacrra_submission', 1, 50000, '2026-05-05 08:00:00+02');

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'sms_outbound',       4,  200,  '2026-05-' || lpad(d::text, 2, '0') || ' 11:00:00+02' from generate_series(1, 30) d where d % 2 = 0 limit 15;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'email_outbound',     3,  60,   '2026-05-' || lpad(d::text, 2, '0') || ' 11:30:00+02' from generate_series(1, 31) d where d % 2 = 1 limit 16;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'loan_registered',    1,  0,    '2026-05-' || lpad(d::text, 2, '0') || ' 15:00:00+02' from generate_series(1, 30) d where d % 3 = 0 limit 10;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'loan_disbursed',     1,  0,    '2026-05-' || lpad(d::text, 2, '0') || ' 16:00:00+02' from generate_series(1, 30) d where d % 3 = 0 limit 10;

-- ── 5. Usage logs — June 2026 (current month — partial) ─────────────
insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'trueid_lookup',      1, 850,   '2026-06-' || lpad(d::text, 2, '0') || ' 09:00:00+02' from generate_series(2, 8, 2) d;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'experian_score',     1, 667,   '2026-06-' || lpad(d::text, 2, '0') || ' 10:00:00+02' from generate_series(1, 9, 2) d;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'docuseal_envelope',  1, 360,   '2026-06-' || lpad(d::text, 2, '0') || ' 14:00:00+02' from generate_series(3, 9, 3) d;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'sms_outbound',       3,  150,  '2026-06-' || lpad(d::text, 2, '0') || ' 11:00:00+02' from generate_series(2, 8, 2) d;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'email_outbound',     2,  40,   '2026-06-' || lpad(d::text, 2, '0') || ' 11:30:00+02' from generate_series(1, 9, 2) d;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'loan_registered',    1,  0,    '2026-06-' || lpad(d::text, 2, '0') || ' 15:00:00+02' from generate_series(3, 9, 3) d;

insert into usage_logs (client_id, service, quantity, cost_cents, occurred_at)
select '10000000-0000-0000-0000-000000000001', 'loan_disbursed',     1,  0,    '2026-06-' || lpad(d::text, 2, '0') || ' 16:00:00+02' from generate_series(3, 9, 3) d;

-- ── 6. Refresh the monthly rollup ───────────────────────────────────
refresh materialized view usage_monthly_rollup;

-- ── 7. Invoices ─────────────────────────────────────────────────────
-- April 2026 — monthly licence invoice (PAID)
insert into invoices (
  id, reference, client_id, type, status,
  subtotal_cents, vat_cents, total_cents,
  period_start, period_end,
  issued_at, due_at, paid_at, notes
) values (
  '20000000-0000-0000-0000-000000000001',
  'INV-ZW-2026-0001',
  '10000000-0000-0000-0000-000000000001',
  'monthly_licence', 'paid',
  2200000, 330000, 2530000,
  '2026-04-01', '2026-04-30',
  '2026-04-01 08:00:00+02',
  '2026-04-15 08:00:00+02',
  '2026-04-10 14:22:00+02',
  'Monthly platform licence — Growth tier'
) on conflict (id) do nothing;

insert into invoice_line_items (invoice_id, description, quantity, unit_price_cents, total_cents, service)
values (
  '20000000-0000-0000-0000-000000000001',
  'Growth tier platform licence — April 2026', 1, 2200000, 2200000, null
) on conflict do nothing;

-- April 2026 — usage invoice (PAID)
insert into invoices (
  id, reference, client_id, type, status,
  subtotal_cents, vat_cents, total_cents,
  period_start, period_end,
  issued_at, due_at, paid_at, notes
) values (
  '20000000-0000-0000-0000-000000000002',
  'INV-ZW-2026-0002',
  '10000000-0000-0000-0000-000000000001',
  'usage', 'paid',
  303250, 45488, 348738,
  '2026-04-01', '2026-04-30',
  '2026-05-01 08:00:00+02',
  '2026-05-15 08:00:00+02',
  '2026-05-08 11:30:00+02',
  'Pass-through usage charges — April 2026'
) on conflict (id) do nothing;

insert into invoice_line_items (invoice_id, description, quantity, unit_price_cents, total_cents, service)
values
  ('20000000-0000-0000-0000-000000000002', 'TruID open banking lookups × 14',  14, 850, 11900, 'trueid_lookup'),
  ('20000000-0000-0000-0000-000000000002', 'Experian credit score pulls × 15',  15, 667, 10005, 'experian_score'),
  ('20000000-0000-0000-0000-000000000002', 'DocuSeal e-contract envelopes × 9', 9,  360, 3240, 'docuseal_envelope'),
  ('20000000-0000-0000-0000-000000000002', 'SACRRA bureau submission × 1',       1, 50000, 50000, 'sacrra_submission'),
  ('20000000-0000-0000-0000-000000000002', 'SMS notifications × 42',            42, 50,  2100, 'sms_outbound'),
  ('20000000-0000-0000-0000-000000000002', 'Email notifications × 30',          30, 20,  600, 'email_outbound')
on conflict do nothing;

-- May 2026 — monthly licence invoice (PAID)
insert into invoices (
  id, reference, client_id, type, status,
  subtotal_cents, vat_cents, total_cents,
  period_start, period_end,
  issued_at, due_at, paid_at, notes
) values (
  '20000000-0000-0000-0000-000000000003',
  'INV-ZW-2026-0003',
  '10000000-0000-0000-0000-000000000001',
  'monthly_licence', 'paid',
  2200000, 330000, 2530000,
  '2026-05-01', '2026-05-31',
  '2026-05-01 08:00:00+02',
  '2026-05-15 08:00:00+02',
  '2026-05-12 09:45:00+02',
  'Monthly platform licence — Growth tier'
) on conflict (id) do nothing;

insert into invoice_line_items (invoice_id, description, quantity, unit_price_cents, total_cents, service)
values (
  '20000000-0000-0000-0000-000000000003',
  'Growth tier platform licence — May 2026', 1, 2200000, 2200000, null
) on conflict do nothing;

-- May 2026 — usage invoice (SENT — awaiting payment)
insert into invoices (
  id, reference, client_id, type, status,
  subtotal_cents, vat_cents, total_cents,
  period_start, period_end,
  issued_at, due_at, notes
) values (
  '20000000-0000-0000-0000-000000000004',
  'INV-ZW-2026-0004',
  '10000000-0000-0000-0000-000000000001',
  'usage', 'sent',
  365150, 54773, 419923,
  '2026-05-01', '2026-05-31',
  '2026-06-01 08:00:00+02',
  '2026-06-15 08:00:00+02',
  'Pass-through usage charges — May 2026'
) on conflict (id) do nothing;

insert into invoice_line_items (invoice_id, description, quantity, unit_price_cents, total_cents, service)
values
  ('20000000-0000-0000-0000-000000000004', 'TruID open banking lookups × 15',   15, 850, 12750, 'trueid_lookup'),
  ('20000000-0000-0000-0000-000000000004', 'Experian credit score pulls × 16',   16, 667, 10672, 'experian_score'),
  ('20000000-0000-0000-0000-000000000004', 'DocuSeal e-contract envelopes × 15', 15, 360, 5400, 'docuseal_envelope'),
  ('20000000-0000-0000-0000-000000000004', 'SACRRA bureau submission × 1',        1, 50000, 50000, 'sacrra_submission'),
  ('20000000-0000-0000-0000-000000000004', 'SMS notifications × 60',             60, 50,  3000, 'sms_outbound'),
  ('20000000-0000-0000-0000-000000000004', 'Email notifications × 48',           48, 20,  960, 'email_outbound')
on conflict do nothing;

-- June 2026 — monthly licence (DRAFT — current month)
insert into invoices (
  id, reference, client_id, type, status,
  subtotal_cents, vat_cents, total_cents,
  period_start, period_end,
  notes
) values (
  '20000000-0000-0000-0000-000000000005',
  'INV-ZW-2026-0005',
  '10000000-0000-0000-0000-000000000001',
  'monthly_licence', 'draft',
  2200000, 330000, 2530000,
  '2026-06-01', '2026-06-30',
  'Monthly platform licence — June 2026 (draft)'
) on conflict (id) do nothing;

insert into invoice_line_items (invoice_id, description, quantity, unit_price_cents, total_cents, service)
values (
  '20000000-0000-0000-0000-000000000005',
  'Growth tier platform licence — June 2026', 1, 2200000, 2200000, null
) on conflict do nothing;

-- ── 8. Also add Zwane as a lead (so it shows in the leads pipeline) ──
insert into leads (id, name, email, company, message, source, status, created_at)
values (
  '30000000-0000-0000-0000-000000000001',
  'Sipho Zwane',
  'sipho@zwane-official.co.za',
  'Zwane Official Financial Services',
  'Looking to move our loan management off spreadsheets. We run about 80 personal loans per month, mainly in Gauteng. Need NCA compliance, credit checks, and e-contracts.',
  'marketing-site',
  'won',
  '2025-12-18 10:30:00+02'
) on conflict (id) do nothing;
