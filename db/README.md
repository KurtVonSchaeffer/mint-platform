# AlgoLend platform — database

The canonical schema for the white-label lending platform.

## Tenancy model

**Shared Postgres database; per-client scoping via `client_id` column + Supabase RLS.**

Every domain table carries a `client_id` foreign key to `clients.id`. Row-Level
Security policies ensure every authenticated user can only see rows belonging
to their own tenant. The exceptions are:

- **`super_admin`** users — bypass tenant scoping (this is Mint Platforms staff)
- **Borrowers** — only see their own rows within their tenant
- **Lender staff** — see everything within their tenant

## How to apply

Against a **fresh Supabase project** (recommended for a clean v1):

```bash
supabase db reset
# Then run each migration in order from migrations/ via the SQL editor
# or psql:
psql "$SUPABASE_DB_URL" -f migrations/001_clients.sql
psql "$SUPABASE_DB_URL" -f migrations/002_profiles_extension.sql
psql "$SUPABASE_DB_URL" -f migrations/003_loan_applications.sql
psql "$SUPABASE_DB_URL" -f migrations/004_documents_contracts.sql
psql "$SUPABASE_DB_URL" -f migrations/005_repayments.sql
psql "$SUPABASE_DB_URL" -f migrations/006_usage_logs.sql
psql "$SUPABASE_DB_URL" -f migrations/007_audit_log.sql
psql "$SUPABASE_DB_URL" -f migrations/008_rls_policies.sql
```

## Migration order matters

Migrations have hard dependencies. **Always apply in numerical order.**

- 001 creates `clients` (the tenant root)
- 002 extends `auth.users → profiles` and adds the `client_id` scope
- 003-006 create domain tables, each `REFERENCES clients(id)`
- 007 adds audit infrastructure
- 008 adds RLS policies once all tables exist

## Money

All monetary columns are `NUMERIC(15, 2)` — exact, no float drift. Interest
rates are `NUMERIC(5, 2)` (e.g. `20.50` for 20.5% p.a.).

## Soft deletes

Domain tables have a `deleted_at TIMESTAMPTZ NULL` column. RLS policies
exclude soft-deleted rows from regular queries; super-admin can see them.

## Audit log

Every status change on `loan_applications`, every disbursement, every
feature-flag change is logged immutably to `audit_log`. The table has an
INSERT-only RLS policy — no UPDATE or DELETE permitted.

## Splitting a tenant out later

If one tenant outgrows the shared DB:

```sql
-- 1. Dump that tenant's rows
pg_dump "$SHARED_DB_URL" \
  --table=loan_applications --table=profiles --table=documents \
  --table=contracts --table=repayments --table=usage_logs --table=audit_log \
  --where="client_id = 'TARGET_UUID'" \
  > tenant-export.sql

-- 2. Restore into the new dedicated project
psql "$NEW_DB_URL" < tenant-export.sql

-- 3. Update Vercel env vars for that client's deployment
-- 4. Delete those rows from the shared DB
```

The schema is intentionally designed so that this is mechanical.
