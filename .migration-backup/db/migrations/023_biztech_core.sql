-- =====================================================================
-- 023 · MINT BizTech core data model (clients, contacts, documents)
-- =====================================================================
-- New tables for the MINT BizTech workspace (IT consulting/services CRM),
-- separate from the AlgoLend `clients` table which models lending tenants.
-- BizTech has no tenant concept of its own — it's a single internal team
-- workspace, so these tables carry no client_id/tenant scoping. Staff
-- identity comes from auth.users.id (mint-admin's own staff auth), same
-- as everywhere else in mint-admin.
--
-- Access pattern mirrors leads/lead_documents: mint-admin's API routes
-- use the service-role key server-side, so RLS is service-role-only
-- rather than per-user policies.
-- =====================================================================

-- ── Enums ───────────────────────────────────────────────────────────
do $$ begin
  create type biztech_client_status as enum ('lead', 'active', 'paused', 'archived');
exception when duplicate_object then null;
end $$;

-- ── Clients (BizTech's own — companies MINT does consulting work for) ─
create table if not exists biztech_clients (
  id              uuid                    primary key default gen_random_uuid(),
  name            text                    not null,
  industry        text,
  status          biztech_client_status   not null default 'lead',
  website         text,
  address         text,
  notes           text,
  assigned_to     uuid                    references auth.users(id) on delete set null,
  created_by      uuid                    references auth.users(id) on delete set null,
  created_at      timestamptz             not null default now(),
  updated_at      timestamptz             not null default now()
);

comment on table biztech_clients is 'MINT BizTech CRM clients — IT consulting customers, unrelated to AlgoLend''s clients (lending tenants) table.';

create index if not exists idx_biztech_clients_status       on biztech_clients (status);
create index if not exists idx_biztech_clients_assigned_to  on biztech_clients (assigned_to);

drop trigger if exists trg_biztech_clients_updated_at on biztech_clients;
create trigger trg_biztech_clients_updated_at
  before update on biztech_clients
  for each row execute function tg_set_updated_at();

-- ── Contacts (people at a BizTech client) ──────────────────────────
create table if not exists biztech_contacts (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references biztech_clients(id) on delete cascade,
  name        text        not null,
  email       text,
  phone       text,
  role        text,
  is_primary  boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_biztech_contacts_client_id on biztech_contacts (client_id);

-- ── Documents (files attached to a BizTech client) ─────────────────
-- Stored in Supabase Storage bucket: biztech-documents
create table if not exists biztech_documents (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references biztech_clients(id) on delete cascade,
  name          text        not null,
  storage_path  text        not null,
  type          text,
  uploaded_by   uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_biztech_documents_client_id on biztech_documents (client_id);

-- ── RLS: service-role only (mint-admin API routes use the service key) ─
alter table biztech_clients  enable row level security;
alter table biztech_contacts enable row level security;
alter table biztech_documents enable row level security;

drop policy if exists "biztech_clients_service_role" on biztech_clients;
create policy "biztech_clients_service_role" on biztech_clients
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_contacts_service_role" on biztech_contacts;
create policy "biztech_contacts_service_role" on biztech_contacts
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_documents_service_role" on biztech_documents;
create policy "biztech_documents_service_role" on biztech_documents
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
