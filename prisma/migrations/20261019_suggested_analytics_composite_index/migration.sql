-- Suggested Index Optimization for Analytics SQL Aggregation (PERF-01)
--
-- RATIONALE:
-- The analytics aggregation query joins "ClickEvent" with "Link" and filters on:
--   1. "ce"."timestamp" >= $since (date range boundary)
--   2. "l"."userId" = $userId (or platform-wide)
--
-- While an index on "ClickEvent"("linkId", "timestamp" DESC) exists for single-link lookups,
-- cross-link aggregation across a user's entire account performs an index scan on timestamp.
--
-- Adding a composite index on ("timestamp", "linkId") allows PostgreSQL to perform an index
-- range scan on timestamp >= $since and resolve linkId directly from the index tuple without
-- fetching heap pages, enabling Index-Only Scans for high-volume telemetry tables.
--
-- NOTE: Do NOT apply this migration to active databases without a scheduled maintenance window.
-- When executing on production PostgreSQL / Neon, use CREATE INDEX CONCURRENTLY to prevent locking.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ClickEvent_timestamp_linkId_idx" 
ON "ClickEvent"("timestamp", "linkId");
