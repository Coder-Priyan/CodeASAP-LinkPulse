import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/guard";
import {
  listBlockedDomains,
  addBlockedDomain,
  BlockedDomainError,
} from "@/lib/services/blocked-domain.service";

export async function GET() {
  try {
    await requireAdmin();
    const domains = await listBlockedDomains();
    return NextResponse.json({ success: true, domains, blockedDomains: domains });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Admin BlockedDomains GET] Error:", error);
    return NextResponse.json({ error: "Failed to list blocked domains." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { domain, reason } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain is required." }, { status: 400 });
    }

    const blocked = await addBlockedDomain(domain, admin.userId, reason);
    return NextResponse.json({ success: true, blockedDomain: blocked }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BlockedDomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[API Admin BlockedDomains POST] Error:", error);
    return NextResponse.json({ error: "Failed to add blocked domain." }, { status: 500 });
  }
}
