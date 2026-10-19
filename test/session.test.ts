import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getJwtSecret } from "@/lib/auth/session";

describe("Session JWT Secret Guard (DB-free)", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;
  const originalSecret = env.JWT_SECRET;

  afterEach(() => {
    env.NODE_ENV = originalEnv;
    env.JWT_SECRET = originalSecret;
  });

  it("throws in production when JWT_SECRET is unset", () => {
    env.NODE_ENV = "production";
    delete env.JWT_SECRET;

    expect(() => getJwtSecret()).toThrowError(
      /CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable must be set in production/
    );
  });

  it("throws in production when JWT_SECRET equals the dev fallback key", () => {
    env.NODE_ENV = "production";
    env.JWT_SECRET = "linkpulse-fallback-dev-secret-minimum-32-chars-key";

    expect(() => getJwtSecret()).toThrowError(
      /CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable must be set in production/
    );
  });

  it("succeeds in production when a valid custom JWT_SECRET is provided", () => {
    env.NODE_ENV = "production";
    env.JWT_SECRET = "my-secure-production-jwt-secret-key-1234567890";

    const secret = getJwtSecret();
    expect(secret).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(secret)).toBe("my-secure-production-jwt-secret-key-1234567890");
  });

  it("falls back to the dev secret in development when JWT_SECRET is unset", () => {
    env.NODE_ENV = "development";
    delete env.JWT_SECRET;

    const secret = getJwtSecret();
    expect(new TextDecoder().decode(secret)).toBe(
      "linkpulse-fallback-dev-secret-minimum-32-chars-key"
    );
  });
});
