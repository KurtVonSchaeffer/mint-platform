-- =====================================================================
-- DEV SEED · sample clients, profiles, and applications
-- =====================================================================
-- Run AFTER the 8 migrations have applied.
-- Idempotent: each insert uses ON CONFLICT DO NOTHING.
-- =====================================================================

-- ── Clients ─────────────────────────────────────────────────────────
insert into clients (id, slug, name, legal_name, subdomain, ncr_number, tier, status,
                     primary_color, secondary_color, contact_email, monthly_fee_cents, api_quota)
values
  ('00000000-0000-0000-0000-000000000001',
   'bridgecapital', 'BridgeCapital Finance', 'BridgeCapital Finance (Pty) Ltd',
   'bridgecapital', 'NCRCP22892', 'enterprise', 'active',
   '#7C3AED', '#1A1F36', 'ops@bridgecapital.co.za', 4500000, 20000),

  ('00000000-0000-0000-0000-000000000002',
   'apexcredit', 'Apex Credit Solutions', 'Apex Credit Solutions (Pty) Ltd',
   'apex', 'NCRCP12345', 'growth', 'active',
   '#0EA5E9', '#0F172A', 'admin@apex.co.za', 2200000, 10000),

  ('00000000-0000-0000-0000-000000000003',
   'nexusbiz', 'Nexus Business Finance', 'Nexus Business Finance (Pty) Ltd',
   'nexus', 'NCRCP34567', 'growth', 'active',
   '#059669', '#1F2937', 'finance@nexusbiz.co.za', 2200000, 10000),

  ('00000000-0000-0000-0000-000000000004',
   'elevatecap', 'Elevate Capital', 'Elevate Capital (Pty) Ltd',
   'elevate', 'NCRCP45678', 'growth', 'suspended',
   '#DC2626', '#1F2937', 'admin@elevate.co.za', 2200000, 10000),

  ('00000000-0000-0000-0000-000000000005',
   'summit', 'Summit Lending', 'Summit Lending (Pty) Ltd',
   'summit', null, 'core', 'trial',
   '#D97706', '#1F2937', 'hello@summit.co.za', 800000, 2000)
on conflict (id) do nothing;

-- ── Default feature flags per client ────────────────────────────────
insert into client_features (client_id, flag, enabled, enabled_at) values
  -- BridgeCapital (enterprise — everything on)
  ('00000000-0000-0000-0000-000000000001', 'open_banking',       true, now()),
  ('00000000-0000-0000-0000-000000000001', 'e_contracts',        true, now()),
  ('00000000-0000-0000-0000-000000000001', 'credit_scoring',     true, now()),
  ('00000000-0000-0000-0000-000000000001', 'sacrra_bureau',      true, now()),
  ('00000000-0000-0000-0000-000000000001', 'multi_branch',       true, now()),
  ('00000000-0000-0000-0000-000000000001', 'whatsapp_notify',    true, now()),
  ('00000000-0000-0000-0000-000000000001', 'advanced_analytics', true, now()),
  ('00000000-0000-0000-0000-000000000001', 'sure_systems',       true, now()),
  -- Apex (growth)
  ('00000000-0000-0000-0000-000000000002', 'open_banking',   true, now()),
  ('00000000-0000-0000-0000-000000000002', 'e_contracts',    true, now()),
  ('00000000-0000-0000-0000-000000000002', 'credit_scoring', true, now()),
  ('00000000-0000-0000-0000-000000000002', 'sacrra_bureau',  true, now()),
  ('00000000-0000-0000-0000-000000000002', 'term_loans',     true, now()),
  -- Summit (core trial — minimal)
  ('00000000-0000-0000-0000-000000000005', 'term_loans',     true, now())
on conflict do nothing;

-- Note: profiles + applications + loans seed data requires real auth.users
-- rows. Create test users via Supabase Auth UI or supabase.auth.signUp() —
-- the on_auth_user_created trigger will populate profiles automatically.
-- Set raw_user_meta_data.client_id when signing up to scope them to a tenant.
