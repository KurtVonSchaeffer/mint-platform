#!/usr/bin/env node
/**
 * reset-to-real-data.mjs
 * ─────────────────────
 * Removes all demo/test data from Supabase and seeds Zwane Official
 * as the single real client.
 *
 * Usage (from repo root):
 *   node --env-file=apps/mint-admin/.env.local scripts/reset-to-real-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('    Run: node --env-file=apps/mint-admin/.env.local scripts/reset-to-real-data.mjs');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

// ── IDs of the fake dev-seed clients ────────────────────────────────
const FAKE_CLIENT_IDS = [
  '1bd30622-b927-41ac-a80c-2dec79eba17d', // Summit Lending
  '85faee0c-dd22-4554-bfc1-75e90034fbf0', // Nexus Business Finance
  '42c34b16-a7d5-4487-bbfe-d1b7f7a93814', // Apex Credit Solutions
  '7f08164e-bf17-4451-a449-647c0d33efd0', // BridgeCapital Finance
  // Legacy seed UUIDs (if run before)
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
];

async function run() {
  console.log('\n🧹  Cleaning fake data from Supabase…\n');

  // ── 1. Soft-delete fake clients (sets deleted_at so they vanish from all queries)
  const { data: deletedClients, error: clientErr } = await sb
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', FAKE_CLIENT_IDS)
    .select('name');

  if (clientErr) {
    console.error('❌  Failed to delete fake clients:', clientErr.message);
  } else {
    const names = (deletedClients ?? []).map(c => c.name).join(', ');
    console.log(`✅  Soft-deleted ${deletedClients?.length ?? 0} fake clients: ${names || 'none found'}`);
  }

  // ── 2. Hard-delete ALL leads (all current ones are test / demo data)
  const { error: leadsErr, count: leadsCount } = await sb
    .from('leads')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // match-all guard

  if (leadsErr) {
    console.error('❌  Failed to delete leads:', leadsErr.message);
  } else {
    console.log(`✅  Deleted ${leadsCount ?? '?'} fake/test leads`);
  }

  // ── 3. Seed Zwane Official as the single real client ────────────────
  console.log('\n🌱  Seeding Zwane Official…\n');

  const ZWANE_ID = '10000000-0000-0000-0000-000000000001';

  const { error: zwaneErr } = await sb
    .from('clients')
    .upsert({
      id:                 ZWANE_ID,
      slug:               'zwane-official',
      name:               'Zwane Official',
      legal_name:         'Zwane Official Financial Services (Pty) Ltd',
      subdomain:          'zwane-official',
      ncr_number:         'NCRCP98765',
      tier:               'growth',
      status:             'active',
      primary_color:      '#7C3AED',
      secondary_color:    '#1A1F36',
      contact_email:      'admin@zwaneofficial.co.za',
      contact_name:       'Zwane Official',
      monthly_fee_cents:  2200000,  // R 22,000 / mo
      api_quota:          10000,
      activated_at:       '2026-04-01T00:00:00.000Z',
      deleted_at:         null,
    }, { onConflict: 'id' });

  if (zwaneErr) {
    console.error('❌  Failed to seed Zwane:', zwaneErr.message);
  } else {
    console.log('✅  Zwane Official upserted (growth · R 22k/mo · 10k API quota)');
  }

  // ── 4. Seed Zwane features (growth tier defaults) ───────────────────
  const GROWTH_FEATURES = [
    'open_banking', 'e_contracts', 'credit_scoring',
    'sacrra_bureau', 'multi_branch', 'term_loans',
    'whatsapp_notify', 'sure_systems',
  ];

  const featureRows = GROWTH_FEATURES.map(flag => ({
    client_id:  ZWANE_ID,
    flag,
    enabled:    true,
    enabled_at: '2026-04-01T00:00:00.000Z',
  }));

  const { error: featErr } = await sb
    .from('client_features')
    .upsert(featureRows, { onConflict: 'client_id,flag', ignoreDuplicates: false });

  if (featErr) {
    console.error('❌  Failed to seed Zwane features:', featErr.message);
  } else {
    console.log(`✅  ${GROWTH_FEATURES.length} growth-tier features enabled for Zwane`);
  }

  // ── 5. Verify final state ────────────────────────────────────────────
  const { data: finalClients } = await sb
    .from('clients')
    .select('name, tier, status, monthly_fee_cents')
    .is('deleted_at', null)
    .order('created_at');

  const { data: finalLeads } = await sb
    .from('leads')
    .select('company, status');

  console.log('\n── Final state ─────────────────────────────────────────');
  console.log(`   Clients (${finalClients?.length ?? 0}):`);
  (finalClients ?? []).forEach(c =>
    console.log(`     • ${c.name}  [${c.tier}]  ${c.status}  R ${(c.monthly_fee_cents/100).toLocaleString()}/mo`));
  console.log(`   Leads (${finalLeads?.length ?? 0}):`);
  (finalLeads ?? []).forEach(l => console.log(`     • ${l.company}  [${l.status}]`));
  console.log('────────────────────────────────────────────────────────\n');
  console.log('✨  Done.\n');
}

run().catch(err => { console.error(err); process.exit(1); });
