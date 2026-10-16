import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import { deleteTag, TagServiceError } from "@/lib/services/tag.service";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    await deleteTag(user.userId, user.role, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof TagServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Tags DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete tag." }, { status: 500 });
  }
}
