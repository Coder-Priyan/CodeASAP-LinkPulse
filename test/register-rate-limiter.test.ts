import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRegisterRateLimit,
  resetRegisterRateLimitForTesting,
  checkLoginRateLimit,
  resetLoginRateLimitForTesting,
  RateLimitError,
} from "@/lib/services/rate-limiter";

describe("Registration Rate Limiter (DB-free)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRegisterRateLimitForTesting();
    resetLoginRateLimitForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRegisterRateLimitForTesting();
    resetLoginRateLimitForTesting();
  });

  it("allows up to 5 registration attempts within the 1-hour window", async () => {
    const ip = "192.168.1.100";
    for (let i = 0; i < 5; i++) {
      await expect(checkRegisterRateLimit(ip)).resolves.not.toThrow();
    }
  });

  it("blocks the 6th attempt with a RateLimitError containing Retry-After", async () => {
    const ip = "192.168.1.100";
    for (let i = 0; i < 5; i++) {
      await checkRegisterRateLimit(ip);
    }

    let error: RateLimitError | null = null;
    try {
      await checkRegisterRateLimit(ip);
    } catch (err) {
      if (err instanceof RateLimitError) {
        error = err;
      }
    }

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Too many registration attempts");
    expect(error?.retryAfterSeconds).toBeGreaterThan(0);
    expect(error?.retryAfterSeconds).toBeLessThanOrEqual(3600);
  });

  it("maintains separate rate limit buckets for different IPs", async () => {
    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    // Exhaust limit for IP A
    for (let i = 0; i < 5; i++) {
      await checkRegisterRateLimit(ipA);
    }
    await expect(checkRegisterRateLimit(ipA)).rejects.toThrow(RateLimitError);

    // IP B must still be allowed all 5 attempts
    for (let i = 0; i < 5; i++) {
      await expect(checkRegisterRateLimit(ipB)).resolves.not.toThrow();
    }
  });

  it("ensures register attempts do not consume or affect login attempts for the same IP", async () => {
    const ip = "172.16.0.50";

    // Exhaust register limit for IP
    for (let i = 0; i < 5; i++) {
      await checkRegisterRateLimit(ip);
    }
    await expect(checkRegisterRateLimit(ip)).rejects.toThrow(RateLimitError);

    // Login limiter for same IP must still be completely untouched (allows up to 10 login attempts)
    for (let i = 0; i < 10; i++) {
      await expect(checkLoginRateLimit(ip)).resolves.not.toThrow();
    }
    await expect(checkLoginRateLimit(ip)).rejects.toThrow(RateLimitError);
  });

  it("resets and allows new attempts after the 1-hour window expires (fake timers)", async () => {
    const ip = "192.168.1.200";

    // Exhaust 5 attempts
    for (let i = 0; i < 5; i++) {
      await checkRegisterRateLimit(ip);
    }
    await expect(checkRegisterRateLimit(ip)).rejects.toThrow(RateLimitError);

    // Fast-forward time by 1 hour + 1 second
    vi.advanceTimersByTime(3601 * 1000);

    // Attempts should now succeed again
    await expect(checkRegisterRateLimit(ip)).resolves.not.toThrow();
  });
});
