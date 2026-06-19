/**
 * seed-zwane-policy.mjs
 *
 * Seeds ZwaneOfficial's lender policy into the Mint marketplace.
 * Run once against the production Supabase project.
 *
 * Usage:
 *   node db/seed/seed-zwane-policy.mjs
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment,
 * or reads them from apps/algolend/.env automatically.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load env from algolend .env if not already set ──────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../apps/algolend/.env');

if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  console.log('Loaded env from apps/algolend/.env');
}

const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL  || 'https://jmnjkxfxenrudpvjprcu.supabase.co';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set.');
  console.error('    Add it to apps/algolend/.env or export it before running this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── ZwaneOfficial lending policy ─────────────────────────────────────────
// Typical SA SME working-capital lender profile.
// Adjust these values to match the actual agreed terms.
const ZWANE_POLICY = {
  display_name:            'Zwane Official Capital',
  tagline:                 'Fast working capital for South African SMEs — decisions in 48 hours',
  avg_turnaround_days:     2,

  // Eligibility
  min_credit_score:        600,
  max_dsr_pct:             45,
  min_amount:              50_000,
  max_amount:              2_000_000,
  min_years_in_operation:  1,
  require_id_verified:     true,
  max_open_defaults:       0,

  // Pricing
  base_rate_pct:           28,    // 28% p.a.
  initiation_fee_pct:      3.5,
  monthly_service_fee:     69,

  // Score bands — evaluate top-to-bottom, first match wins
  rate_bands: [
    { minScore: 720, rateAdjustment: -4   },   // 24% p.a.
    { minScore: 680, rateAdjustment: -2   },   // 26% p.a.
    { minScore: 650, rateAdjustment: -1   },   // 27% p.a.
    { minScore: 620, rateAdjustment:  0   },   // 28% base
    { minScore: 600, rateAdjustment:  3   },   // 31% p.a.
    { minScore:   0, rateAdjustment: null },   // < 600 → decline
  ],

  active: true,   // ← live in marketplace immediately
};

// ── Seed ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('Looking up ZwaneOfficial client…');

  // 1. Find the client by slug
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('id, name, slug, status')
    .eq('slug', 'zwane-official')
    .maybeSingle();

  if (cErr) { console.error('❌  DB error looking up client:', cErr.message); process.exit(1); }

  if (!client) {
    console.error('❌  Client with slug "zwane-official" not found in clients table.');
    console.error('    Create the client first via mint-admin → Clients → New client.');
    process.exit(1);
  }

  console.log(`✅  Found client: ${client.name} (${client.id}) — status: ${client.status}`);

  // 2. Upsert the policy (ON CONFLICT client_id → update)
  const { data: policy, error: pErr } = await supabase
    .from('lender_policies')
    .upsert(
      { client_id: client.id, ...ZWANE_POLICY },
      { onConflict: 'client_id' },
    )
    .select()
    .single();

  if (pErr) { console.error('❌  Policy upsert failed:', pErr.message); process.exit(1); }

  console.log('\n✅  Lender policy seeded:');
  console.log(`    ID:          ${policy.id}`);
  console.log(`    Client:      ${client.name} (${client.slug})`);
  console.log(`    Display:     ${policy.display_name}`);
  console.log(`    Base rate:   ${policy.base_rate_pct}% p.a.`);
  console.log(`    Range:       R ${policy.min_amount.toLocaleString()} – R ${policy.max_amount.toLocaleString()}`);
  console.log(`    Min score:   ${policy.min_credit_score}`);
  console.log(`    Active:      ${policy.active ? '🟢 YES — live in Mint marketplace' : '🔴 NO — inactive'}`);
  console.log('');
  console.log('  Next: test the endpoint —');
  console.log('  curl -X POST http://localhost:3001/api/marketplace/evaluate \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"creditScore":680,"monthlyIncome":45000,"existingMonthlyObligations":8000,');
  console.log('            "requestedAmount":100000,"termMonths":24,"idVerified":true,"openDefaults":0}\'');
}

main().catch(e => { console.error(e); process.exit(1); });
