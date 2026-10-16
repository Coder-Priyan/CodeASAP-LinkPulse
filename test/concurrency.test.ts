import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { incrementClickCountAtomic } from "@/lib/services/link.service";

describe("2. Click Limit Concurrency & Accuracy", () => {
  let testUserId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-concurrency-${Date.now()}@linkpulse.test`,
        passwordHash: "hashed",
        role: "USER",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("strictly enforces clickLimit under high concurrent visits without overshooting", async () => {
    const LIMIT = 5;
    const CONCURRENT_REQUESTS = 25;

    const link = await db.link.create({
      data: {
        code: `test-atomic-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: testUserId,
        clickLimit: LIMIT,
        clicksCount: 0,
      },
    });
    createdLinkIds.push(link.id);

    // Fire 25 concurrent atomic increment attempts
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      incrementClickCountAtomic(link.id, link.clickLimit)
    );

    const results = await Promise.all(promises);

    const successfulIncrements = results.filter((r) => r.success);
    const rejectedIncrements = results.filter((r) => !r.success);

    // Exactly LIMIT should succeed
    expect(successfulIncrements.length).toBe(LIMIT);
    // All other concurrent requests must be rejected
    expect(rejectedIncrements.length).toBe(CONCURRENT_REQUESTS - LIMIT);

    // Direct database verification
    const freshLink = await db.link.findUnique({
      where: { id: link.id },
      select: { clicksCount: true },
    });

    expect(freshLink?.clicksCount).toBe(LIMIT);

    // Any subsequent requests must also be rejected and never increase clicksCount
    const subsequent = await incrementClickCountAtomic(link.id, link.clickLimit);
    expect(subsequent.success).toBe(false);

    const finalLink = await db.link.findUnique({
      where: { id: link.id },
      select: { clicksCount: true },
    });
    expect(finalLink?.clicksCount).toBe(LIMIT);
  });
});
