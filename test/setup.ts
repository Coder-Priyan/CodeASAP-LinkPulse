/**
 * Per-worker test setup:
 * Ensures process.env.DATABASE_URL and DIRECT_URL are pointed at TEST_DATABASE_URL
 * before any Prisma Client instances are imported.
 */

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL || process.env.TEST_DATABASE_URL;
}
