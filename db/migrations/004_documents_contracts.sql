-- =====================================================================
-- 004 · Documents + contracts
-- =====================================================================
-- Documents = anything the borrower or system uploaded (payslip, bank
-- statement, ID copy, etc.) stored in Supabase Storage with metadata here.
--
-- Contracts = loan agreements generated from templates + signed via
-- DocuSeal (or other provider). Append-only audit of signed PDFs.
-- =====================================================================

do $$ begin
  create type document_category as enum (
    'identity',        -- ID / passport / director ID
    'cipc',            -- CIPC registration certificate
    'payslip',
    'bank_statement',
    'financial_statement',
    'tax_clearance',
    'contract',        -- the loan agreement itself
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type document_status as enum ('uploaded', 'pending_review', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists documents (
  id              uuid              primary key default gen_random_uuid(),
  client_id       uuid              not null references clients(id) on delete restrict,
  application_id  uuid              references loan_applications(id) on delete cascade,
  borrower_id     uuid              not null references profiles(id) on delete restrict,

  category        document_category not null default 'other',
  filename        text              not null,
  mime_type       text,
  size_bytes      bigint,
  storage_path    text              not null,                  -- Supabase Storage object path
  storage_bucket  text              not null default 'documents',

  status          document_status   not null default 'uploaded',
  ocr_data        jsonb,                                       -- parsed result, when OCR runs
  verified_by     uuid              references profiles(id) on delete set null,
  verified_at     timestamptz,
  rejection_reason text,

  uploaded_at     timestamptz       not null default now(),
  deleted_at      timestamptz
);

comment on table  documents              is 'File metadata for documents in Supabase Storage. Storage path is canonical.';
comment on column documents.application_id is 'NULL if uploaded outside an application (e.g. KYC docs uploaded once and reused).';

create index if not exists idx_docs_application on documents (application_id) where deleted_at is null;
create index if not exists idx_docs_borrower    on documents (borrower_id)    where deleted_at is null;
create index if not exists idx_docs_client_cat  on documents (client_id, category) where deleted_at is null;

-- ── Contracts ───────────────────────────────────────────────────────
do $$ begin
  create type contract_status as enum ('draft', 'sent', 'signed', 'declined', 'expired', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists contracts (
  id              uuid             primary key default gen_random_uuid(),
  client_id       uuid             not null references clients(id) on delete restrict,
  application_id  uuid             not null references loan_applications(id) on delete restrict,

  -- Provider (DocuSeal, Adobe Sign, internal)
  provider              text          not null default 'docuseal',
  provider_envelope_id  text,                                  -- DocuSeal submission ID
  template_id           text,

  -- Branded content snapshot (at the time of sending)
  content_pdf_url       text,                                  -- generated PDF, pre-signature
  signed_pdf_url        text,                                  -- final signed copy
  certificate_url       text,                                  -- DocuSeal certificate of completion

  status                contract_status not null default 'draft',
  signed_at             timestamptz,
  expires_at            timestamptz,

  created_at            timestamptz     not null default now(),
  updated_at            timestamptz     not null default now()
);

create index if not exists idx_contracts_application on contracts (application_id);
create index if not exists idx_contracts_client_status on contracts (client_id, status);

drop trigger if exists set_contracts_updated_at on contracts;
create trigger set_contracts_updated_at
  before update on contracts
  for each row execute function tg_set_updated_at();
