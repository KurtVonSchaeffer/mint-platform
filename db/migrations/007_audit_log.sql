-- =====================================================================
-- 007 · Audit log (append-only, never UPDATE/DELETE)
-- =====================================================================
-- Required by the brief as non-negotiable for a financial product.
-- Every status change on a domain row + every privileged action
-- writes a row here. RLS blocks UPDATE/DELETE entirely.
-- =====================================================================

do $$ begin
  create type audit_action as enum (
    'create',
    'update',
    'delete',
    'status_change',
    'login',
    'logout',
    'permission_change',
    'data_export',
    'config_change',
    'integration_call'
  );
exception when duplicate_object then null;
end $$;

create table if not exists audit_log (
  id            bigserial    primary key,
  client_id     uuid         references clients(id) on delete restrict,
                              -- NULL only for super_admin platform-level events
  actor_id      uuid         references profiles(id) on delete set null,
  actor_role    user_role,                              -- snapshotted at time of action
  actor_ip      inet,

  action        audit_action not null,
  entity_type   text         not null,                   -- 'loan_applications', 'profiles', 'clients', ...
  entity_id     uuid,                                    -- the row affected
  description   text,                                    -- human-readable summary

  -- Before / after snapshots (JSONB so the schema can evolve without breaking history)
  before_data   jsonb,
  after_data    jsonb,

  occurred_at   timestamptz  not null default now()
);

comment on table audit_log is 'Append-only audit trail. UPDATE and DELETE are blocked by RLS.';

create index if not exists idx_audit_client_time    on audit_log (client_id, occurred_at desc);
create index if not exists idx_audit_entity         on audit_log (entity_type, entity_id, occurred_at desc);
create index if not exists idx_audit_actor          on audit_log (actor_id, occurred_at desc);

-- Block UPDATE and DELETE on audit_log even for owners.
-- The table is enabled for RLS below; these policies make it append-only.
alter table audit_log enable row level security;

drop policy if exists audit_log_no_update on audit_log;
create policy audit_log_no_update on audit_log
  for update using (false) with check (false);

drop policy if exists audit_log_no_delete on audit_log;
create policy audit_log_no_delete on audit_log
  for delete using (false);

-- Inserts and selects are governed by the standard tenant scoping in
-- migration 008 (rls_policies.sql).

-- ── Helper: write_audit() — invoked from app code or triggers ───────
create or replace function write_audit(
  p_client_id     uuid,
  p_action        audit_action,
  p_entity_type   text,
  p_entity_id     uuid,
  p_description   text,
  p_before_data   jsonb default null,
  p_after_data    jsonb default null
) returns void language plpgsql security definer as $$
begin
  insert into audit_log (
    client_id, actor_id, actor_role,
    action, entity_type, entity_id,
    description, before_data, after_data
  ) values (
    p_client_id,
    auth.uid(),
    current_user_role(),
    p_action, p_entity_type, p_entity_id,
    p_description, p_before_data, p_after_data
  );
end $$;

-- ── Auto-audit trigger for loan_applications status changes ─────────
create or replace function tg_audit_application_status()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform write_audit(
      new.client_id,
      'status_change'::audit_action,
      'loan_applications',
      new.id,
      format('Application %s: %s → %s', new.reference, old.status, new.status),
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'reason', new.status_reason)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_application_status on loan_applications;
create trigger trg_audit_application_status
  after update of status on loan_applications
  for each row execute function tg_audit_application_status();

-- ── Auto-audit for client_features changes ─────────────────────────
create or replace function tg_audit_client_features()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and new.enabled is distinct from old.enabled then
    perform write_audit(
      new.client_id,
      'config_change'::audit_action,
      'client_features',
      null,
      format('Feature %s: %s → %s', new.flag, old.enabled, new.enabled),
      jsonb_build_object('flag', new.flag, 'enabled', old.enabled),
      jsonb_build_object('flag', new.flag, 'enabled', new.enabled)
    );
  elsif tg_op = 'INSERT' then
    perform write_audit(
      new.client_id,
      'config_change'::audit_action,
      'client_features',
      null,
      format('Feature %s enabled', new.flag),
      null,
      jsonb_build_object('flag', new.flag, 'enabled', new.enabled)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_client_features on client_features;
create trigger trg_audit_client_features
  after insert or update on client_features
  for each row execute function tg_audit_client_features();
