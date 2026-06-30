-- =====================================================================
-- 019 · Lead Documents (onboarding uploads)
-- =====================================================================
-- Separate from the `documents` table (which is for borrower loan docs
-- and requires client_id/borrower_id). This table holds files uploaded
-- during the self-serve lender onboarding flow at algolend.co.za/apply.
-- Stored in Supabase Storage bucket: client-documents
-- =====================================================================

create table if not exists lead_documents (
  id            uuid        primary key default gen_random_uuid(),
  lead_id       uuid        not null references leads(id) on delete cascade,
  type          text        not null,
  file_name     text        not null,
  storage_path  text        not null,
  status        text        not null default 'pending',
  created_at    timestamptz not null default now()
);

create index if not exists idx_lead_docs_lead_id on lead_documents (lead_id);

-- Service-role only (matches leads table policy)
alter table lead_documents enable row level security;
drop policy if exists "lead_docs_service_role" on lead_documents;
create policy "lead_docs_service_role" on lead_documents
  using  ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
