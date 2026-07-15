-- ── Project documents (files attached to a BizTech project) ────────
-- Stored in the same Supabase Storage bucket as client documents
-- (client-documents), under a projects/{project_id}/ path prefix.
create table if not exists biztech_project_documents (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references biztech_projects(id) on delete cascade,
  name          text        not null,
  storage_path  text        not null,
  type          text,
  uploaded_by   uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_biztech_project_documents_project_id on biztech_project_documents (project_id);

alter table biztech_project_documents enable row level security;

drop policy if exists "biztech_project_documents_service_role" on biztech_project_documents;
create policy "biztech_project_documents_service_role" on biztech_project_documents
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
