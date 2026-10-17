/**
 * ⚠️ WARNING: DESTRUCTIVE SCRIPT
 * This seed script performs a complete clean wipe of all existing data
 * (PasswordAttempts, ClickEvents, LinkTags, Tags, Links, Campaigns, Users)
 * before populating sample records.
 * NEVER RUN THIS SCRIPT ON A DATABASE CONTAINING REAL PRODUCTION DATA.
 */

import { PrismaClient, Role, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const SALT = process.env.VISITOR_SALT || "seed-visitor-salt-2026";

function generateFakeVisitorHash(visitorKey: string): string {
  return createHash("sha256").update(`${SALT}:${visitorKey}`).digest("hex").substring(0, 32);
}

async function main() {
  if (process.env.SEED_CONFIRM !== "yes") {
    console.error(
      "❌ SEED REFUSED: The SEED_CONFIRM environment variable must equal 'yes' to run this destructive seed script.\n" +
      "This guard prevents accidental data wipes on production or shared databases.\n" +
      "Set SEED_CONFIRM=\"yes\" alongside SEED_ADMIN_PASSWORD, SEED_USER_PASSWORD, and SEED_LINK_PASSCODE to proceed."
    );
    process.exit(1);
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD;
  const linkPasscode = process.env.SEED_LINK_PASSCODE;

  if (!adminPassword || adminPassword.length < 12) {
    console.error("❌ Missing or invalid SEED_ADMIN_PASSWORD: must be at least 12 characters.");
    process.exit(1);
  }

  if (!userPassword || userPassword.length < 12) {
    console.error("❌ Missing or invalid SEED_USER_PASSWORD: must be at least 12 characters.");
    process.exit(1);
  }

  if (!linkPasscode || linkPasscode.trim().length === 0) {
    console.error("❌ Missing or invalid SEED_LINK_PASSCODE: passcode cannot be empty.");
    process.exit(1);
  }

  console.log("🌱 Starting LinkPulse database seed...");

  // 1. Clean existing records for idempotent seed
  await prisma.passwordAttempt.deleteMany();
  await prisma.clickEvent.deleteMany();
  await prisma.linkTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.link.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned old records.");

  // 2. Hash passwords provided via validated environment variables
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const userPasswordHash = await bcrypt.hash(userPassword, 12);
  const linkPasscodeHash = await bcrypt.hash(linkPasscode, 12);

  // 3. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@linkpulse.io",
      name: "Jordan Admin",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });

  const devUser = await prisma.user.create({
    data: {
      email: "alex@techcorp.dev",
      name: "Alex Rivera",
      role: Role.USER,
      passwordHash: userPasswordHash,
    },
  });

  const creatorUser = await prisma.user.create({
    data: {
      email: "sarah@creatorhub.com",
      name: "Sarah Chen",
      role: Role.USER,
      passwordHash: userPasswordHash,
    },
  });

  console.log("👤 Created 3 users: 1 ADMIN, 2 regular USERS.");

  // 4. Create Campaigns
  const campSpringLaunch = await prisma.campaign.create({
    data: {
      name: "Spring Launch 2026",
      description: "Major product announcement and early bird rollout.",
      userId: devUser.id,
    },
  });

  const campDocs = await prisma.campaign.create({
    data: {
      name: "Developer Documentation",
      description: "App Router guides, API docs, and architecture whitepapers.",
      userId: devUser.id,
    },
  });

  const campSocial = await prisma.campaign.create({
    data: {
      name: "Social Media Outreach",
      description: "Creator links across Twitter/X, LinkedIn, and YouTube.",
      userId: creatorUser.id,
    },
  });

  console.log("📂 Created 3 campaigns.");

  // 5. Create Tags
  const tagProduct = await prisma.tag.create({
    data: { name: "product", color: "#3b82f6", userId: devUser.id },
  });
  const tagDocs = await prisma.tag.create({
    data: { name: "docs", color: "#10b981", userId: devUser.id },
  });
  const tagMarketing = await prisma.tag.create({
    data: { name: "marketing", color: "#f59e0b", userId: devUser.id },
  });
  const tagConfidential = await prisma.tag.create({
    data: { name: "confidential", color: "#ef4444", userId: devUser.id },
  });
  const tagSocial = await prisma.tag.create({
    data: { name: "social", color: "#06b6d4", userId: creatorUser.id },
  });

  console.log("🏷️ Created 5 tags.");

  // 6. Create Links with diverse rules, campaigns, and tags
  // - Link 1: Active docs link (Dev Docs campaign)
  const linkDocs = await prisma.link.create({
    data: {
      code: "docs",
      destinationUrl: "https://nextjs.org/docs/app",
      title: "Next.js App Router Documentation",
      userId: devUser.id,
      campaignId: campDocs.id,
      isActive: true,
      clicksCount: 48,
      tags: {
        create: [{ tagId: tagDocs.id }, { tagId: tagProduct.id }],
      },
    },
  });

  // - Link 2: Password protected (Confidential Roadmap)
  const linkRoadmap = await prisma.link.create({
    data: {
      code: "roadmap",
      destinationUrl: "https://github.com/prisma/prisma/releases",
      title: "Confidential Roadmap 2026",
      userId: devUser.id,
      campaignId: campDocs.id,
      isActive: true,
      passwordHash: linkPasscodeHash, // Secret123!
      clicksCount: 16,
      tags: {
        create: [{ tagId: tagConfidential.id }],
      },
    },
  });

  // - Link 3: Spring Launch campaign link
  const linkLaunch = await prisma.link.create({
    data: {
      code: "launch2026",
      destinationUrl: "https://producthunt.com",
      title: "LinkPulse Product Hunt Launch",
      userId: devUser.id,
      campaignId: campSpringLaunch.id,
      isActive: true,
      clicksCount: 65,
      tags: {
        create: [{ tagId: tagMarketing.id }, { tagId: tagProduct.id }],
      },
    },
  });

  // - Link 4: Click Limit Reached (15/15)
  const linkVip = await prisma.link.create({
    data: {
      code: "vip-pass",
      destinationUrl: "https://example.com/vip-tickets",
      title: "VIP Summit Tickets (Cap reached)",
      userId: devUser.id,
      campaignId: campSpringLaunch.id,
      isActive: true,
      clickLimit: 15,
      clicksCount: 15,
      tags: {
        create: [{ tagId: tagMarketing.id }],
      },
    },
  });

  // - Link 5: Click Limit Active (12/50)
  const linkEarly = await prisma.link.create({
    data: {
      code: "early-bird",
      destinationUrl: "https://example.com/early-pricing",
      title: "Early Bird Tickets",
      userId: devUser.id,
      campaignId: campSpringLaunch.id,
      isActive: true,
      clickLimit: 50,
      clicksCount: 12,
      tags: {
        create: [{ tagId: tagMarketing.id }],
      },
    },
  });

  // - Link 6: Expired link (7 days ago)
  const linkExpired = await prisma.link.create({
    data: {
      code: "flash-sale",
      destinationUrl: "https://example.com/expired-sale",
      title: "Flash Sale (Expired)",
      userId: devUser.id,
      campaignId: campSpringLaunch.id,
      isActive: true,
      expiresAt: new Date(Date.now() - 7 * 86400000),
      clicksCount: 22,
    },
  });

  // - Link 7: Disabled link with reason
  const linkDisabled = await prisma.link.create({
    data: {
      code: "flagged-offer",
      destinationUrl: "https://example.com/flagged-page",
      title: "Suspicious Promotion",
      userId: devUser.id,
      isActive: false,
      disabledAt: new Date(Date.now() - 48 * 3600000),
      disabledReason: "Flagged domain — deactivated by platform admin.",
      clicksCount: 11,
    },
  });

  // - Link 8: Sarah's Social Outreach
  const linkPortfolio = await prisma.link.create({
    data: {
      code: "portfolio",
      destinationUrl: "https://github.com",
      title: "Sarah's Creative Portfolio",
      userId: creatorUser.id,
      campaignId: campSocial.id,
      isActive: true,
      clicksCount: 38,
      tags: {
        create: [{ tagId: tagSocial.id }],
      },
    },
  });

  console.log("🔗 Created 8 links across rules, campaigns, and tags.");

  // 7. Generate realistic ClickEvents spread across the last 14 days
  const referrers = [
    "https://twitter.com/",
    "https://t.co/abc",
    "https://linkedin.com/feed/",
    "https://news.ycombinator.com/",
    "https://github.com/prisma/prisma",
    "https://reddit.com/r/webdev/",
    null,
  ];

  const devices = ["desktop", "mobile", "tablet"] as const;
  const browsers = ["Chrome", "Safari", "Firefox", "Edge"] as const;
  const osList = ["macOS", "Windows 10/11", "iOS", "Android", "Linux"] as const;

  const now = Date.now();
  const clickData: Prisma.ClickEventCreateManyInput[] = [];

  // Helper to generate clicks across past 14 days
  const addClicksForLink = (linkId: string, count: number, uniqueRatio: number) => {
    const numUniques = Math.max(1, Math.round(count * uniqueRatio));
    for (let i = 0; i < count; i++) {
      // distribute across past 12 days
      const daysAgo = Math.floor(Math.random() * 12);
      const hoursAgo = daysAgo * 24 + Math.floor(Math.random() * 24);
      const visitorKey = `visitor-${linkId}-${i % numUniques}`;

      clickData.push({
        linkId,
        timestamp: new Date(now - hoursAgo * 3600 * 1000),
        referrer: referrers[i % referrers.length],
        device: devices[i % devices.length],
        browser: browsers[i % browsers.length],
        os: osList[i % osList.length],
        userAgent: `Mozilla/5.0 (${osList[i % osList.length]}) AppleWebKit/537.36 Chrome/122.0.0.0`,
        visitorHash: generateFakeVisitorHash(visitorKey),
      });
    }
  };

  addClicksForLink(linkDocs.id, 48, 0.45);
  addClicksForLink(linkRoadmap.id, 16, 0.5);
  addClicksForLink(linkLaunch.id, 65, 0.6);
  addClicksForLink(linkVip.id, 15, 0.8);
  addClicksForLink(linkEarly.id, 12, 0.7);
  addClicksForLink(linkExpired.id, 22, 0.5);
  addClicksForLink(linkDisabled.id, 11, 0.6);
  addClicksForLink(linkPortfolio.id, 38, 0.65);

  await prisma.clickEvent.createMany({
    data: clickData,
  });

  console.log("✅ LinkPulse database seeded successfully!");
  console.log("\nDemo Accounts Created:");
  console.log("  Admin: admin@linkpulse.io (password configured via SEED_ADMIN_PASSWORD)");
  console.log("  User:  alex@techcorp.dev  (password configured via SEED_USER_PASSWORD)");
  console.log("  User:  sarah@creatorhub.com (password configured via SEED_USER_PASSWORD)");
  console.log("\nSample Protected Link:");
  console.log("  Code: /roadmap (passcode configured via SEED_LINK_PASSCODE)");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
