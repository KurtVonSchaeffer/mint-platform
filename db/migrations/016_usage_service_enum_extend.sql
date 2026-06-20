-- =====================================================================
-- 016 · Extend usage_service enum with catalog service names
-- =====================================================================
-- The billing catalog uses short service keys (cipc, bureau, banking,
-- contracts, liveness, homeaff, watchlist, address) that were added to
-- SERVICE_RATES and VALID_SERVICES in the API after the initial enum
-- was created. This migration adds them to the enum so usage_logs
-- inserts for these services no longer fail.
-- =====================================================================

ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'cipc';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'bureau';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'banking';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'contracts';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'liveness';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'homeaff';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'watchlist';
ALTER TYPE usage_service ADD VALUE IF NOT EXISTS 'address';
