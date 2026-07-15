-- =====================================================================
-- 028 · BizTech invoice reminder cap
-- =====================================================================
-- Tracks how many automated overdue-payment reminders have been sent
-- for a BizTech invoice, so the cron job can stop after 3 instead of
-- nagging indefinitely.
-- =====================================================================

alter table biztech_invoices
  add column if not exists reminder_count int not null default 0;
