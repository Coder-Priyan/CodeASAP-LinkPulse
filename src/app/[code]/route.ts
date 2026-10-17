import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  getLinkByCodeForRedirect,
  evaluateLinkRules,
  incrementClickCountAtomic,
} from "@/lib/services/link.service";
import { recordClick } from "@/lib/services/click.service";
import { isBot } from "@/lib/utils/user-agent";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  if (!code) {
    return NextResponse.redirect(new URL("/not-found", request.url));
  }

  // 1. Fetch link by indexed short code
  const link = await getLinkByCodeForRedirect(code);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!link) {
    const notFoundUrl = new URL("/link-status", appUrl);
    notFoundUrl.searchParams.set("code", code);
    notFoundUrl.searchParams.set("status", "NOT_FOUND");
    return NextResponse.redirect(notFoundUrl.toString(), { status: 307 });
  }

  const searchParams = request.nextUrl.searchParams;
  const rawSource = searchParams.get("src");
  const source = rawSource === "qr" ? "qr" : "direct";

  // 2. Evaluate rules in deliberate order: disabled -> blocked domain -> expired -> click limit -> password
  const evaluation = await evaluateLinkRules(link);

  if (evaluation.status !== "ACTIVE") {
    // If password is required, route to dedicated password prompt, preserving QR source marker
    if (evaluation.status === "PASSWORD_REQUIRED") {
      const pwdUrl = new URL(`/p/${encodeURIComponent(code)}`, appUrl);
      if (source === "qr") {
        pwdUrl.searchParams.set("src", "qr");
      }
      return NextResponse.redirect(pwdUrl.toString(), {
        status: 307,
      });
    }

    // Otherwise route to informative status page
    const statusUrl = new URL("/link-status", appUrl);
    statusUrl.searchParams.set("code", code);
    statusUrl.searchParams.set("status", evaluation.status);
    if (evaluation.reason) {
      statusUrl.searchParams.set("reason", evaluation.reason);
    }
    return NextResponse.redirect(statusUrl.toString(), { status: 307 });
  }

  // 3. Extract visitor headers & check for automated crawlers/bots
  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const isBotVisitor = isBot(userAgent);

  // 4. Human visits: increment atomic click counter & record click event
  // Bots (curl, preview crawlers) NEVER consume click limits or increment counters
  if (!isBotVisitor) {
    const incrementResult = await incrementClickCountAtomic(link.id, link.clickLimit);
    if (!incrementResult.success) {
      // A concurrent visit filled the final available slot
      const limitUrl = new URL("/link-status", appUrl);
      limitUrl.searchParams.set("code", code);
      limitUrl.searchParams.set("status", "LIMIT_REACHED");
      limitUrl.searchParams.set(
        "reason",
        `This link reached its maximum capacity of ${link.clickLimit} clicks.`
      );
      return NextResponse.redirect(limitUrl.toString(), { status: 307 });
    }

    // Asynchronous click tracking (does not block redirect)
    try {
      if (typeof after === "function") {
        after(async () => {
          await recordClick(link.id, { userAgent, referrer, ip, source });
        });
      } else {
        void recordClick(link.id, { userAgent, referrer, ip, source });
      }
    } catch (err) {
      console.error("[RedirectRoute] Logging dispatch error:", err);
    }
  }

  // 5. Instant HTTP 307 Temporary Redirect
  return NextResponse.redirect(link.destinationUrl, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
