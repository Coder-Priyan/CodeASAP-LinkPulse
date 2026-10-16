import { db } from "../db";
import { isBot, detectDevice, detectBrowser, detectOS } from "../utils/user-agent";
import { generateVisitorHash } from "../utils/visitor-hash";

export interface ClickContext {
  userAgent?: string | null;
  referrer?: string | null;
  ip?: string | null;
}

/**
 * Record a visit to a shortened link.
 * Automatically ignores known crawlers/bots.
 * Runs with fail-safe error handling so logging issues never affect the redirect.
 */
export async function recordClick(linkId: string, context: ClickContext): Promise<{ recorded: boolean; reason?: string }> {
  try {
    const rawUa = context.userAgent || "";

    // 1. Filter bots and automated crawlers
    if (isBot(rawUa)) {
      return { recorded: false, reason: "BOT_IGNORED" };
    }

    // 2. Parse client metadata & privacy-safe visitor hash
    const device = detectDevice(rawUa);
    const browser = detectBrowser(rawUa);
    const os = detectOS(rawUa);
    const visitorHash = generateVisitorHash(context.ip, rawUa);

    // Sanitize referrer
    let cleanReferrer: string | null = null;
    if (context.referrer && context.referrer.trim().length > 0) {
      try {
        const refUrl = new URL(context.referrer);
        cleanReferrer = refUrl.origin + refUrl.pathname;
        if (cleanReferrer.length > 500) {
          cleanReferrer = cleanReferrer.substring(0, 500);
        }
      } catch {
        cleanReferrer = context.referrer.substring(0, 250);
      }
    }

    // 3. Persist ClickEvent with privacy-safe visitor identifier
    await db.clickEvent.create({
      data: {
        linkId,
        referrer: cleanReferrer,
        device,
        browser,
        os,
        userAgent: rawUa.length > 500 ? rawUa.substring(0, 500) : rawUa,
        visitorHash,
      },
    });

    return { recorded: true };
  } catch (err) {
    // Fail silently in production or log error; NEVER crash or block the redirect
    console.error("[ClickService] Failed to record click event:", err);
    return { recorded: false, reason: "ERROR" };
  }
}
