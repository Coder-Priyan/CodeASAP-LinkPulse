import { describe, it, expect } from "vitest";
import { assertSafeTestDatabase } from "./global-setup";

describe("Test Database Safety Guard (A1 & A2)", () => {
  const primaryUrl =
    "postgresql://appuser:secret123@ep-primary-host.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require";
  const directUrl =
    "postgresql://appuser:secret123@ep-direct-host.ap-southeast-1.aws.neon.tech:5432/neondb";

  it("Case 1: aborts when TEST_DATABASE_URL is unset", () => {
    expect(() => assertSafeTestDatabase(undefined, primaryUrl, directUrl, undefined)).toThrow(
      /TEST_DATABASE_URL is not set/
    );
  });

  it("Case 2: aborts when TEST_DATABASE_URL is equal to DATABASE_URL", () => {
    expect(() => assertSafeTestDatabase(primaryUrl, primaryUrl, directUrl, undefined)).toThrow(
      /TEST_DATABASE_URL matches DATABASE_URL/
    );
  });

  it("Case 3: aborts when TEST_DATABASE_URL has same host/port/database with different password", () => {
    const diffCredsSameDb =
      "postgresql://otheruser:diffpassword@ep-primary-host.ap-southeast-1.aws.neon.tech:5432/neondb";
    expect(() =>
      assertSafeTestDatabase(diffCredsSameDb, primaryUrl, directUrl, undefined)
    ).toThrow(/TEST_DATABASE_URL matches DATABASE_URL/);
  });

  it("Case 4: aborts when target is a remote host without 'test' in database name", () => {
    const remoteNonTestDb =
      "postgresql://testuser:testpass@ep-remote-db.ap-southeast-1.aws.neon.tech:5432/production_replica";
    expect(() =>
      assertSafeTestDatabase(remoteNonTestDb, primaryUrl, directUrl, undefined)
    ).toThrow(/Remote non-test database rejected/);

    // But succeeds if explicit ALLOW_REMOTE_TEST_DB=1 is provided
    const endpoint = assertSafeTestDatabase(remoteNonTestDb, primaryUrl, directUrl, "1");
    expect(endpoint.host).toBe("ep-remote-db.ap-southeast-1.aws.neon.tech");
    expect(endpoint.database).toBe("production_replica");
  });

  it("Case 5: allows valid local test URLs", () => {
    const localDb = "postgresql://postgres:postgres@localhost:5432/linkpulse_test";
    const endpoint = assertSafeTestDatabase(localDb, primaryUrl, directUrl, undefined);
    expect(endpoint.host).toBe("localhost");
    expect(endpoint.port).toBe("5432");
    expect(endpoint.database).toBe("linkpulse_test");

    const dockerDb = "postgresql://postgres:postgres@host.docker.internal:5433/any_db";
    const dockerEndpoint = assertSafeTestDatabase(dockerDb, primaryUrl, directUrl, undefined);
    expect(dockerEndpoint.host).toBe("host.docker.internal");
  });

  it("Case 6: aborts when TEST_DATABASE_URL matches DIRECT_URL", () => {
    const matchingDirect =
      "postgresql://otheruser:diffpassword@ep-direct-host.ap-southeast-1.aws.neon.tech:5432/neondb";
    expect(() =>
      assertSafeTestDatabase(matchingDirect, primaryUrl, directUrl, undefined)
    ).toThrow(/TEST_DATABASE_URL matches DIRECT_URL/);
  });
});
