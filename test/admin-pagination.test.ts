import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET as getLinksHandler } from "@/app/api/links/route";

let currentTestUser: { userId: string; role: Role; email: string } | null = null;

// Mock requireAuth to dynamically return whichever user is set for the test
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
      if (!currentTestUser) {
        throw new AuthError("Authentication required.", 401);
      }
      return currentTestUser;
    }),
  };
});

describe("D3: PERF-03 Admin Links Pagination & Scope Enforcement", () => {
  let adminUser: { id: string; email: string };
  let standardUser: { id: string; email: string };
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    // 1. Create an admin user and standard user
    const admin = await db.user.create({
      data: {
        email: `admin-pag-${Date.now()}@linkpulse.test`,
        passwordHash: "dummyhash",
        role: Role.ADMIN,
      },
    });
    adminUser = { id: admin.id, email: admin.email };

    const standard = await db.user.create({
      data: {
        email: `user-pag-${Date.now()}@linkpulse.test`,
        passwordHash: "dummyhash",
        role: Role.USER,
      },
    });
    standardUser = { id: standard.id, email: standard.email };

    // 2. Create 3 links for admin and 2 links for standard user
    for (let i = 1; i <= 3; i++) {
      const l = await db.link.create({
        data: {
          code: `pag-adm-${Date.now()}-${i}`,
          destinationUrl: `https://example.com/admin-${i}`,
          userId: adminUser.id,
        },
      });
      createdLinkIds.push(l.id);
    }

    for (let i = 1; i <= 2; i++) {
      const l = await db.link.create({
        data: {
          code: `pag-usr-${Date.now()}-${i}`,
          destinationUrl: `https://example.com/user-${i}`,
          userId: standardUser.id,
        },
      });
      createdLinkIds.push(l.id);
    }
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (adminUser?.id) {
      await db.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (standardUser?.id) {
      await db.user.delete({ where: { id: standardUser.id } }).catch(() => {});
    }
  });

  it("admin scope=all: returns paginated links with total count, page metadata, and hasMore", async () => {
    currentTestUser = {
      userId: adminUser.id,
      role: Role.ADMIN,
      email: adminUser.email,
    };

    // Page 1 with limit 2
    const reqPage1 = new NextRequest("http://localhost:3000/api/links?scope=all&limit=2&offset=0");
    const resPage1 = await getLinksHandler(reqPage1);
    expect(resPage1.status).toBe(200);

    const dataPage1 = await resPage1.json();
    expect(dataPage1.links.length).toBe(2);
    expect(dataPage1.limit).toBe(2);
    expect(dataPage1.offset).toBe(0);
    expect(dataPage1.page).toBe(1);
    expect(dataPage1.total).toBeGreaterThanOrEqual(5); // At least our 5 seeded links
    expect(dataPage1.hasMore).toBe(true);

    // Page 2 with limit 2
    const reqPage2 = new NextRequest("http://localhost:3000/api/links?scope=all&limit=2&offset=2");
    const resPage2 = await getLinksHandler(reqPage2);
    expect(resPage2.status).toBe(200);

    const dataPage2 = await resPage2.json();
    expect(dataPage2.links.length).toBe(2);
    expect(dataPage2.limit).toBe(2);
    expect(dataPage2.offset).toBe(2);
    expect(dataPage2.page).toBe(2);

    // Ensure Page 1 and Page 2 links do not overlap
    const page1Ids = new Set(dataPage1.links.map((l: any) => l.id));
    for (const l of dataPage2.links) {
      expect(page1Ids.has(l.id)).toBe(false);
    }
  });

  it("non-admin scope enforcement: regular user requesting scope=all gets strictly scoped to their own links", async () => {
    currentTestUser = {
      userId: standardUser.id,
      role: Role.USER,
      email: standardUser.email,
    };

    // User attempts to query scope=all
    const req = new NextRequest("http://localhost:3000/api/links?scope=all&limit=50&offset=0");
    const res = await getLinksHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    // Must only contain links belonging to standardUser
    expect(data.links.length).toBe(2);
    expect(data.total).toBe(2);
    for (const link of data.links) {
      expect(link.userId || currentTestUser.userId).toBe(standardUser.id);
    }
  });

  it("handles offset past total gracefully", async () => {
    currentTestUser = {
      userId: adminUser.id,
      role: Role.ADMIN,
      email: adminUser.email,
    };

    const req = new NextRequest("http://localhost:3000/api/links?scope=all&limit=10&offset=99999");
    const res = await getLinksHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.links).toEqual([]);
    expect(data.hasMore).toBe(false);
  });
});
