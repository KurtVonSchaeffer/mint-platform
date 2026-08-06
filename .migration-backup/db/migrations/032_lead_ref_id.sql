-- Add human-readable sequential reference ID to leads (AL-0001, AL-0002, ...)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ref_id TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS leads_ref_seq START 1;

-- Backfill existing leads in chronological order using ROW_NUMBER
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM leads
  WHERE ref_id IS NULL
)
UPDATE leads
SET ref_id = 'AL-' || LPAD(ordered.rn::text, 4, '0')
FROM ordered
WHERE leads.id = ordered.id;

-- Advance the sequence past the backfilled values so new leads continue from the right number
SELECT setval('leads_ref_seq', COALESCE(MAX(CAST(SUBSTRING(ref_id FROM 4) AS INTEGER)), 0))
FROM leads;

CREATE OR REPLACE FUNCTION set_lead_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := 'AL-' || LPAD(nextval('leads_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_ref_id_trigger ON leads;
CREATE TRIGGER lead_ref_id_trigger
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION set_lead_ref_id();
