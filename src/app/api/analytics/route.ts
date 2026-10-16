import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import { getAnalyticsReport, AnalyticsPeriod } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;

    const period = (searchParams.get("period") as AnalyticsPeriod) || "7d";
    const campaignId = searchParams.get("campaignId") || undefined;
    const scope = (searchParams.get("scope") as "me" | "all") || "me";

    const report = await getAnalyticsReport(user.userId, user.role, {
      period,
      campaignId,
      scope,
    });

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Analytics GET] Error:", error);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
