import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { checkLinkCreationRateLimit, RateLimitError } from "@/lib/services/rate-limiter";
import {
  checkPasswordRateLimit,
  recordPasswordAttempt,
  PasswordRateLimitError,
} from "@/lib/services/password-rate-limiter";

describe("7. Rate Limiting", () => {
  let testUserId: string;
  let testLinkId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-ratelimit-${Date.now()}@linkpulse.test`,
        passwordHash: "hash",
        role: "USER",
      },
    });
    testUserId = user.id;

    const link = await db.link.create({
      data: {
        code: `test-rl-link-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
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
    it("allows up to 14 links, but blocks on reaching 15 links within 1 minute", async () => {
      // 1. Initial state (1 link created in beforeAll) -> under limit
      await expect(checkLinkCreationRateLimit(testUserId)).resolves.not.toThrow();

      // 2. Insert 14 more links to reach 15 links
      for (let i = 0; i < 14; i++) {
        const l = await db.link.create({
          data: {
            code: `rl-fill-${i}-${Date.now()}`,
            destinationUrl: `https://example.com/${i}`,
            userId: testUserId,
          },
        });
        createdLinkIds.push(l.id);
      }

      // 3. User now has 15 links in past minute -> checkLinkCreationRateLimit must throw RateLimitError
      await expect(checkLinkCreationRateLimit(testUserId)).rejects.toThrowError(RateLimitError);
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
});
