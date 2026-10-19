import { db } from "../db";
import { Role, Prisma } from "@prisma/client";

export type AnalyticsPeriod = "7d" | "30d" | "all";

export interface AnalyticsQueryOptions {
  period?: AnalyticsPeriod;
  campaignId?: string;
  scope?: "me" | "all"; // for admins
}

export interface DayClickStat {
  date: string; // YYYY-MM-DD
  clicks: number;
}

export interface BreakdownStat {
  name: string;
  count: number;
  percentage: number;
}

export interface CampaignPerformanceStat {
  id: string;
  name: string;
  totalLinks: number;
  totalClicks: number;
  topLink?: {
    code: string;
    destinationUrl: string;
    clicks: number;
  } | null;
}

export interface LinkAlert {
  id: string;
  code: string;
  destinationUrl: string;
  type: "EXPIRING_SOON" | "NEAR_LIMIT" | "LIMIT_REACHED" | "DISABLED" | "EXPIRED";
  message: string;
}

export interface AnalyticsReport {
  period: AnalyticsPeriod;
  metrics: {
    totalClicks: number;
    uniqueVisitors: number;
    activeLinks: number;
    totalLinks: number;
    qrScans: number;
    directClicks: number;
  };
  clicksOverTime: DayClickStat[];
  sourceBreakdown: BreakdownStat[];
  deviceBreakdown: BreakdownStat[];
  browserBreakdown: BreakdownStat[];
  referrerBreakdown: BreakdownStat[];
  campaignPerformance: CampaignPerformanceStat[];
  topLinks: {
    id: string;
    code: string;
    destinationUrl: string;
    clicks: number;
    uniques: number;
  }[];
  alerts: LinkAlert[];
}

/**
 * Computes live, aggregated analytics for a user or entire platform.
 */
export async function getAnalyticsReport(
  userId: string,
  userRole: Role,
  options: AnalyticsQueryOptions = {}
): Promise<AnalyticsReport> {
  const period = options.period || "7d";
  const isPlatformScope = options.scope === "all" && userRole === Role.ADMIN;

  // 1. Establish period boundary
  const now = new Date();
  let since: Date | null = null;
  let numDays = 7;

  if (period === "7d") {
    numDays = 7;
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    numDays = 30;
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // all time
    numDays = 30; // for chart granularity fallback
    since = null;
  }

  // 2. Build Prisma link filters
  const linkWhere: Prisma.LinkWhereInput = {};
  if (!isPlatformScope) {
    linkWhere.userId = userId;
  }
  if (options.campaignId) {
    linkWhere.campaignId = options.campaignId;
  }

  // Build click event filter
  const clickWhere: Prisma.ClickEventWhereInput = {
    link: linkWhere,
  };
  if (since) {
    clickWhere.timestamp = { gte: since };
  }

  // 3. Concurrently fetch all independent telemetry and link collections in a single round
  const campaignWhere: Prisma.CampaignWhereInput = isPlatformScope ? {} : { userId };

  const [
    totalLinks,
    activeLinksCount,
    totalClicks,
    uniqueVisitorGroups,
    dailyClickAggregates,
    sourceRows,
    deviceRows,
    browserRows,
    referrerRows,
    linksInScope,
    userCampaigns,
    allUserLinks,
  ] = await Promise.all([
    db.link.count({ where: linkWhere }),
    db.link.count({
      where: {
        ...linkWhere,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    db.clickEvent.count({ where: clickWhere }),
    db.clickEvent.groupBy({
      by: ["visitorHash"],
      where: {
        ...clickWhere,
        visitorHash: { not: null },
      },
    }),
    (() => {
      const conditions: Prisma.Sql[] = [];
      if (!isPlatformScope) {
        conditions.push(Prisma.sql`l."userId" = ${userId}`);
      }
      if (options.campaignId) {
        conditions.push(Prisma.sql`l."campaignId" = ${options.campaignId}`);
      }
      if (since) {
        conditions.push(Prisma.sql`ce."timestamp" >= ${since}`);
      }
      const whereSql =
        conditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
          : Prisma.empty;

      return db.$queryRaw<{ date: string; clicks: number | bigint }[]>`
        SELECT 
          to_char(ce."timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS clicks
        FROM "ClickEvent" ce
        JOIN "Link" l ON ce."linkId" = l."id"
        ${whereSql}
        GROUP BY 1
        ORDER BY 1 ASC
      `;
    })(),
    db.clickEvent.groupBy({
      by: ["source"],
      where: clickWhere,
      _count: { id: true },
    }),
    db.clickEvent.groupBy({
      by: ["device"],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    db.clickEvent.groupBy({
      by: ["browser"],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    db.clickEvent.groupBy({
      by: ["referrer"],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    db.link.findMany({
      where: linkWhere,
      select: {
        id: true,
        code: true,
        destinationUrl: true,
        clicksCount: true,
      },
      orderBy: { clicksCount: "desc" },
      take: 5,
    }),
    db.campaign.findMany({
      where: campaignWhere,
      include: {
        links: {
          select: {
            id: true,
            code: true,
            destinationUrl: true,
            clicksCount: true,
          },
        },
      },
    }),
    db.link.findMany({
      where: linkWhere,
      select: {
        id: true,
        code: true,
        destinationUrl: true,
        isActive: true,
        expiresAt: true,
        clickLimit: true,
        clicksCount: true,
        disabledReason: true,
      },
    }),
  ]);

  const uniqueVisitors = uniqueVisitorGroups.length;

  // 4. Map Clicks Over Time (generate zero-filled daily sequence and map SQL aggregates)
  const dailyMap = new Map<string, number>();
  const startDate =
    since ||
    (dailyClickAggregates.length > 0
      ? new Date(dailyClickAggregates[0].date + "T00:00:00Z")
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

  for (const row of dailyClickAggregates) {
    dailyMap.set(row.date, Number(row.clicks));
  }

  const clicksOverTime: DayClickStat[] = Array.from(dailyMap.entries()).map(
    ([date, clicks]) => ({ date, clicks })
  );

  let qrScans = 0;
  for (const s of sourceRows) {
    if (s.source === "qr") qrScans += s._count.id;
  }
  const directClicks = Math.max(0, totalClicks - qrScans);

  const sourceBreakdown: BreakdownStat[] = [
    {
      name: "Direct / Web",
      count: directClicks,
      percentage: totalClicks > 0 ? Math.round((directClicks / totalClicks) * 100) : 0,
    },
    {
      name: "QR Code Scan",
      count: qrScans,
      percentage: totalClicks > 0 ? Math.round((qrScans / totalClicks) * 100) : 0,
    },
  ];

  const deviceBreakdown: BreakdownStat[] = deviceRows.map((r) => ({
    name: r.device || "Unknown",
    count: r._count.id,
    percentage: totalClicks > 0 ? Math.round((r._count.id / totalClicks) * 100) : 0,
  }));

  const browserBreakdown: BreakdownStat[] = browserRows.map((r) => ({
    name: r.browser || "Other",
    count: r._count.id,
    percentage: totalClicks > 0 ? Math.round((r._count.id / totalClicks) * 100) : 0,
  }));

  const referrerBreakdown: BreakdownStat[] = referrerRows.map((r) => ({
    name: r.referrer ? r.referrer.replace(/^https?:\/\//, "").replace(/\/$/, "") : "Direct / Bookmarks",
    count: r._count.id,
    percentage: totalClicks > 0 ? Math.round((r._count.id / totalClicks) * 100) : 0,
  }));

  // 6. Top Performing Links
  const topLinkIds = linksInScope.map((l) => l.id);
  const topLinkUniques =
    topLinkIds.length > 0
      ? await db.clickEvent.groupBy({
          by: ["linkId", "visitorHash"],
          where: { linkId: { in: topLinkIds }, visitorHash: { not: null } },
        })
      : [];

  const topUniqueMap = new Map<string, number>();
  for (const row of topLinkUniques) {
    topUniqueMap.set(row.linkId, (topUniqueMap.get(row.linkId) || 0) + 1);
  }

  const topLinks = linksInScope.map((l) => ({
    id: l.id,
    code: l.code,
    destinationUrl: l.destinationUrl,
    clicks: l.clicksCount,
    uniques: topUniqueMap.get(l.id) || 0,
  }));

  // 7. Campaign Performance
  const campaignPerformance: CampaignPerformanceStat[] = userCampaigns.map((camp) => {
    const totalCampClicks = camp.links.reduce((acc, l) => acc + (l.clicksCount || 0), 0);
    const top = camp.links.length > 0
      ? [...camp.links].sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0))[0]
      : null;

    return {
      id: camp.id,
      name: camp.name,
      totalLinks: camp.links.length,
      totalClicks: totalCampClicks,
      topLink: top ? { code: top.code, destinationUrl: top.destinationUrl, clicks: top.clicksCount } : null,
    };
  });

  // 8. Link Alerts
  const alerts: LinkAlert[] = [];
  const seventyTwoHoursLater = new Date(now.getTime() + 72 * 3600 * 1000);

  for (const l of allUserLinks) {
    if (!l.isActive) {
      alerts.push({
        id: l.id,
        code: l.code,
        destinationUrl: l.destinationUrl,
        type: "DISABLED",
        message: l.disabledReason || "Link is currently deactivated.",
      });
    } else if (l.expiresAt && l.expiresAt.getTime() <= now.getTime()) {
      alerts.push({
        id: l.id,
        code: l.code,
        destinationUrl: l.destinationUrl,
        type: "EXPIRED",
        message: "Link has expired.",
      });
    } else if (l.expiresAt && l.expiresAt.getTime() <= seventyTwoHoursLater.getTime()) {
      alerts.push({
        id: l.id,
        code: l.code,
        destinationUrl: l.destinationUrl,
        type: "EXPIRING_SOON",
        message: `Expires on ${new Date(l.expiresAt).toLocaleDateString()} (${Math.ceil((l.expiresAt.getTime() - now.getTime()) / 3600000)}h left).`,
      });
    }

    if (l.clickLimit !== null && l.clickLimit !== undefined) {
      if (l.clicksCount >= l.clickLimit) {
        alerts.push({
          id: l.id,
          code: l.code,
          destinationUrl: l.destinationUrl,
          type: "LIMIT_REACHED",
          message: `Reached click threshold (${l.clicksCount}/${l.clickLimit} visits).`,
        });
      } else if (l.clicksCount >= l.clickLimit * 0.8) {
        alerts.push({
          id: l.id,
          code: l.code,
          destinationUrl: l.destinationUrl,
          type: "NEAR_LIMIT",
          message: `Close to capacity: ${l.clicksCount}/${l.clickLimit} visits used (${Math.round((l.clicksCount / l.clickLimit) * 100)}%).`,
        });
      }
    }
  }

  return {
    period,
    metrics: {
      totalClicks,
      uniqueVisitors,
      activeLinks: activeLinksCount,
      totalLinks,
      qrScans,
      directClicks,
    },
    clicksOverTime,
    sourceBreakdown,
    deviceBreakdown,
    browserBreakdown,
    referrerBreakdown,
    campaignPerformance,
    topLinks,
    alerts,
  };
}
