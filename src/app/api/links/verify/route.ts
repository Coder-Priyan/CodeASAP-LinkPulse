import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  getLinkByCodeForRedirect,
  evaluateLinkRules,
  incrementClickCountAtomic,
} from "@/lib/services/link.service";
import { recordClick } from "@/lib/services/click.service";
import { isBot } from "@/lib/utils/user-agent";
import {
  checkPasswordRateLimit,
  recordPasswordAttempt,
  PasswordRateLimitError,
} from "@/lib/services/password-rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, password, src } = body;
    const source = src === "qr" ? "qr" : "direct";

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Short code is required." }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || null;

    const link = await getLinkByCodeForRedirect(code.trim());
    if (!link) {
      return NextResponse.json({ error: "Link not found." }, { status: 404 });
    }

    // 1. Check password attempt rate limit for this IP on this link
    await checkPasswordRateLimit(link.id, ip);

    // 2. Evaluate rules with provided password
    const evaluation = await evaluateLinkRules(link, password);

    if (evaluation.status === "INVALID_PASSWORD") {
      // Record failed attempt
      await recordPasswordAttempt(link.id, ip, false);
      return NextResponse.json(
        { error: "Incorrect passcode. Please verify and try again." },
        { status: 401 }
      );
    }

    if (evaluation.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: evaluation.reason || "This link is unavailable.",
          status: evaluation.status,
        },
        { status: 403 }
      );
    }

    // Record successful attempt and clear prior failures
    await recordPasswordAttempt(link.id, ip, true);

    // 3. Check for bot: bots should neither increment clicks nor consume limit
    const isBotVisitor = isBot(userAgent);

    if (!isBotVisitor) {
      // Atomically increment click counter
      const incrementResult = await incrementClickCountAtomic(link.id, link.clickLimit);
      if (!incrementResult.success) {
        return NextResponse.json(
          { error: `This link has reached its maximum limit of ${link.clickLimit} clicks.` },
          { status: 403 }
        );
      }

      try {
        if (typeof after === "function") {
          after(async () => {
            await recordClick(link.id, { userAgent, referrer, ip, source });
          });
        } else {
          void recordClick(link.id, { userAgent, referrer, ip, source });
        }
      } catch (err) {
        // Fallback if after() is invoked outside request scope
        void recordClick(link.id, { userAgent, referrer, ip, source });
      }
    }

    return NextResponse.json({
      success: true,
      destinationUrl: link.destinationUrl,
    });
  } catch (error) {
    if (error instanceof PasswordRateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        }
      );
    }
    console.error("[VerifyPassword] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during password verification." },
      { status: 500 }
    );
  }
}
