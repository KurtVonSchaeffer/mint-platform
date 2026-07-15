-- =====================================================================
-- 030 · BizTech time tracking
-- =====================================================================
-- Time logged against a project (optionally against a specific task),
-- so delivery work has a record of hours spent and which of that time
-- is billable — the basis for project profitability and, later,
-- rolling billable hours into an invoice.
-- =====================================================================

create table if not exists biztech_time_entries (
  id            uuid          primary key default gen_random_uuid(),
  project_id    uuid          not null references biztech_projects(id) on delete cascade,
  task_id       uuid          references biztech_project_tasks(id) on delete set null,
  description   text,
  minutes       integer       not null check (minutes > 0),
  billable      boolean       not null default true,
  occurred_on   date          not null default current_date,

  created_by    uuid          references auth.users(id) on delete set null,
  created_at    timestamptz   not null default now()
);

create index if not exists idx_biztech_time_entries_project on biztech_time_entries (project_id, occurred_on desc);

alter table biztech_time_entries enable row level security;

drop policy if exists "biztech_time_entries_service_role" on biztech_time_entries;
create policy "biztech_time_entries_service_role" on biztech_time_entries
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
