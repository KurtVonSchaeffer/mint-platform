-- Run in Supabase SQL editor.
-- Adds reminder tracking to the AlgoLend client-billing `invoices` table so
-- /api/invoices/reminders-cron can nag overdue clients periodically without
-- re-sending on every daily run. Mirrors the reminder_count/reminder_sent_at
-- columns already used by biztech_invoices for the same purpose.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count    integer NOT NULL DEFAULT 0;
