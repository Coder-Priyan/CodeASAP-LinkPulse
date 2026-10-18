import { chromium, Page } from "playwright";
import { signSession } from "../src/lib/auth/session";
import { Role } from "@prisma/client";
import { db } from "../src/lib/db";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const RUNS = parseInt(process.env.RUNS || "10", 10);

async function getAdminUser() {
  if (process.env.ADMIN_USER_ID && process.env.ADMIN_EMAIL) {
    return { id: process.env.ADMIN_USER_ID, email: process.env.ADMIN_EMAIL };
  }
  const admin = await db.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) throw new Error("No admin user found in database or environment");
  return { id: admin.id, email: admin.email };
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function p95(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(s.length * 0.95);
  return s[Math.min(idx, s.length - 1)];
}

async function setupVisualChangeWatcher(page: Page) {
  await page.evaluate(() => {
    (window as any).__firstVisualChangeTime = null;
    (window as any).__interactionStartTime = performance.now();
    const observer = new MutationObserver(() => {
      if ((window as any).__firstVisualChangeTime === null) {
        (window as any).__firstVisualChangeTime = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
    (window as any).__mutationObserver = observer;
  });
}

async function getVisualChangeElapsed(page: Page): Promise<number> {
  return page.evaluate(() => {
    const start = (window as any).__interactionStartTime || performance.now();
    const first = (window as any).__firstVisualChangeTime || performance.now();
    return Number((first - start).toFixed(1));
  });
}

export async function runThrottledMeasurements() {
  console.log(`=== Throttled Network Measurements (Slow 4G / Fast 3G: 100ms RTT, ${RUNS} runs) ===`);
  console.log(`Target: ${BASE_URL}`);

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

  // Emulate network conditions via CDP: 100ms latency, 1.5 Mbps download, 750 kbps upload
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 100, // 100ms RTT
    downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    uploadThroughput: (750 * 1024) / 8, // 750 kbps
  });

  const createdLinkIds: string[] = [];
  const createdBlockedDomainIds: string[] = [];
  const results: Record<string, { visual: number[]; done: number[] }> = {};

  function init(name: string) {
    if (!results[name]) results[name] = { visual: [], done: [] };
  }

  async function track(name: string, action: () => Promise<void>, waitForDone: () => Promise<void>) {
    init(name);
    await setupVisualChangeWatcher(page);
    const t0 = performance.now();
    await action();
    const visual = await getVisualChangeElapsed(page);
    await waitForDone();
    const done = Number((performance.now() - t0).toFixed(1));
    results[name].visual.push(visual);
    results[name].done.push(done);
  }

  try {
    console.log("Navigating to /dashboard...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });

    // 1. Nav Links Throttled
    console.log(`Measuring Nav Links under 100ms throttling (${RUNS} runs)...`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      await track(
        "Nav: Analytics (Throttled)",
        async () => {
          await page.click('nav a[href="/analytics"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("Analytics")', { timeout: 25000 });
        }
      );

      await track(
        "Nav: Admin (Throttled)",
        async () => {
          await page.click('nav a[href="/admin"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("Admin")', { timeout: 25000 });
        }
      );

      await track(
        "Nav: Dashboard (Throttled)",
        async () => {
          await page.click('nav a[href="/dashboard"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 25000 });
        }
      );
    }

    // 2. Link Enable/Disable & Delete Throttled
    console.log(`Measuring Link Mutations under 100ms throttling (${RUNS} runs)...`);
    for (let i = 0; i < RUNS; i++) {
      const alias = `test-thr-${Date.now().toString().slice(-6)}-${i}`;
      const testLink = await db.link.create({
        data: {
          code: alias,
          destinationUrl: "https://safe-throttled.org/page",
          title: `Throttled Fixture ${i}`,
          userId: adminUser.id,
          isActive: true,
        },
      });
      createdLinkIds.push(testLink.id);

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });

      // Toggle status
      const toggleBtn = page.locator(`tr:has-text("${alias}") button[aria-label*="Deactivate"]`).first();
      if (await toggleBtn.count()) {
        await track(
          "Action: Link Enable/Disable (Throttled)",
          async () => {
            await toggleBtn.click();
          },
          async () => {
            await page.waitForSelector(`.toast, text=is now disabled`, { timeout: 20000 }).catch(() => {});
          }
        );
      }

      // Delete Link
      const deleteBtn = page.locator(`tr:has-text("${alias}") button[aria-label="Delete link"]`).first();
      if (await deleteBtn.count()) {
        page.once("dialog", (d) => d.accept());
        await track(
          "Action: Link Delete (Throttled)",
          async () => {
            await deleteBtn.click();
          },
          async () => {
            await page.waitForSelector(`tr:has-text("${alias}")`, { state: "detached", timeout: 20000 });
          }
        );
      }
    }

    // 3. Block Domain Throttled
    console.log(`Measuring Block Domain under 100ms throttling (${RUNS} runs)...`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
      const domain = `test-thr-block-${Date.now().toString().slice(-6)}-${i}.xyz`;

      await page.fill("#domainInput", domain);
      await page.fill("#reasonInput", "Throttled testing");

      await track(
        "Action: Block Domain (Throttled)",
        async () => {
          await page.click('button:has-text("Add Blocked Domain")');
        },
        async () => {
          await page.waitForSelector(`td:has-text("${domain}")`, { timeout: 25000 });
        }
      );

      const d = await db.blockedDomain.findUnique({ where: { domain } });
      if (d) createdBlockedDomainIds.push(d.id);
    }
  } finally {
    await browser.close();

    // LIVE DB CLEANUP strictly by exact ID
    for (const linkId of createdLinkIds) {
      try {
        await db.clickEvent.deleteMany({ where: { linkId } });
        await db.linkTag.deleteMany({ where: { linkId } });
        await db.passwordAttempt.deleteMany({ where: { linkId } });
        await db.link.delete({ where: { id: linkId } });
      } catch {}
    }
    for (const domainId of createdBlockedDomainIds) {
      try {
        await db.blockedDomain.delete({ where: { id: domainId } });
      } catch {}
    }
  }

  console.log(`\n================ THROTTLED RESULTS SUMMARY (100ms RTT, ${RUNS} RUNS) ================`);
  console.log("Interaction | Visual Raw | Visual Median | Visual P95 | Done Raw | Done Median | Done P95");
  console.log("------------------------------------------------------------------------------------------------");
  for (const [name, data] of Object.entries(results)) {
    const medVisual = median(data.visual);
    const p95Visual = p95(data.visual);
    const medDone = median(data.done);
    const p95Done = p95(data.done);
    console.log(`\n[${name}]`);
    console.log(`  Visual Raw (${data.visual.length} runs): [${data.visual.join(", ")}] ms`);
    console.log(`  Visual Stats: Median = ${medVisual} ms | p95 = ${p95Visual} ms`);
    console.log(`  Done Raw (${data.done.length} runs): [${data.done.join(", ")}] ms`);
    console.log(`  Done Stats: Median = ${medDone} ms | p95 = ${p95Done} ms`);
  }
}

runThrottledMeasurements().catch(console.error);
