import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import {
  createLink,
  getUserLinks,
  getAllLinksAdmin,
  LinkServiceError,
} from "@/lib/services/link.service";
import { RateLimitError } from "@/lib/services/rate-limiter";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope");
    const campaignId = searchParams.get("campaignId") || undefined;
    const tagId = searchParams.get("tagId") || undefined;

    const filters = { campaignId, tagId };

    if (scope === "all" && user.role === Role.ADMIN) {
      const allLinks = await getAllLinksAdmin(filters);
      return NextResponse.json({ links: allLinks });
    }

    const userLinks = await getUserLinks(user.userId, filters);
    return NextResponse.json({ links: userLinks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Links GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch links." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { destinationUrl, customAlias, expiresAt, clickLimit, password, campaignId, tagIds } = body;

    const link = await createLink({
      destinationUrl,
      customAlias: customAlias ? String(customAlias) : undefined,
      userId: user.userId,
      expiresAt: expiresAt || null,
      clickLimit: clickLimit !== undefined && clickLimit !== null && clickLimit !== "" ? Number(clickLimit) : null,
      password: password ? String(password) : null,
      campaignId: campaignId ? String(campaignId) : null,
      tagIds: Array.isArray(tagIds) ? tagIds : undefined,
    });

    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, code: "RATE_LIMITED", retryAfter: error.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    if (error instanceof LinkServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[API Links POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create short link." },
      { status: 500 }
    );
  }
}
