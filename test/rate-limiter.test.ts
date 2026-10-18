import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import {
  checkLinkCreationRateLimit,
  checkLoginRateLimit,
  resetLoginRateLimitForTesting,
  RateLimitError,
} from "@/lib/services/rate-limiter";
import {
  checkPasswordRateLimit,
  recordPasswordAttempt,
  PasswordRateLimitError,
} from "@/lib/services/password-rate-limiter";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

let mockUser: { userId: string; role: Role; email: string } | null = null;

vi.mock("@/lib/auth/guard", () => {
  class AuthError extends Error {
    constructor(message: string, public status: number = 401) {
      super(message);
      this.name = "AuthError";
    }
  }

  return {
    AuthError,
    requireAuth: vi.fn(async () => {
      if (!mockUser) {
        throw new AuthError("Authentication required.", 401);
      }
      return mockUser;
    }),
  };
});

import { POST as createLinkHandler } from "@/app/api/links/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";

describe("7. Rate Limiting", () => {
  let testUserId: string;
  let testUserEmail: string;
  let testLinkId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    testUserEmail = `test-ratelimit-${Date.now()}@linkpulse.test`;
    const user = await db.user.create({
      data: {
        email: testUserEmail,
        passwordHash: "hash",
        role: Role.USER,
      },
    });
    testUserId = user.id;

    const link = await db.link.create({
      data: {
        code: `test-rl-link-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/dest",
        userId: testUserId,
      },
    });
    testLinkId = link.id;
    createdLinkIds.push(link.id);
  });

  afterAll(async () => {
    if (testLinkId) {
      await db.passwordAttempt.deleteMany({ where: { linkId: testLinkId } });
    }
    if (createdLinkIds.length > 0) {
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  describe("Link Creation Rate Limiting (15 links / minute)", () => {
    it("allows creating up to 15 links per minute, and blocks creating the 16th link", async () => {
      // 1. Initial state (1 link created in beforeAll) -> count = 1 (< 15), so check passes
      await expect(checkLinkCreationRateLimit(testUserId)).resolves.not.toThrow();

      // 2. Insert 13 more links -> total 14 links
      for (let i = 0; i < 13; i++) {
        const l = await db.link.create({
          data: {
            code: `rl-fill-${i}-${Date.now()}`,
            destinationUrl: `https://pulse-safe-test-target.org/${i}`,
            userId: testUserId,
          },
        });
        createdLinkIds.push(l.id);
      }
      // With 14 links in the window, check passes (allowing the 15th link to be created)
      await expect(checkLinkCreationRateLimit(testUserId)).resolves.not.toThrow();

      // 3. Insert the 15th link
      const fifteenthLink = await db.link.create({
        data: {
          code: `rl-fill-14-${Date.now()}`,
          destinationUrl: "https://pulse-safe-test-target.org/14",
          userId: testUserId,
        },
      });
      createdLinkIds.push(fifteenthLink.id);

      // 4. User now has exactly 15 links in the past minute -> check must block the 16th link
      await expect(checkLinkCreationRateLimit(testUserId)).rejects.toThrowError(RateLimitError);
    });

    it("rejects client bypass attempt: POST /api/links with {'skipRateLimit': true} on the 16th link returns 429", async () => {
      mockUser = { userId: testUserId, email: testUserEmail, role: Role.USER };

      // testUserId already has 15 links in the current 1-minute window from the test above
      const count = await db.link.count({ where: { userId: testUserId } });
      expect(count).toBe(15);

      // Attempting to create the 16th link with skipRateLimit: true must be blocked
      const req = new NextRequest("http://localhost:3000/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: "https://pulse-safe-test-target.org/bypass-attempt",
          skipRateLimit: true, // Malicious client attempt to bypass rate limiter
        }),
      });

      const res = await createLinkHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("RATE_LIMITED");
      expect(data.error).toContain("Rate limit exceeded");
    });
  });

  describe("Password Attempt Rate Limiting (5 failed attempts / 15 minutes)", () => {
    it("blocks visitor IP after 5 failed passcode attempts and resets after success", async () => {
      const testIp = "203.0.113.42";
      const differentIp = "203.0.113.43";

      // 1. Initially allowed
      await expect(checkPasswordRateLimit(testLinkId, testIp)).resolves.not.toThrow();

      // 2. Record 4 failed attempts -> still allowed
      for (let i = 0; i < 4; i++) {
        await recordPasswordAttempt(testLinkId, testIp, false);
      }
      await expect(checkPasswordRateLimit(testLinkId, testIp)).resolves.not.toThrow();

      // 3. Record 5th failed attempt -> reaches threshold
      await recordPasswordAttempt(testLinkId, testIp, false);

      // 4. checkPasswordRateLimit must throw PasswordRateLimitError
      await expect(checkPasswordRateLimit(testLinkId, testIp)).rejects.toThrowError(
        PasswordRateLimitError
      );

      // 5. Different IP is NOT blocked
      await expect(checkPasswordRateLimit(testLinkId, differentIp)).resolves.not.toThrow();

      // 6. When correct passcode is entered, prior failures are cleared
      await recordPasswordAttempt(testLinkId, testIp, true);
      await expect(checkPasswordRateLimit(testLinkId, testIp)).resolves.not.toThrow();
    });
  });

  describe("Login Rate Limiting (10 attempts / 1 minute)", () => {
    it("allows up to 10 login attempts per minute and blocks the 11th", async () => {
      const clientIp = "198.51.100.1";
      resetLoginRateLimitForTesting(clientIp);

      // 10 attempts allowed
      for (let i = 0; i < 10; i++) {
        await expect(checkLoginRateLimit(clientIp)).resolves.not.toThrow();
      }

      // 11th attempt must be rejected with 429 RateLimitError
      await expect(checkLoginRateLimit(clientIp)).rejects.toThrowError(RateLimitError);

      try {
        await checkLoginRateLimit(clientIp);
      } catch (err: any) {
        expect(err.name).toBe("RateLimitError");
        expect(err.retryAfterSeconds).toBeGreaterThan(0);
        expect(err.message).toContain("Too many login attempts");
      }

      // Cleanup
      resetLoginRateLimitForTesting(clientIp);
    });

    it("returns HTTP 429 Too Many Requests when POST /api/auth/login exceeds threshold", async () => {
      const clientIp = "198.51.100.99";
      resetLoginRateLimitForTesting(clientIp);

      for (let i = 0; i < 10; i++) {
        await checkLoginRateLimit(clientIp);
      }

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": clientIp,
        },
        body: JSON.stringify({ email: "victim@example.com", password: "wrongpassword" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBeDefined();
      const body = await res.json();
      expect(body.error).toContain("Too many login attempts");

      resetLoginRateLimitForTesting(clientIp);
    });

    it("prioritizes trusted x-real-ip header over client-supplied x-forwarded-for to prevent spoofing", async () => {
      const realIp = "203.0.113.100";
      const spoofedForwarded = "1.2.3.4, 5.6.7.8";
      resetLoginRateLimitForTesting(realIp);
      resetLoginRateLimitForTesting("1.2.3.4");

      // Exhaust limit on realIp
      for (let i = 0; i < 10; i++) {
        await checkLoginRateLimit(realIp);
      }

      // Request with realIp and spoofed x-forwarded-for should be blocked because realIp is exhausted
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": realIp,
          "x-forwarded-for": spoofedForwarded,
        },
        body: JSON.stringify({ email: "victim@example.com", password: "wrongpassword" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(429);

      resetLoginRateLimitForTesting(realIp);
    });
  });
});
