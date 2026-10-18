import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, Browser, Page } from "playwright";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { signSession } from "@/lib/auth/session";

describe("Navbar Auth-Change Reactivity & Inline Tag/Campaign Sync", () => {
  let browser: Browser;
  let page: Page;
  let testUser: { id: string; email: string; name: string };
  const createdLinkIds: string[] = [];
  const createdCampaignIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();

    const ts = Date.now();
    const user = await db.user.create({
      data: {
        email: `test-nav-${ts}@linkpulse.test`,
        passwordHash: "dummy",
        role: Role.USER,
        name: "Navbar Tester",
      },
    });
    testUser = { id: user.id, email: user.email, name: user.name || "Navbar Tester" };
    createdUserIds.push(testUser.id);
  });

  afterAll(async () => {
    await browser?.close();

    if (createdLinkIds.length > 0) {
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (createdCampaignIds.length > 0) {
      await db.campaign.deleteMany({ where: { id: { in: createdCampaignIds } } });
    }
    if (createdTagIds.length > 0) {
      await db.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    }
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("reacts dynamically to window auth-change events for login and logout", async () => {
    // 1. Visit homepage unauthenticated
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");

    // Initially logged out: should show Login link in navbar
    const loginLink = page.locator('header a[href="/login"]');
    await loginLink.waitFor({ state: "visible", timeout: 5000 });
    expect(await loginLink.isVisible()).toBe(true);

    // 2. Set auth cookie programmatically (simulating login)
    const token = await signSession({
      userId: testUser.id,
      email: testUser.email,
      role: Role.USER,
      name: testUser.name,
    });

    await page.context().addCookies([
      {
        name: "linkpulse_session",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
      },
    ]);

    // Dispatch auth-change event on window
    await page.evaluate(() => {
      window.dispatchEvent(new Event("auth-change"));
    });

    // Verify Navbar reacts to the event by re-fetching session and showing Dashboard link
    const dashboardLink = page.locator('header a[href="/dashboard"]');
    await dashboardLink.waitFor({ state: "visible", timeout: 5000 });
    expect(await dashboardLink.isVisible()).toBe(true);

    // 3. Clear auth cookie (simulating logout) and dispatch auth-change
    await page.context().clearCookies();
    await page.evaluate(() => {
      window.dispatchEvent(new Event("auth-change"));
    });

    // Verify Navbar reacts to the event and shows Login again
    await loginLink.waitFor({ state: "visible", timeout: 5000 });
    expect(await loginLink.isVisible()).toBe(true);
  });

  it(
    "synchronizes newly created campaign and tag inline into form state and selection",
    { timeout: 40000 },
    async () => {
      // Authenticate user
      const token = await signSession({
        userId: testUser.id,
        email: testUser.email,
        role: Role.USER,
        name: testUser.name,
      });
      await page.context().addCookies([
        {
          name: "linkpulse_session",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
        },
      ]);

      await page.goto("http://localhost:3000/dashboard");
      await page.locator('h1:has-text("Dashboard")').waitFor({ state: "visible", timeout: 15000 });

      // Fill Step 1
      await page.fill('input[placeholder*="https://"]', "https://pulse-safe-test-target.org/sync-test");
      await page.click('button:has-text("Next: Set Rules & Tags")');

      // Verify Step 2 is active
      await page.locator("text=Link Organization").waitFor({ state: "visible", timeout: 8000 });

      // Test inline campaign creation
      await page.click('button[aria-label="Create new campaign"]');
      const campName = `InlineCamp-${Date.now().toString().slice(-4)}`;
      await page.fill('input[aria-label="New campaign name"]', campName);
      await page.click('button:has-text("Save")');

      // Verify campaign is created, selected, and appears in the dropdown
      const campaignSelect = page.locator("select#campSelect");
      await page.waitForFunction(
        (expectedName) => {
          const select = document.querySelector("select#campSelect") as HTMLSelectElement | null;
          if (!select) return false;
          const opt = select.options[select.selectedIndex];
          return opt && opt.text.includes(expectedName);
        },
        campName,
        { timeout: 8000 }
      );
      const selectedOptionText = await campaignSelect.locator("option:checked").textContent();
      expect(selectedOptionText).toContain(campName);

      // Record created campaign for cleanup
      const foundCamp = await db.campaign.findFirst({ where: { name: campName, userId: testUser.id } });
      if (foundCamp) createdCampaignIds.push(foundCamp.id);

      // Test inline tag creation
      const tagAddButton = page.locator('button[aria-label="Create new tag"]');
      await tagAddButton.click();
      const tagName = `InlineTag-${Date.now().toString().slice(-4)}`;
      await page.fill('input[aria-label="New tag name"]', tagName);
      await page.click('button:has-text("Save")');

      // Verify tag is created and selected
      const tagBadge = page.locator(`.tag-pill.selected:has-text("#${tagName}")`);
      await tagBadge.waitFor({ state: "visible", timeout: 8000 });
      expect(await tagBadge.isVisible()).toBe(true);

      const foundTag = await db.tag.findFirst({ where: { name: tagName, userId: testUser.id } });
      if (foundTag) createdTagIds.push(foundTag.id);
    }
  );
});
