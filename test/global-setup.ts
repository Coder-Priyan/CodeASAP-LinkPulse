/**
 * Vitest Global Setup: Hardened Database Safety Guard
 *
 * Prevents automated test suites from executing destructive database operations
 * against production, development, or primary databases.
 *
 * Requirements:
 * 1. Loads .env explicitly via dotenv to ensure DATABASE_URL and DIRECT_URL are populated.
 * 2. Requires TEST_DATABASE_URL to be set and syntactically valid.
 * 3. Compares parsed (host + port + database name) against DATABASE_URL and DIRECT_URL.
 * 4. Requires test host to be localhost/127.0.0.1/host.docker.internal/::1 OR database name to contain "test"
 *    (allows override only if ALLOW_REMOTE_TEST_DB=1).
 * 5. Safely redirects DATABASE_URL and DIRECT_URL to the test database.
 */

import dotenv from "dotenv";
import path from "path";

export interface ParsedDbEndpoint {
  host: string;
  port: string;
  database: string;
}

export function parseDatabaseUrl(rawUrl: string, varName: string): ParsedDbEndpoint {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const port = url.port || "5432";
    const database = url.pathname.replace(/^\//, "").split("?")[0].toLowerCase();
    return { host, port, database };
  } catch (err: any) {
    throw new Error(
      `\n====================================================================\n` +
      `🚨 TEST DATABASE SAFETY GUARD ABORT: Malformed ${varName}!\n` +
      `====================================================================\n` +
      `Could not parse ${varName} as a valid connection URL: ${err?.message || err}\n` +
      `====================================================================\n`
    );
  }
}

export function assertSafeTestDatabase(
  testDbUrl: string | undefined,
  primaryDbUrl: string | undefined,
  directDbUrl: string | undefined,
  allowRemoteOverride: string | undefined
) {
  if (!testDbUrl || !testDbUrl.trim()) {
    throw new Error(
      "\n====================================================================\n" +
      "🚨 TEST DATABASE SAFETY GUARD ABORT: TEST_DATABASE_URL is not set!\n" +
      "====================================================================\n" +
      "To protect live and development databases from destructive test cleanups,\n" +
      "tests will not run against DATABASE_URL or DIRECT_URL.\n\n" +
      "Please configure an isolated TEST_DATABASE_URL (e.g. local PostgreSQL container\n" +
      "or separate Neon development branch).\n\n" +
      "See .env.test.example and README.md for setup instructions.\n" +
      "====================================================================\n"
    );
  }

  const testEndpoint = parseDatabaseUrl(testDbUrl.trim(), "TEST_DATABASE_URL");

  // Check 1: Must not match primary DATABASE_URL
  if (primaryDbUrl && primaryDbUrl.trim()) {
    const primaryEndpoint = parseDatabaseUrl(primaryDbUrl.trim(), "DATABASE_URL");
    if (
      testEndpoint.host === primaryEndpoint.host &&
      testEndpoint.port === primaryEndpoint.port &&
      testEndpoint.database === primaryEndpoint.database
    ) {
      throw new Error(
        "\n====================================================================\n" +
        "🚨 TEST DATABASE SAFETY GUARD ABORT: TEST_DATABASE_URL matches DATABASE_URL!\n" +
        "====================================================================\n" +
        `Target database (${testEndpoint.host}:${testEndpoint.port}/${testEndpoint.database})\n` +
        "matches primary DATABASE_URL. Refusing to run tests against your active database.\n" +
        "====================================================================\n"
      );
    }
  }

  // Check 2: Must not match DIRECT_URL (used by Prisma schema for direct connections)
  if (directDbUrl && directDbUrl.trim()) {
    const directEndpoint = parseDatabaseUrl(directDbUrl.trim(), "DIRECT_URL");
    if (
      testEndpoint.host === directEndpoint.host &&
      testEndpoint.port === directEndpoint.port &&
      testEndpoint.database === directEndpoint.database
    ) {
      throw new Error(
        "\n====================================================================\n" +
        "🚨 TEST DATABASE SAFETY GUARD ABORT: TEST_DATABASE_URL matches DIRECT_URL!\n" +
        "====================================================================\n" +
        `Target database (${testEndpoint.host}:${testEndpoint.port}/${testEndpoint.database})\n` +
        "matches DIRECT_URL. Refusing to run tests against your active direct database.\n" +
        "====================================================================\n"
      );
    }
  }

  // Check 3: Safety classification: Must be local host OR db name must contain "test"
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "host.docker.internal", "::1"]);
  const isLocalHost = LOCAL_HOSTS.has(testEndpoint.host);
  const hasTestInDbName = testEndpoint.database.includes("test");
  const isRemoteOverrideAllowed = allowRemoteOverride === "1";

  if (!isLocalHost && !hasTestInDbName && !isRemoteOverrideAllowed) {
    throw new Error(
      "\n====================================================================\n" +
      "🚨 TEST DATABASE SAFETY GUARD ABORT: Remote non-test database rejected!\n" +
      "====================================================================\n" +
      `Host '${testEndpoint.host}' is not a local host and database '${testEndpoint.database}'\n` +
      `does not contain 'test' in its name.\n\n` +
      `To protect remote production/staging instances, test runs against remote\n` +
      `databases without 'test' in the database name are strictly forbidden.\n` +
      `If you are intentionally targeting this remote database, set ALLOW_REMOTE_TEST_DB=1.\n` +
      "====================================================================\n"
    );
  }

  return testEndpoint;
}

export default function setup() {
  // 1. Explicitly load .env from project root before comparison
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  const testDbUrl = process.env.TEST_DATABASE_URL?.trim();
  const dbUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  const allowRemoteOverride = process.env.ALLOW_REMOTE_TEST_DB?.trim();

  // 2. Validate safety constraints
  const testEndpoint = assertSafeTestDatabase(testDbUrl, dbUrl, directUrl, allowRemoteOverride);

  // 3. Print sanitized endpoint info (host + database name, zero passwords)
  console.log(
    `[TestDB Guard] Verified isolated test database: host="${testEndpoint.host}:${testEndpoint.port}", database="${testEndpoint.database}"`
  );

  // 4. Override DATABASE_URL and DIRECT_URL so Prisma initializes against TEST_DATABASE_URL
  process.env.DATABASE_URL = testDbUrl;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL || testDbUrl;
}
