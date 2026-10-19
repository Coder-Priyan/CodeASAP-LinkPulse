import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { getAnalyticsReport } from "@/lib/services/analytics.service";

/**
 * Reference implementation of the legacy in-memory JS day-bucketing.
 * Preserved here strictly for validation against the new SQL $queryRaw aggregation.
 */
function referenceLegacyJsDayBucketing(
  clickTimestamps: { timestamp: Date }[],
  since: Date | null,
  now: Date
): { date: string; clicks: number }[] {
  const dailyMap = new Map<string, number>();
  const startDate =
    since ||
    (clickTimestamps.length > 0
      ? clickTimestamps[0].timestamp
      : new Date(now.getTime() - 7 * 86400000));
  const daysDiff = Math.max(
    1,
    Math.min(60, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24)))
  );

  for (let i = daysDiff - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }

  for (const c of clickTimestamps) {
    const key = c.timestamp.toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    } else {
      dailyMap.set(key, 1);
    }
  }

  return Array.from(dailyMap.entries()).map(([date, clicks]) => ({ date, clicks }));
}

describe("C3: PERF-01 SQL Analytics Aggregation vs Legacy Reference", () => {
  let testUserId: string;
  let testLinkId: string;
  const createdClickIds: string[] = [];

  beforeAll(async () => {
    // 1. Create test user and link
    const user = await db.user.create({
      data: {
        email: `test-sql-agg-${Date.now()}@linkpulse.test`,
        passwordHash: "dummyhash",
        role: Role.USER,
      },
    });
    testUserId = user.id;

    const link = await db.link.create({
      data: {
        code: `sql-agg-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: user.id,
      },
    });
    testLinkId = link.id;

    // 2. Seed clicks across multiple days including midnight boundaries
    // Day -3 at 14:00 UTC
    // Day -2 at 23:59:58 UTC (2 seconds before midnight)
    // Day -1 at 00:00:02 UTC (2 seconds after midnight)
    // Day -1 at 12:30:00 UTC
    // Day 0 (today) at 08:00:00 UTC
    const now = new Date();
    const timestamps = [
      new Date(now.getTime() - 3 * 86400000),
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2, 23, 59, 58)),
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 2)),
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 12, 30, 0)),
      new Date(now.getTime() - 3600000), // 1 hour ago
    ];

    for (const ts of timestamps) {
      const click = await db.clickEvent.create({
        data: {
          linkId: testLinkId,
          timestamp: ts,
          source: "direct",
        },
      });
      createdClickIds.push(click.id);
    }
  });

  afterAll(async () => {
    if (createdClickIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { id: { in: createdClickIds } } });
    }
    if (testLinkId) {
      await db.link.delete({ where: { id: testLinkId } }).catch(() => {});
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it("produces exact identical day bucketing between SQL $queryRaw aggregation and reference JS logic", async () => {
    const report = await getAnalyticsReport(testUserId, Role.USER, { period: "7d" });

    // Fetch raw click events to run through reference JS implementation
    const rawClicks = await db.clickEvent.findMany({
      where: {
        link: { userId: testUserId },
      },
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
    });

    const now = new Date();
    const since = new Date(now.getTime() - 7 * 86400000);
    const expectedLegacyOutput = referenceLegacyJsDayBucketing(rawClicks, since, now);

    // Verify lengths match
    expect(report.clicksOverTime.length).toBe(expectedLegacyOutput.length);

    // Verify total click sum matches seeded count
    const totalReportedClicks = report.clicksOverTime.reduce((acc, d) => acc + d.clicks, 0);
    expect(totalReportedClicks).toBe(createdClickIds.length);

    // Verify day-by-day mapping equality
    for (let i = 0; i < report.clicksOverTime.length; i++) {
      expect(report.clicksOverTime[i].date).toBe(expectedLegacyOutput[i].date);
      expect(report.clicksOverTime[i].clicks).toBe(expectedLegacyOutput[i].clicks);
    }
  });
});
