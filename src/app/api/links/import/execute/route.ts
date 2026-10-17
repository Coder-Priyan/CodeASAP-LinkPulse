import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import { executeCsvImport } from "@/lib/services/csv-import.service";
import { RateLimitError } from "@/lib/services/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    let csvContent = "";
    const contentType = request.headers.get("content-type") || "";

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
    } else {
      const body = await request.json();
      csvContent = body.csvContent;
    }

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "CSV content is required." },
        { status: 400 }
      );
    }

    const summary = await executeCsvImport(csvContent, user.userId);
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
    return NextResponse.json(
      { error: error?.message || "Failed to execute CSV import." },
      { status: 400 }
    );
  }
}
