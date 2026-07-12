-- =====================================================================
-- 026 · MINT BizTech invoice reminders (Phase 5)
-- =====================================================================
-- Tracks the last automated reminder sent per invoice, so the cron job
-- doesn't email the same overdue invoice every run. Reports (also
-- Phase 5) need no schema changes — pure aggregation over existing
-- biztech_* tables.
-- =====================================================================

alter table biztech_invoices
  add column if not exists reminder_sent_at timestamptz;

create index if not exists idx_biztech_invoices_reminder
  on biztech_invoices (due_at)
  where status in ('sent', 'overdue');
