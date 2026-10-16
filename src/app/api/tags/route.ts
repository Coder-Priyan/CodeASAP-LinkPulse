import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import { createTag, getUserTags, TagServiceError } from "@/lib/services/tag.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const tags = await getUserTags(user.userId);
    return NextResponse.json({ tags });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Tags GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch tags." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, color } = body;

    const tag = await createTag(user.userId, {
      name,
      color,
    });

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof TagServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Tags POST] Error:", error);
    return NextResponse.json({ error: "Failed to create tag." }, { status: 500 });
  }
}
