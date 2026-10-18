-- Recommended Performance Indexes for LinkPulse High-Volume Workloads
-- NOTE: As per project rules, this migration has NOT been run against the live database.
-- Run with `npx prisma migrate deploy` on production during a maintenance window.

-- 1. Composite index for user link listings ordered by creation time (Dashboard primary view)
CREATE INDEX IF NOT EXISTS "Link_userId_createdAt_idx" ON "Link"("userId", "createdAt" DESC);

-- 2. Composite index for user link listings filtered by active state
CREATE INDEX IF NOT EXISTS "Link_userId_isActive_idx" ON "Link"("userId", "isActive");

-- 3. Composite index for click aggregation by link and timestamp
CREATE INDEX IF NOT EXISTS "ClickEvent_linkId_timestamp_desc_idx" ON "ClickEvent"("linkId", "timestamp" DESC);
