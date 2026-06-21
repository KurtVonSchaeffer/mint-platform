-- =====================================================================
-- 002 · Profiles (extends Supabase auth.users)
-- =====================================================================
-- Supabase auth.users holds email/password/session. We attach our own
-- profile row to it for role, tenant binding, and personal info.
--
-- Trigger creates a profile automatically when a new auth user is created.
-- =====================================================================

-- ── Roles enum ──────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum (
    'borrower',
    'consultant',
    'branch_manager',
    'admin',           -- client-side admin
    'super_admin'      -- Mint Platforms staff
  );
exception when duplicate_object then null;
end $$;

-- ── Profiles ────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  client_id       uuid        references clients(id) on delete restrict,
                                  -- NULL only for super_admin users
  email           text        not null,
  full_name       text        not null,
  role            user_role   not null default 'borrower',

  -- Personal (for borrowers)
  id_number       text,                  -- SA ID number (encrypted at rest via pgcrypto if needed)
  contact_number  text,
  date_of_birth   date,
  address         jsonb,                 -- { line1, line2, city, postal_code, province }

  -- Staff (for branch_manager, consultant)
  branch_id       uuid,                  -- FK in 003 once branches exist (forward ref OK)
  avatar_url      text,

  -- Lifecycle
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

comment on table  profiles                is 'Domain profile linked 1:1 with auth.users. client_id NULL for super_admin only.';
comment on column profiles.client_id      is 'NULL only when role = super_admin. Otherwise NOT NULL is enforced by check constraint.';
comment on column profiles.role           is 'super_admin = Mint Platforms staff. All others scoped to client_id.';

-- Constraint: only super_admin may have NULL client_id
alter table profiles
  drop constraint if exists profiles_client_required;
alter table profiles
  add  constraint profiles_client_required
  check (role = 'super_admin' or client_id is not null);

create index if not exists idx_profiles_client_id on profiles (client_id) where deleted_at is null;
create index if not exists idx_profiles_role      on profiles (role)      where deleted_at is null;
create index if not exists idx_profiles_email     on profiles (email)     where deleted_at is null;

-- ── updated_at trigger ──────────────────────────────────────────────
drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function tg_set_updated_at();

-- ── Auto-create profile when auth.users row is created ──────────────
-- The signup metadata may carry client_id (sent from the borrower portal
-- as it knows its tenant) and full_name. role defaults to 'borrower'.
create or replace function tg_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, client_id, email, full_name, role, contact_number, id_number)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'borrower'::user_role),
    nullif(new.raw_user_meta_data->>'mobile', ''),
    nullif(new.raw_user_meta_data->>'id_number', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function tg_handle_new_user();

-- ── Helper: current_client_id() ─────────────────────────────────────
-- Returns the client_id of the currently-authenticated user, looking it up
-- from profiles. Used by RLS policies on every domain table.
-- SECURITY DEFINER so it can read profiles even when the caller can't.
create or replace function current_client_id()
returns uuid language sql security definer stable as $$
  select client_id from profiles where id = auth.uid()
$$;

-- ── Helper: current_role() ──────────────────────────────────────────
create or replace function current_user_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- ── Helper: is_super_admin() ────────────────────────────────────────
create or replace function is_super_admin()
returns boolean language sql security definer stable as $$
  select role = 'super_admin' from profiles where id = auth.uid()
$$;

-- ── Helper: is_staff() ─ any staff role for the current tenant ──────
create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select role in ('consultant', 'branch_manager', 'admin', 'super_admin')
  from profiles where id = auth.uid()
$$;
