/**
 * Logged-In Visual Audit Capture Script (Playwright)
 *
 * Captures 1280px desktop and 360px mobile views across all authenticated surfaces:
 * - /dashboard
 * - /analytics
 * - /import
 * - /admin (if ADMIN_EMAIL & ADMIN_PASSWORD are provided)
 * - QR Modal (opened and closed without side-effects)
 * - Edit Modal (opened and cancelled without mutating data)
 * - Toast notification (triggered via read-only copy button)
 * - ConfirmDialog (opened and safely CANCELLED without deleting anything)
 *
 * RUN INSTRUCTIONS (PowerShell):
 * -------------------------------------------------------------
 * 1. Build and start the production server:
 *    npm run build
 *    npx next start
 *
 * 2. In a separate terminal, configure your test credentials and run:
 *    $env:BASE_URL = "http://localhost:3000"
 *    $env:DEMO_EMAIL = "your-demo-user@example.com"
 *    $env:DEMO_PASSWORD = "your-demo-password"
 *
 *    # Optional (to capture /admin):
 *    $env:ADMIN_EMAIL = "your-admin-user@example.com"
 *    $env:ADMIN_PASSWORD = "your-admin-password"
 *
 *    node scripts/capture_logged_in.mjs
 * -------------------------------------------------------------
 * Output directory: ui-audit-screenshots/logged-in/
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error("❌ Error: Missing DEMO_EMAIL or DEMO_PASSWORD environment variables.");
  console.error("Please set $env:DEMO_EMAIL and $env:DEMO_PASSWORD before running this script.");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(__dirname, "../ui-audit-screenshots/logged-in");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "desktop_1280px", width: 1280, height: 800 },
  { name: "mobile_360px", width: 360, height: 740 },
];

/**
 * Log into the application using the login form without exposing credentials.
 */
async function performLogin(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  // Fill in email and password
  await page.fill("#email", email);
  await page.fill("#password", password);

  // Submit and wait for redirect past auth pages
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  // Wait for session hydration
  await page.waitForTimeout(1000);
}

/**
 * Perform logout to prepare for different role if needed.
 */
async function performLogout(page) {
  try {
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Alternatively clear cookies
  }
}

async function runCapture() {
  console.log(`🚀 Starting authenticated capture on ${BASE_URL}...`);
  console.log(`📁 Saving screenshots to: ${OUTPUT_DIR}`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Capturing for Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent:
        vp.width <= 480
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
          : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // 1. Authenticate standard demo user
    console.log(`[${vp.name}] Logging in as Demo User...`);
    await performLogin(page, DEMO_EMAIL, DEMO_PASSWORD);

    // 2. Dashboard
    console.log(`[${vp.name}] Capturing /dashboard...`);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `dashboard_${vp.name}.png`),
      fullPage: false,
    });

    // 3. Analytics
    console.log(`[${vp.name}] Capturing /analytics...`);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `analytics_${vp.name}.png`),
      fullPage: false,
    });

    // 4. Import
    console.log(`[${vp.name}] Capturing /import...`);
    await page.goto(`${BASE_URL}/import`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `import_${vp.name}.png`),
      fullPage: false,
    });

    // Return to dashboard for read-only modal interactions
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 5. Toast Notification (triggered safely via copy short link)
    console.log(`[${vp.name}] Triggering read-only Toast notification...`);
    try {
      const copyBtn = page.locator('button[title="Copy short link to clipboard"], button[aria-label="Copy short link"]').first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForSelector(".toast-card", { timeout: 3000 });
        await page.waitForTimeout(200);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `toast_visible_${vp.name}.png`),
        });
      }
    } catch (e) {
      console.warn(`[${vp.name}] Toast notification could not be triggered (no links found or copy failed).`);
    }

    // 6. QR Code Modal (opened and closed safely)
    console.log(`[${vp.name}] Capturing QR Modal...`);
    try {
      const qrBtn = page.locator('button[title="Show QR code"], button[aria-label^="QR Code for"]').first();
      if (await qrBtn.isVisible()) {
        await qrBtn.click();
        await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `modal_qr_${vp.name}.png`),
        });

        // Close modal without side effects
        const closeBtn = page.locator('button[aria-label="Close modal"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.warn(`[${vp.name}] QR Modal could not be opened.`);
    }

    // 7. Edit Modal (opened and cancelled safely)
    console.log(`[${vp.name}] Capturing Edit Modal...`);
    try {
      const editBtn = page.locator('button[title="Edit link rules & tags"], button[aria-label^="Edit /"]').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `modal_edit_${vp.name}.png`),
        });

        // CANCEL modal to guarantee zero mutation
        const cancelBtn = page.locator('div[role="dialog"] button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.warn(`[${vp.name}] Edit Modal could not be opened.`);
    }

    // 8. ConfirmDialog (opened and CANCELLED safely)
    console.log(`[${vp.name}] Capturing ConfirmDialog (Cancelling immediately)...`);
    try {
      const deleteBtn = page.locator('button[title="Permanently delete link"], button[aria-label^="Delete /"]').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.waitForSelector('div[role="alertdialog"]', { timeout: 3000 });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `modal_confirm_${vp.name}.png`),
        });

        // CRITICAL: NEVER CONFIRM. CANCEL ONLY.
        const cancelConfirmBtn = page.locator('div[role="alertdialog"] button:has-text("Cancel")').first();
        if (await cancelConfirmBtn.isVisible()) {
          await cancelConfirmBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.warn(`[${vp.name}] ConfirmDialog could not be triggered.`);
    }

    // 9. Admin Page (if ADMIN credentials provided)
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      console.log(`[${vp.name}] Logging in as Admin User to capture /admin...`);
      await context.clearCookies();
      await performLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      console.log(`[${vp.name}] Capturing /admin...`);
      await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `admin_${vp.name}.png`),
        fullPage: false,
      });
    } else {
      console.log(`[${vp.name}] Skipping /admin (ADMIN_EMAIL and ADMIN_PASSWORD not provided).`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 Capture run complete! All screenshots saved to ui-audit-screenshots/logged-in/.");
}

runCapture().catch((err) => {
  console.error("Execution failed:", err.message);
  process.exit(1);
});
