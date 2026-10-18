import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import { executeCsvImport } from "@/lib/services/csv-import.service";
import { RateLimitError } from "@/lib/services/rate-limiter";
import { LinkServiceError } from "@/lib/services/link.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    let csvContent = "";
    const contentType = request.headers.get("content-type") || "";

    let campaignId: string | null = null;
    let tagIds: string[] | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No CSV file provided." },
          { status: 400 }
        );
      }
      csvContent = await (file as Blob).text();
      const camp = formData.get("campaignId");
      if (camp && typeof camp === "string") campaignId = camp;
      const rawTags = formData.get("tagIds");
      if (rawTags && typeof rawTags === "string") {
        try {
          tagIds = JSON.parse(rawTags);
        } catch {
          tagIds = undefined;
        }
      }
    } else {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
      }
      csvContent = body?.csvContent;
      campaignId = body?.campaignId || null;
      tagIds = Array.isArray(body?.tagIds) ? body.tagIds : undefined;
    }

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "CSV content is required." },
        { status: 400 }
      );
    }

    const summary = await executeCsvImport(csvContent, user.userId, {
      campaignId,
      tagIds,
    });
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    if (error instanceof LinkServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to execute CSV import." },
      { status: 400 }
    );
  }
}
