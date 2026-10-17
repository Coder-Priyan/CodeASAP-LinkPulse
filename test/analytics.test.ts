import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createCampaign } from "@/lib/services/campaign.service";
import { getAnalyticsReport } from "@/lib/services/analytics.service";
import { recordClick } from "@/lib/services/click.service";

describe("8. Live Analytics Aggregation & Data Consistency", () => {
  let testUserId: string;
  let campaignId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-analytics-${Date.now()}@linkpulse.test`,
        passwordHash: "hash",
        role: Role.USER,
      },
    });
    testUserId = user.id;

    const campaign = await createCampaign(user.id, {
      name: `Spring Launch ${Date.now()}`,
    });
    campaignId = campaign.id;
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (campaignId) {
      await db.campaign.delete({ where: { id: campaignId } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("accurately computes metrics, unique visitors, and campaign performance matching known telemetry", async () => {
    // 1. Create Link 1 in Campaign
    const link1 = await db.link.create({
      data: {
        code: `test-an-1-${Date.now()}`,
        destinationUrl: "https://example.com/one",
        userId: testUserId,
        campaignId,
        clicksCount: 3,
      },
    });
    createdLinkIds.push(link1.id);

    // 2. Create Link 2 in Campaign
    const link2 = await db.link.create({
      data: {
        code: `test-an-2-${Date.now()}`,
        destinationUrl: "https://example.com/two",
        userId: testUserId,
        campaignId,
        clicksCount: 2,
      },
    });
    createdLinkIds.push(link2.id);

    // 3. Create Link 3 without campaign
    const link3 = await db.link.create({
      data: {
        code: `test-an-3-${Date.now()}`,
        destinationUrl: "https://example.com/three",
        userId: testUserId,
        clicksCount: 1,
      },
    });
    createdLinkIds.push(link3.id);

    // Seed known ClickEvents
    // Visitor 1 visits Link 1 twice and Link 2 once
    const v1 = { ip: "10.10.10.1", userAgent: "Mozilla/5.0 Chrome/120.0" };
    // Visitor 2 visits Link 1 once
    const v2 = { ip: "10.10.10.2", userAgent: "Mozilla/5.0 Safari/604.1" };
    // Visitor 3 visits Link 2 once
    const v3 = { ip: "10.10.10.3", userAgent: "Mozilla/5.0 Firefox/121.0" };
    // Visitor 4 visits Link 3 once
    const v4 = { ip: "10.10.10.4", userAgent: "Mozilla/5.0 Edge/120.0" };

    await recordClick(link1.id, v1);
    await recordClick(link1.id, v1);
    await recordClick(link1.id, v2);

    await recordClick(link2.id, v1);
    await recordClick(link2.id, v3);

    await recordClick(link3.id, v4);

    // 4. Verify link stored counter vs recorded ClickEvents agreement
    const l1Events = await db.clickEvent.count({ where: { linkId: link1.id } });
    expect(link1.clicksCount).toBe(l1Events);
    expect(l1Events).toBe(3);

    const l2Events = await db.clickEvent.count({ where: { linkId: link2.id } });
    expect(link2.clicksCount).toBe(l2Events);
    expect(l2Events).toBe(2);

    const l3Events = await db.clickEvent.count({ where: { linkId: link3.id } });
    expect(link3.clicksCount).toBe(l3Events);
    expect(l3Events).toBe(1);

    // 5. Query Analytics Service
    const report = await getAnalyticsReport(testUserId, Role.USER, { period: "7d" });

    // Assert key metrics
    expect(report.metrics.totalClicks).toBe(6);
    expect(report.metrics.totalLinks).toBe(3);
    // 4 distinct visitors across the 6 visits
    expect(report.metrics.uniqueVisitors).toBe(4);

    // Assert Campaign Performance
    expect(report.campaignPerformance.length).toBe(1);
    const campStat = report.campaignPerformance[0];
    expect(campStat.id).toBe(campaignId);
    expect(campStat.totalLinks).toBe(2);
    expect(campStat.totalClicks).toBe(5); // 3 (Link 1) + 2 (Link 2)
    expect(campStat.topLink?.code).toBe(link1.code);
    expect(campStat.topLink?.clicks).toBe(3);
  });

  it("generates correct alert types including EXPIRED for expired links and DISABLED for inactive links", async () => {
    // 1. Expired link
    const expiredLink = await db.link.create({
      data: {
        code: `test-alert-exp-${Date.now()}`,
        destinationUrl: "https://example.com/expired",
        userId: testUserId,
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      },
    });
    createdLinkIds.push(expiredLink.id);

    // 2. Disabled link
    const disabledLink = await db.link.create({
      data: {
        code: `test-alert-dis-${Date.now()}`,
        destinationUrl: "https://example.com/disabled",
        userId: testUserId,
        isActive: false,
        disabledReason: "Policy hold",
      },
    });
    createdLinkIds.push(disabledLink.id);

    // 3. Limit reached link
    const limitLink = await db.link.create({
      data: {
        code: `test-alert-lim-${Date.now()}`,
        destinationUrl: "https://example.com/limit",
        userId: testUserId,
        clickLimit: 10,
        clicksCount: 10,
      },
    });
    createdLinkIds.push(limitLink.id);

    const report = await getAnalyticsReport(testUserId, Role.USER, { period: "7d" });

    const expiredAlert = report.alerts.find((a) => a.id === expiredLink.id);
    expect(expiredAlert).toBeDefined();
    expect(expiredAlert?.type).toBe("EXPIRED");
    expect(expiredAlert?.message).toBe("Link has expired.");

    const disabledAlert = report.alerts.find((a) => a.id === disabledLink.id);
    expect(disabledAlert).toBeDefined();
    expect(disabledAlert?.type).toBe("DISABLED");
    expect(disabledAlert?.message).toBe("Policy hold");

    const limitAlert = report.alerts.find((a) => a.id === limitLink.id);
    expect(limitAlert).toBeDefined();
    expect(limitAlert?.type).toBe("LIMIT_REACHED");
  });
});
