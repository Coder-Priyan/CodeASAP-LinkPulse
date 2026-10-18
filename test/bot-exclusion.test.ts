import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { isBot } from "@/lib/utils/user-agent";
import { recordClick } from "@/lib/services/click.service";
import { incrementClickCountAtomic } from "@/lib/services/link.service";
import bcrypt from "bcryptjs";
import { POST as verifyRoute } from "@/app/api/links/verify/route";
import { GET as redirectRoute } from "@/app/[code]/route";
import { NextRequest } from "next/server";

describe("3. Bot Exclusion & Click Limit Protection", () => {
  let testUserId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-bots-${Date.now()}@linkpulse.test`,
        passwordHash: "hashed",
        role: "USER",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.passwordAttempt.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("correctly identifies crawlers/CLI tools as bots and browsers as non-bots", () => {
    const botUserAgents = [
      "curl/7.88.1",
      "Wget/1.21.3",
      "PostmanRuntime/7.32.3",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "WhatsApp/2.21.12.21 A",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
      "Discordbot/2.0; +https://discordapp.com",
    ];

    for (const ua of botUserAgents) {
      expect(isBot(ua)).toBe(true);
    }

    const browserUserAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    ];

    for (const ua of browserUserAgents) {
      expect(isBot(ua)).toBe(false);
    }
  });

  it("ensures recordClick discards bot requests without creating ClickEvents in DB", async () => {
    const link = await db.link.create({
      data: {
        code: `test-bot-rec-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/dest",
        userId: testUserId,
      },
    });
    createdLinkIds.push(link.id);

    const botResult = await recordClick(link.id, {
      userAgent: "curl/7.88.1",
      ip: "127.0.0.1",
    });

    expect(botResult.recorded).toBe(false);
    expect(botResult.reason).toBe("BOT_IGNORED");

    const eventsCount = await db.clickEvent.count({ where: { linkId: link.id } });
    expect(eventsCount).toBe(0);
  });

  it("verifies bot requests do not consume click limit in Redirect Route Handler", async () => {
    const link = await db.link.create({
      data: {
        code: `test-bot-redir-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/dest-bot",
        userId: testUserId,
        clickLimit: 3,
        clicksCount: 0,
      },
    });
    createdLinkIds.push(link.id);

    // Call redirect route as bot (curl)
    const botReq = new NextRequest(`http://localhost:3000/${link.code}`, {
      headers: { "user-agent": "curl/7.88.1" },
    });
    const botRes = await redirectRoute(botReq, { params: Promise.resolve({ code: link.code }) });

    // Should redirect to destination
    expect(botRes.status).toBe(307);
    expect(botRes.headers.get("location")).toBe("https://pulse-safe-test-target.org/dest-bot");

    // DB click counter and events must be completely untouched
    const linkAfterBot = await db.link.findUnique({ where: { id: link.id } });
    expect(linkAfterBot?.clicksCount).toBe(0);
    const clickEventsAfterBot = await db.clickEvent.count({ where: { linkId: link.id } });
    expect(clickEventsAfterBot).toBe(0);

    // Call redirect route as real browser
    const browserReq = new NextRequest(`http://localhost:3000/${link.code}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    const browserRes = await redirectRoute(browserReq, {
      params: Promise.resolve({ code: link.code }),
    });

    expect(browserRes.status).toBe(307);

    // DB click counter should be incremented atomically to 1
    const linkAfterBrowser = await db.link.findUnique({ where: { id: link.id } });
    expect(linkAfterBrowser?.clicksCount).toBe(1);
  });

  it("verifies bot requests do not consume click limit in Password Verify Route Handler", async () => {
    const password = "Protected123!";
    const passwordHash = await bcrypt.hash(password, 10);

    const link = await db.link.create({
      data: {
        code: `test-bot-pwd-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/dest-pwd",
        userId: testUserId,
        clickLimit: 3,
        clicksCount: 0,
        passwordHash,
      },
    });
    createdLinkIds.push(link.id);

    // Bot verifies password with correct credentials
    const botReq = new NextRequest("http://localhost:3000/api/links/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Twitterbot/1.0",
      },
      body: JSON.stringify({ code: link.code, password }),
    });

    const botRes = await verifyRoute(botReq);
    expect(botRes.status).toBe(200);
    const botData = await botRes.json();
    expect(botData.success).toBe(true);
    expect(botData.destinationUrl).toBe("https://pulse-safe-test-target.org/dest-pwd");

    // Click count must NOT increment
    const linkAfterBot = await db.link.findUnique({ where: { id: link.id } });
    expect(linkAfterBot?.clicksCount).toBe(0);

    // Real browser verifies password
    const browserReq = new NextRequest("http://localhost:3000/api/links/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ code: link.code, password }),
    });

    const browserRes = await verifyRoute(browserReq);
    expect(browserRes.status).toBe(200);

    // Click count MUST increment for real browser
    const linkAfterBrowser = await db.link.findUnique({ where: { id: link.id } });
    expect(linkAfterBrowser?.clicksCount).toBe(1);
  });
});
