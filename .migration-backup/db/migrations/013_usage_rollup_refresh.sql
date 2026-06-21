-- =====================================================================
-- 013 · Usage rollup refresh + quota check helper
-- =====================================================================

-- Function to refresh the materialized view — call from pg_cron nightly.
-- Enable pg_cron in Supabase: Dashboard → Database → Extensions → pg_cron
create or replace function refresh_usage_rollup()
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently usage_monthly_rollup;
end;
$$;

-- ── Schedule nightly refresh at 00:05 UTC (pg_cron must be enabled) ──
-- Run once in Supabase SQL editor after enabling the pg_cron extension:
--
--   select cron.schedule(
--     'refresh-usage-rollup',
--     '5 0 * * *',
--     'select refresh_usage_rollup()'
--   );
--
-- To verify it's scheduled:
--   select * from cron.job;

-- ── Real-time quota check helper ─────────────────────────────────────
-- Returns remaining calls for a client in the current calendar month.
-- Uses usage_logs directly (not the rollup) so it's always current.
create or replace function client_quota_remaining(p_client_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_quota   integer;
  v_used    integer;
begin
  select api_quota into v_quota
  from clients
  where id = p_client_id and deleted_at is null;

  if not found then
    raise exception 'client not found: %', p_client_id;
  end if;

  select coalesce(sum(quantity), 0) into v_used
  from usage_logs
  where client_id = p_client_id
    and occurred_at >= date_trunc('month', now());

  return greatest(0, coalesce(v_quota, 10000) - v_used);
end;
$$;

comment on function client_quota_remaining(uuid) is
  'Returns remaining API calls for a client in the current month. Queries usage_logs directly for real-time accuracy.';
