import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import {
  updateLinkRules,
  deleteLink,
  LinkServiceError,
} from "@/lib/services/link.service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const updated = await updateLinkRules(id, user.userId, user.role, {
      destinationUrl: body.destinationUrl,
      isActive: body.isActive,
      expiresAt: body.expiresAt,
      clickLimit: body.clickLimit,
      password: body.password,
      removePassword: body.removePassword,
      disabledReason: body.disabledReason,
      campaignId: body.campaignId,
      tagIds: body.tagIds,
    });

    return NextResponse.json({ success: true, link: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof LinkServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[API Links PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update link." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    await deleteLink(id, user.userId, user.role);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof LinkServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[API Links DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete link." },
      { status: 500 }
    );
  }
}
