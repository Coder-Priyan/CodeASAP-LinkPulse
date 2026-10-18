import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { generateVisitorHash } from "@/lib/utils/visitor-hash";
import { recordClick } from "@/lib/services/click.service";
import { getUserLinks } from "@/lib/services/link.service";

describe("5. Privacy-Safe Unique Visitor Tracking", () => {
  let testUserId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-visitors-${Date.now()}@linkpulse.test`,
        passwordHash: "hashed",
        role: "USER",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("hashes visitor identifiers deterministically without storing raw IP", () => {
    const ipA = "192.0.2.1";
    const uaA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0";
    const ipB = "192.0.2.2";

    const hashA1 = generateVisitorHash(ipA, uaA);
    const hashA2 = generateVisitorHash(ipA, uaA);
    const hashB = generateVisitorHash(ipB, uaA);

    // Deterministic for same visitor
    expect(hashA1).toBe(hashA2);
    // Distinct for different visitor
    expect(hashA1).not.toBe(hashB);
    // Hash is 32-char hex string
    expect(hashA1).toMatch(/^[a-f0-9]{32}$/);
  });

  it("counts same visitor once and different visitors separately across multiple visits", async () => {
    const link = await db.link.create({
      data: {
        code: `test-uniq-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/unique-dest",
        userId: testUserId,
        clicksCount: 4,
      },
    });
    createdLinkIds.push(link.id);

    const visitorA = {
      ip: "198.51.100.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    };
    const visitorB = {
      ip: "198.51.100.20",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
    };

    // Visitor A visits 3 times
    await recordClick(link.id, visitorA);
    await recordClick(link.id, visitorA);
    await recordClick(link.id, visitorA);

    // Visitor B visits 1 time
    await recordClick(link.id, visitorB);

    // Verify ClickEvents recorded
    const events = await db.clickEvent.findMany({
      where: { linkId: link.id },
    });
    expect(events.length).toBe(4);

    // Verify distinct visitor hashes in DB
    const distinctHashes = new Set(events.map((e) => e.visitorHash));
    expect(distinctHashes.size).toBe(2);

    // Verify getUserLinks aggregates correctly: total clicks = 4, unique visitors = 2
    const userLinks = await getUserLinks(testUserId);
    const target = userLinks.find((l) => l.id === link.id);

    expect(target).toBeDefined();
    expect(target?.clicksCount).toBe(4);
    expect(target?.uniqueVisitorsCount).toBe(2);
  });
});
