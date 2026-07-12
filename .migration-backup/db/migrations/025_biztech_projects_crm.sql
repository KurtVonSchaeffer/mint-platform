-- =====================================================================
-- 025 · MINT BizTech projects + CRM activities (Phase 4)
-- =====================================================================
-- Projects: delivery work tracked per BizTech client, broken into tasks.
-- CRM activities: a simple interaction log (calls/emails/meetings/notes)
-- per client — the "CRM" module for Phase 4 is this log plus the
-- existing contacts (from Phase 2), not a full pipeline/opportunities
-- system. Service-role RLS, same as the rest of BizTech.
-- =====================================================================

do $$ begin
  create type biztech_project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type biztech_task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type biztech_activity_type as enum ('call', 'email', 'meeting', 'note');
exception when duplicate_object then null;
end $$;

-- ── Projects ────────────────────────────────────────────────────────
create table if not exists biztech_projects (
  id            uuid                     primary key default gen_random_uuid(),
  client_id     uuid                     not null references biztech_clients(id) on delete restrict,
  name          text                     not null,
  description   text,
  status        biztech_project_status   not null default 'planning',
  start_date    date,
  due_date      date,
  budget_cents  integer,

  created_by    uuid                     references auth.users(id) on delete set null,
  created_at    timestamptz              not null default now(),
  updated_at    timestamptz              not null default now()
);

create index if not exists idx_biztech_projects_client on biztech_projects (client_id);
create index if not exists idx_biztech_projects_status on biztech_projects (status);

drop trigger if exists trg_biztech_projects_updated_at on biztech_projects;
create trigger trg_biztech_projects_updated_at
  before update on biztech_projects
  for each row execute function tg_set_updated_at();

-- ── Project tasks ───────────────────────────────────────────────────
create table if not exists biztech_project_tasks (
  id            uuid                  primary key default gen_random_uuid(),
  project_id    uuid                  not null references biztech_projects(id) on delete cascade,
  title         text                  not null,
  status        biztech_task_status   not null default 'todo',
  due_date      date,
  sort_order    integer               not null default 0,
  created_at    timestamptz           not null default now(),
  updated_at    timestamptz           not null default now()
);

create index if not exists idx_biztech_project_tasks_project on biztech_project_tasks (project_id, sort_order);

drop trigger if exists trg_biztech_project_tasks_updated_at on biztech_project_tasks;
create trigger trg_biztech_project_tasks_updated_at
  before update on biztech_project_tasks
  for each row execute function tg_set_updated_at();

-- ── CRM activities (calls/emails/meetings/notes per client) ────────
create table if not exists biztech_activities (
  id            uuid                    primary key default gen_random_uuid(),
  client_id     uuid                    not null references biztech_clients(id) on delete cascade,
  type          biztech_activity_type   not null default 'note',
  summary       text                    not null,
  occurred_at   timestamptz             not null default now(),
  created_by    uuid                    references auth.users(id) on delete set null,
  created_at    timestamptz             not null default now()
);

create index if not exists idx_biztech_activities_client on biztech_activities (client_id, occurred_at desc);

-- ── RLS: service-role only ──────────────────────────────────────────
alter table biztech_projects      enable row level security;
alter table biztech_project_tasks enable row level security;
alter table biztech_activities    enable row level security;

drop policy if exists "biztech_projects_service_role" on biztech_projects;
create policy "biztech_projects_service_role" on biztech_projects
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_project_tasks_service_role" on biztech_project_tasks;
create policy "biztech_project_tasks_service_role" on biztech_project_tasks
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "biztech_activities_service_role" on biztech_activities;
create policy "biztech_activities_service_role" on biztech_activities
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
