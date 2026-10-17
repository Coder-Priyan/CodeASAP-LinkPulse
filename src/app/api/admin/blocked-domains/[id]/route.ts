import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/guard";
import {
  removeBlockedDomain,
  BlockedDomainError,
} from "@/lib/services/blocked-domain.service";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Blocked domain ID required." }, { status: 400 });
    }

    await removeBlockedDomain(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BlockedDomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[API Admin BlockedDomains DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to remove blocked domain." }, { status: 500 });
  }
}
