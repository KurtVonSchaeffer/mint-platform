-- Add phone column to leads and make email nullable
-- (idempotent — safe to re-run)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Make email optional (leads from NCR register etc. often have no email)
DO $$
BEGIN
  ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
EXCEPTION WHEN others THEN
  NULL; -- already nullable, ignore
END;
$$;

-- Backfill empty-string emails to null for consistency
UPDATE leads SET email = NULL WHERE email = '';
