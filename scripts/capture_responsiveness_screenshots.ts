import { chromium } from "playwright";
import { signSession } from "../src/lib/auth/session";
import { Role } from "@prisma/client";
import { db } from "../src/lib/db";
import * as path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\7a73950a-75bc-4111-a463-4dbdf1f737d7";

async function getAdminUser() {
  if (process.env.ADMIN_USER_ID && process.env.ADMIN_EMAIL) {
    return { id: process.env.ADMIN_USER_ID, email: process.env.ADMIN_EMAIL };
  }
  const admin = await db.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) throw new Error("No admin user found in database or environment");
  return { id: admin.id, email: admin.email };
}

async function capture() {
  const adminUser = await getAdminUser();
  const adminToken = await signSession({
    userId: adminUser.id,
    email: adminUser.email,
    role: Role.ADMIN,
  });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  await context.addCookies([
    {
      name: "linkpulse_session",
      value: adminToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  // Apply network throttling (100ms RTT)
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 100, // 100ms RTT
    downloadThroughput: ((1.5 * 1024 * 1024) / 8),
    uploadThroughput: ((750 * 1024) / 8),
  });

  console.log("1. Capturing Nav Analytics Pending State...");
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const analyticsLink = page.locator('nav a[href="/analytics"]');
  await analyticsLink.click({ noWaitAfter: true });
  await page.waitForTimeout(40);
  const navAnalyticsPath = path.join(ARTIFACT_DIR, "nav_analytics_pending_1280px.png");
  await page.screenshot({ path: navAnalyticsPath });
  console.log("Saved nav analytics pending screenshot:", navAnalyticsPath);
  await page.waitForSelector('h1:has-text("Analytics")', { timeout: 15000 });

  console.log("2. Capturing Nav Dashboard Pending State (from /analytics)...");
  const dashboardLink = page.locator('nav a[href="/dashboard"]');
  await dashboardLink.click({ noWaitAfter: true });
  await page.waitForTimeout(40);
  const navDashboardPath = path.join(ARTIFACT_DIR, "nav_dashboard_pending_1280px.png");
  await page.screenshot({ path: navDashboardPath });
  console.log("Saved nav dashboard pending screenshot:", navDashboardPath);
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 15000 });

  console.log("3. Capturing Nav Admin Pending State (from /dashboard)...");
  const adminLink = page.locator('nav a[href="/admin"]');
  await adminLink.click({ noWaitAfter: true });
  await page.waitForTimeout(40);
  const navAdminPath = path.join(ARTIFACT_DIR, "nav_admin_pending_1280px.png");
  await page.screenshot({ path: navAdminPath });
  console.log("Saved nav admin pending screenshot:", navAdminPath);
  await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 });

  console.log("4. Capturing Admin Block Domain Pending State...");
  const domainInput = page.locator("#domainInput");
  await domainInput.fill("test-screenshot-domain.xyz");
  const blockBtn = page.locator('form button[type="submit"]');
  await blockBtn.click({ noWaitAfter: true });
  await page.waitForTimeout(60);
  const adminPendingPath = path.join(ARTIFACT_DIR, "admin_block_pending_state_1280px.png");
  await page.screenshot({ path: adminPendingPath });
  console.log("Saved admin block pending screenshot:", adminPendingPath);
  await page.waitForTimeout(2500);

  console.log("5. Capturing Link Create Pending State...");
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const destInput = page.locator("#destUrl");
  await destInput.fill("https://example.com/test-pending-ss");
  const nextBtn = page.locator('button:has-text("Next")');
  await nextBtn.click();
  await page.waitForTimeout(400);
  const publishBtn = page.locator('button:has-text("Publish Short Link")');
  await publishBtn.click({ noWaitAfter: true });
  await page.waitForTimeout(60);
  const createPendingPath = path.join(ARTIFACT_DIR, "create_link_pending_state_1280px.png");
  await page.screenshot({ path: createPendingPath });
  console.log("Saved create link pending screenshot:", createPendingPath);
  await page.waitForTimeout(3000);

  // Clean up any test records created during screenshots
  const { db } = await import("../src/lib/db");
  const testDomains = await db.blockedDomain.findMany({ where: { domain: "test-screenshot-domain.xyz" } });
  for (const d of testDomains) {
    await db.blockedDomain.delete({ where: { id: d.id } });
    console.log("Cleaned screenshot domain ID:", d.id);
  }
  const testLinks = await db.link.findMany({
    where: {
      OR: [
        { destinationUrl: "https://example.com/test-pending-ss" },
        { title: "Test Pending Screenshot" },
      ],
    },
  });
  for (const l of testLinks) {
    await db.clickEvent.deleteMany({ where: { linkId: l.id } });
    await db.linkTag.deleteMany({ where: { linkId: l.id } });
    await db.passwordAttempt.deleteMany({ where: { linkId: l.id } });
    await db.link.delete({ where: { id: l.id } });
    console.log("Cleaned screenshot link ID:", l.id);
  }
  await db.$disconnect();

  await browser.close();
  console.log("Done capturing all screenshots.");
}

capture().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
