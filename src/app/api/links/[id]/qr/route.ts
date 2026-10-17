import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { getQrTargetUrl, generateQrPng, generateQrSvg } from "@/lib/services/qr.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Link ID required." }, { status: 400 });
    }

    const link = await db.link.findUnique({
      where: { id },
      select: { id: true, code: true, userId: true },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found." }, { status: 404 });
    }

    // Access control: owner or ADMIN only
    if (link.userId !== user.userId && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") === "svg" ? "svg" : "png";
    const isDownload = searchParams.get("download") === "true";

    const targetUrl = getQrTargetUrl(link.code);

    if (format === "svg") {
      const svgString = await generateQrSvg(targetUrl);
      const headers = new Headers({
        "Content-Type": "image/svg+xml",
        "Cache-Control": "private, max-age=3600",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      });
      if (isDownload) {
        headers.set("Content-Disposition", `attachment; filename="${link.code}-qr.svg"`);
      }
      return new NextResponse(svgString, { status: 200, headers });
    }

    // Default to PNG
    const pngBuffer = await generateQrPng(targetUrl);
    const headers = new Headers({
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    });
    if (isDownload) {
      headers.set("Content-Disposition", `attachment; filename="${link.code}-qr.png"`);
    }
    return new NextResponse(new Uint8Array(pngBuffer), { status: 200, headers });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API Link QR GET] Error:", error);
    return NextResponse.json({ error: "Failed to generate QR code." }, { status: 500 });
  }
}
