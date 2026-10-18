import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { generateQrPng, generateQrSvg, getQrTargetUrl } from "@/lib/services/qr.service";
import { recordClick } from "@/lib/services/click.service";
import { evaluateLinkRules, incrementClickCountAtomic } from "@/lib/services/link.service";
import { NextRequest } from "next/server";

let mockUser: { userId: string; role: Role; email: string } | null = null;

vi.mock("@/lib/auth/guard", () => {
  class AuthError extends Error {
    constructor(message: string, public status: number = 401) {
      super(message);
      this.name = "AuthError";
    }
  }

  return {
    AuthError,
    requireAuth: vi.fn(async () => {
      if (!mockUser) {
        throw new AuthError("Authentication required.", 401);
      }
      return mockUser;
    }),
    requireAdmin: vi.fn(async () => {
      if (!mockUser) {
        throw new AuthError("Authentication required.", 401);
      }
      if (mockUser.role !== Role.ADMIN) {
        throw new AuthError("Administrator privileges required.", 403);
      }
      return mockUser;
    }),
  };
});

import { GET as getQrHandler } from "@/app/api/links/[id]/qr/route";

describe("Milestone 4: QR Codes with Scan Tracking", () => {
  let ownerUser: { id: string; email: string };
  let otherUser: { id: string; email: string };
  let adminUser: { id: string; email: string };
  const createdLinkIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();
    // 1. Create owner user
    ownerUser = await db.user.create({
      data: {
        email: `qr-owner-${timestamp}@linkpulse.test`,
        passwordHash: "hashed",
        role: Role.USER,
      },
    });
    createdUserIds.push(ownerUser.id);

    // 2. Create another user
    otherUser = await db.user.create({
      data: {
        email: `qr-other-${timestamp}@linkpulse.test`,
        passwordHash: "hashed",
        role: Role.USER,
      },
    });
    createdUserIds.push(otherUser.id);

    // 3. Create admin user
    adminUser = await db.user.create({
      data: {
        email: `qr-admin-${timestamp}@linkpulse.test`,
        passwordHash: "hashed",
        role: Role.ADMIN,
      },
    });
    createdUserIds.push(adminUser.id);
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("encodes the short URL with ?src=qr source marker", () => {
    const code = "qr-test-code";
    const targetUrl = getQrTargetUrl(code);
    expect(targetUrl).toContain(`/${code}?src=qr`);
  });

  it("generates valid server-side PNG buffer and SVG string", async () => {
    const code = "qr-render-code";
    const pngBuffer = await generateQrPng(code);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(100);

    const svgString = await generateQrSvg(code);
    expect(typeof svgString).toBe("string");
    expect(svgString).toContain("<svg");
    expect(svgString).toContain("</svg>");
  });

  it("supports custom size/width parameter for high-resolution output", async () => {
    const code = "qr-custom-size-test";
    const standardBuffer = await generateQrPng(code, 360);
    const hiResBuffer = await generateQrPng(code, 1024);
    expect(hiResBuffer).toBeInstanceOf(Buffer);
    expect(hiResBuffer.length).toBeGreaterThan(standardBuffer.length);
  });

  it("enforces RBAC on QR endpoint: owner and admin succeed, another user gets 403", async () => {
    const link = await db.link.create({
      data: {
        code: `qr-rbac-${Date.now()}`,
        destinationUrl: "https://example.com/qr-rbac",
        userId: ownerUser.id,
      },
    });
    createdLinkIds.push(link.id);

    // 1. Owner requests QR
    mockUser = { userId: ownerUser.id, email: ownerUser.email, role: Role.USER };
    const ownerReq = new NextRequest(`http://localhost:3000/api/links/${link.id}/qr?format=png`);
    const ownerRes = await getQrHandler(ownerReq, { params: Promise.resolve({ id: link.id }) });
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.headers.get("content-type")).toBe("image/png");

    // 2. Admin requests QR
    mockUser = { userId: adminUser.id, email: adminUser.email, role: Role.ADMIN };
    const adminReq = new NextRequest(`http://localhost:3000/api/links/${link.id}/qr?format=svg`);
    const adminRes = await getQrHandler(adminReq, { params: Promise.resolve({ id: link.id }) });
    expect(adminRes.status).toBe(200);
    expect(adminRes.headers.get("content-type")).toBe("image/svg+xml");
    expect(adminRes.headers.get("content-security-policy")).toBe("default-src 'none'");
    expect(adminRes.headers.get("x-content-type-options")).toBe("nosniff");

    // 3. Other user requests QR -> 403 Forbidden
    mockUser = { userId: otherUser.id, email: otherUser.email, role: Role.USER };
    const otherReq = new NextRequest(`http://localhost:3000/api/links/${link.id}/qr?format=png`);
    const otherRes = await getQrHandler(otherReq, { params: Promise.resolve({ id: link.id }) });
    expect(otherRes.status).toBe(403);
  });

  it("records source 'qr' when visited with ?src=qr", async () => {
    const link = await db.link.create({
      data: {
        code: `qr-src-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: ownerUser.id,
      },
    });
    createdLinkIds.push(link.id);

    const click = await recordClick(link.id, {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ip: "192.168.1.50",
      source: "qr",
    });

    expect(click.recorded).toBe(true);

    const savedEvent = await db.clickEvent.findFirst({
      where: { linkId: link.id },
    });
    expect(savedEvent?.source).toBe("qr");
  });

  it("normalizes unknown or raw ?src values to 'direct' allowlist", async () => {
    const link = await db.link.create({
      data: {
        code: `qr-allowlist-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: ownerUser.id,
      },
    });
    createdLinkIds.push(link.id);

    // 1. Unknown custom string
    await recordClick(link.id, {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ip: "192.168.1.51",
      source: "facebook_campaign",
    });

    // 2. SQL injection attempt or invalid chars
    await recordClick(link.id, {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ip: "192.168.1.52",
      source: "' OR 1=1 --",
    });

    // 3. Missing/undefined source
    await recordClick(link.id, {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ip: "192.168.1.53",
    });

    const events = await db.clickEvent.findMany({
      where: { linkId: link.id },
    });
    expect(events.length).toBe(3);
    for (const ev of events) {
      expect(ev.source).toBe("direct");
    }
  });

  it("ensures source marker does not affect rules, limits, or bot exclusion", async () => {
    const link = await db.link.create({
      data: {
        code: `qr-rules-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: ownerUser.id,
        clickLimit: 2,
        clicksCount: 2,
      },
    });
    createdLinkIds.push(link.id);

    // Rules evaluation ignores source parameter
    const evalResult = await evaluateLinkRules(link);
    expect(evalResult.status).toBe("LIMIT_REACHED");

    // Atomic limit check correctly denies increment
    const incrementResult = await incrementClickCountAtomic(link.id, link.clickLimit);
    expect(incrementResult.success).toBe(false);
    expect(incrementResult.limitExceeded).toBe(true);

    // Bot with ?src=qr is still recognized as bot and excluded from clicks
    const botResult = await recordClick(link.id, {
      userAgent: "curl/7.88.1",
      ip: "192.168.1.99",
      source: "qr",
    });
    expect(botResult.recorded).toBe(false);
    expect(botResult.reason).toBe("BOT_IGNORED");

    const botEvents = await db.clickEvent.findMany({
      where: { linkId: link.id },
    });
    expect(botEvents.length).toBe(0);
  });
});
