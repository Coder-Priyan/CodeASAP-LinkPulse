import { chromium, Browser, BrowserContext, Page } from "playwright";
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

interface InteractionResult {
  interaction: string;
  firstVisualChangeMs: number[];
  fullyDoneMs: number[];
  requests: { url: string; method: string; durationMs: number; status: number }[];
  parallel: boolean;
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

// Injects mutation watcher to record the exact performance.now() of the first visual change
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

export async function runMeasurements() {
  console.log("=== LinkPulse Interaction Responsiveness Baseline Measurements ===");
  console.log(`Target: ${BASE_URL} (Production Build)`);

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

  const createdLinkIds: string[] = [];
  const createdBlockedDomainIds: string[] = [];

  const results: Record<string, InteractionResult> = {};

  function initResult(name: string) {
    if (!results[name]) {
      results[name] = {
        interaction: name,
        firstVisualChangeMs: [],
        fullyDoneMs: [],
        requests: [],
        parallel: false,
      };
    }
  }

  try {
    // 1. Initial Page Load to Dashboard
    console.log("\n[Warmup] Navigating to /dashboard...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    console.log("Dashboard loaded.");

    // Helper to track network requests during an interaction
    async function trackInteraction(
      name: string,
      action: () => Promise<void>,
      waitForDone: () => Promise<void>
    ) {
      initResult(name);
      const reqs: { url: string; method: string; start: number; durationMs: number; status: number }[] = [];
      
      const onReq = (req: any) => {
        if (req.url().includes("/api/")) {
          reqs.push({
            url: req.url().replace(BASE_URL, ""),
            method: req.method(),
            start: performance.now(),
            durationMs: 0,
            status: 0,
          });
        }
      };
      const onRes = (res: any) => {
        const item = reqs.find((r) => r.url === res.url().replace(BASE_URL, "") && r.durationMs === 0);
        if (item) {
          item.durationMs = Number((performance.now() - item.start).toFixed(1));
          item.status = res.status();
        }
      };

      page.on("request", onReq);
      page.on("response", onRes);

      await setupVisualChangeWatcher(page);
      const t0 = performance.now();
      await action();
      const firstVisual = await getVisualChangeElapsed(page);
      await waitForDone();
      const done = Number((performance.now() - t0).toFixed(1));

      page.off("request", onReq);
      page.off("response", onRes);

      results[name].firstVisualChangeMs.push(firstVisual);
      results[name].fullyDoneMs.push(done);
      if (reqs.length > results[name].requests.length) {
        results[name].requests = reqs.map(({ url, method, durationMs, status }) => ({
          url,
          method,
          durationMs,
          status,
        }));
        // check if parallel (overlap in start times)
        results[name].parallel = reqs.length > 1;
      }
    }

    // Measure Nav Links RUNS times
    console.log(`\n--- Measuring Nav Links (${RUNS} runs each) ---`);
    for (let i = 0; i < RUNS; i++) {
      // 1. Dashboard -> Analytics
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      await trackInteraction(
        "Nav: Analytics",
        async () => {
          await page.click('nav a[href="/analytics"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("Analytics"), h2:has-text("Analytics")', { timeout: 15000 });
          // wait for initialLoading to clear
          await page.waitForSelector('.loading-screen-wrap', { state: 'detached', timeout: 15000 }).catch(() => {});
        }
      );

      // 2. Analytics -> Admin
      await trackInteraction(
        "Nav: Admin",
        async () => {
          await page.click('nav a[href="/admin"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 });
          await page.waitForSelector('.loading-screen-wrap', { state: 'detached', timeout: 15000 }).catch(() => {});
        }
      );

      // 3. Admin -> Dashboard
      await trackInteraction(
        "Nav: Dashboard",
        async () => {
          await page.click('nav a[href="/dashboard"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("Dashboard"), h2:has-text("My Shortened Links")', { timeout: 15000 });
          await page.waitForSelector('.loading-screen-wrap', { state: 'detached', timeout: 15000 }).catch(() => {});
        }
      );

      // 4. Dashboard -> CSV Import
      await trackInteraction(
        "Nav: CSV Import",
        async () => {
          await page.click('a[href="/import"]');
        },
        async () => {
          await page.waitForSelector('h1:has-text("CSV Bulk Import")', { timeout: 15000 });
        }
      );

      // Back to dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    }

    // 5. Measure Copy link
    console.log(`\n--- Measuring Copy button (${RUNS} runs) ---`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      const copyBtn = page.locator('button[aria-label="Copy short link"]').first();
      await copyBtn.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      if (await copyBtn.count()) {
        await trackInteraction(
          "Action: Copy Link",
          async () => {
            await copyBtn.click();
          },
          async () => {
            await page.waitForSelector('.badge:has-text("Copied!"), div:has-text("Copied")', { timeout: 5000 }).catch(() => {});
          }
        );
      }
    }

    // 6. Measure QR open
    console.log(`\n--- Measuring QR open (${RUNS} runs) ---`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      const qrBtn = page.locator('button[aria-label="View QR code"]').first();
      await qrBtn.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      if (await qrBtn.count()) {
        await trackInteraction(
          "Action: QR Open",
          async () => {
            await qrBtn.click();
          },
          async () => {
            await page.waitForSelector('.modal-container, [role="dialog"]', { timeout: 5000 });
          }
        );
        // close modal
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }
    }

    // 7. Measure Filters (Search Filter on Dashboard & Period Filter on Analytics)
    console.log(`\n--- Measuring Filters (${RUNS} runs) ---`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      const searchInput = page.locator('#searchFilter, input[placeholder*="Search"]').first();
      await searchInput.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      if (await searchInput.count()) {
        await trackInteraction(
          "Action: Search Filter",
          async () => {
            await searchInput.fill("github");
          },
          async () => {
            await page.waitForTimeout(100);
          }
        );
      }

      await page.goto(`${BASE_URL}/analytics`, { waitUntil: "domcontentloaded" });
      const tab30d = page.locator('button[role="tab"]:has-text("30 Days"), button:has-text("30 Days")').first();
      await tab30d.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      if (await tab30d.count()) {
        await trackInteraction(
          "Action: Period Filter",
          async () => {
            await tab30d.click();
          },
          async () => {
            await page.waitForTimeout(350);
          }
        );
      }
    }

    // 8. Measure Create Link
    console.log(`\n--- Measuring Create Link (${RUNS} runs) ---`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      const alias = `test-b-${Date.now().toString().slice(-6)}-${i}`;
      await page.fill('#destUrl', "https://safe-measured-baseline.org/destination");
      await page.fill('#customAlias', alias);
      await page.click('button:has-text("Next: Set Rules & Tags")');
      await page.waitForTimeout(150);

      await trackInteraction(
        "Action: Create Link",
        async () => {
          await page.click('button:has-text("Publish Short Link")');
        },
        async () => {
          await page.waitForSelector('text=Short link created successfully!', { timeout: 15000 });
        }
      );

      // find created link in DB to track ID for cleanup
      const created = await db.link.findUnique({ where: { code: alias } });
      if (created) createdLinkIds.push(created.id);
    }

    // 9. Measure Link Enable / Disable, Edit Save, and Delete on a newly created link
    console.log(`\n--- Measuring Link Enable/Disable, Edit Save, and Delete (${RUNS} runs) ---`);
    for (let i = 0; i < RUNS; i++) {
      const alias = `test-mut-${Date.now().toString().slice(-6)}-${i}`;
      const testLink = await db.link.create({
        data: {
          code: alias,
          destinationUrl: "https://safe-mutation-fixture.org/page",
          title: `Mutation Fixture ${i}`,
          userId: adminUser.id,
          isActive: true,
        },
      });
      createdLinkIds.push(testLink.id);

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });

      const row = page.locator(`tr:has-text("${alias}")`).first();
      await row.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

      // Toggle status (disable)
      const toggleBtn = row.locator('button[aria-label*="Deactivate"], button[aria-label*="Activate"], button:has-text("Disable"), button:has-text("Enable")').first();
      if (await toggleBtn.count()) {
        await trackInteraction(
          "Action: Link Enable/Disable",
          async () => {
            await toggleBtn.click();
          },
          async () => {
            await page.waitForSelector(`.toast, text=is now disabled, text=is now active`, { timeout: 10000 }).catch(() => {});
          }
        );
      }

      // Edit Save
      const editBtn = row.locator('button[aria-label="Edit link rules"], button:has-text("Edit")').first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForSelector('#editTitle, [role="dialog"]', { timeout: 5000 });
        await page.fill('#editTitle', `Updated Fixture ${i}`);

        await trackInteraction(
          "Action: Edit Save",
          async () => {
            await page.click('button:has-text("Save Changes")');
          },
          async () => {
            await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 10000 });
          }
        );
      }

      // Delete Link
      const deleteBtn = row.locator('button[aria-label="Delete link"]').first();
      if (await deleteBtn.count()) {
        page.once("dialog", (dialog) => dialog.accept());
        await trackInteraction(
          "Action: Link Delete",
          async () => {
            await deleteBtn.click();
          },
          async () => {
            await page.waitForSelector(`tr:has-text("${alias}")`, { state: "detached", timeout: 10000 });
          }
        );
      }
    }

    // 10. Measure Block Domain & Unblock Domain on Admin page
    console.log(`\n--- Measuring Block Domain & Unblock Domain (${RUNS} runs) ---`);
    for (let i = 0; i < RUNS; i++) {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
      const domain = `test-block-${Date.now().toString().slice(-6)}-${i}.xyz`;

      // Block Domain
      await page.fill('#domainInput', domain);
      await page.fill('#reasonInput', "Baseline benchmark testing");

      await trackInteraction(
        "Action: Block Domain",
        async () => {
          await page.click('button:has-text("Add Blocked Domain")');
        },
        async () => {
          await page.waitForSelector(`td:has-text("${domain}")`, { timeout: 15000 });
        }
      );

      const createdDomain = await db.blockedDomain.findUnique({ where: { domain } });
      if (createdDomain) createdBlockedDomainIds.push(createdDomain.id);

      // Unblock Domain
      const unblockBtn = page.locator(`tr:has-text("${domain}") button:has-text("Unblock")`).first();
      if (await unblockBtn.count()) {
        page.once("dialog", (dialog) => dialog.accept());
        await trackInteraction(
          "Action: Unblock Domain",
          async () => {
            await unblockBtn.click();
          },
          async () => {
            await page.waitForSelector(`tr:has-text("${domain}")`, { state: "detached", timeout: 15000 });
          }
        );
      }
    }

    // 11. Measure Logout
    console.log("\n--- Measuring Logout (1 run) ---");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Log out")').first();
    if (await logoutBtn.count()) {
      await trackInteraction(
        "Action: Logout",
        async () => {
          await logoutBtn.click();
        },
        async () => {
          await page.waitForURL(/.*login/, { timeout: 10000 });
        }
      );
    }

  } finally {
    await browser.close();

    // LIVE DB SAFETY CLEANUP: remove all created test records strictly by exact ID
    console.log("\n[LIVE DB SAFETY CLEANUP]");
    for (const linkId of createdLinkIds) {
      try {
        await db.clickEvent.deleteMany({ where: { linkId } });
        await db.linkTag.deleteMany({ where: { linkId } });
        await db.passwordAttempt.deleteMany({ where: { linkId } });
        await db.link.delete({ where: { id: linkId } });
        console.log(`Cleaned test link: ${linkId}`);
      } catch (e) {
        // ignore if already deleted by UI test
      }
    }

    for (const domainId of createdBlockedDomainIds) {
      try {
        await db.blockedDomain.delete({ where: { id: domainId } });
        console.log(`Cleaned test blocked domain: ${domainId}`);
      } catch (e) {
        // ignore if already deleted by UI test
      }
    }
  }

  // Print Summary Table with RAW measurement arrays
  console.log(`\n================ INTERACTION RESULTS SUMMARY (${RUNS} RUNS) ================`);
  for (const [name, res] of Object.entries(results)) {
    const medVisual = median(res.firstVisualChangeMs);
    const p95Visual = p95(res.firstVisualChangeMs);
    const medDone = median(res.fullyDoneMs);
    const p95Done = p95(res.fullyDoneMs);
    const reqSummary = res.requests.map((r) => `${r.method} ${r.url} (${r.durationMs}ms)`).join(", ");
    console.log(`\n[${name}]`);
    console.log(`  Visual Raw (${res.firstVisualChangeMs.length} runs): [${res.firstVisualChangeMs.join(", ")}] ms`);
    console.log(`  Visual Stats: Median = ${medVisual} ms | p95 = ${p95Visual} ms`);
    console.log(`  Done Raw (${res.fullyDoneMs.length} runs): [${res.fullyDoneMs.join(", ")}] ms`);
    console.log(`  Done Stats: Median = ${medDone} ms | p95 = ${p95Done} ms`);
    console.log(`  Requests Triggered: ${reqSummary || "none"} (parallel: ${res.parallel})`);
  }
}

runMeasurements().catch(console.error);
