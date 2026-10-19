-- Suggested Index Optimization for Analytics SQL Aggregation (PERF-01)
--
-- RATIONALE:
-- Analytics aggregation queries join "ClickEvent" with "Link" and filter on:
--   1. Equality/In-list on "ce"."linkId" = "l"."id" (matching links for userId / campaignId)
--   2. Range filter on "ce"."timestamp" >= $since
--
-- Relational indexing best practice requires equality columns first, followed by range columns.
-- Placing "linkId" as the leading column allows PostgreSQL to perform direct B-tree index seeks
-- on each target linkId and then narrow down the date range on "timestamp" without scanning
-- unrelated links across the entire database.
--
-- NOTE: An index on ("linkId", "timestamp" DESC) is already declared in schema.prisma:
--   @@index([linkId, timestamp(sort: Desc)], map: "ClickEvent_linkId_timestamp_desc_idx")
-- and in migration 20261018120000_performance_indexes.
-- Do NOT apply this migration if "ClickEvent_linkId_timestamp_desc_idx" has already been applied.
-- When executing on production PostgreSQL / Neon, use CREATE INDEX CONCURRENTLY to prevent table locking.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ClickEvent_linkId_timestamp_idx" 
ON "ClickEvent"("linkId", "timestamp");
