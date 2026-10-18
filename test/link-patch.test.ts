import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
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
  };
});

// Import PATCH handler after mock setup
import { PATCH } from "@/app/api/links/[id]/route";

describe("10. Link PATCH Campaign and Tag Updates", () => {
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };
  let camp1: { id: string; name: string };
  let camp2: { id: string; name: string };
  let tag1: { id: string; name: string };
  let tag2: { id: string; name: string };
  let tagOther: { id: string; name: string };

  const createdUserIds: string[] = [];
  const createdCampaignIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    // 1. Create two users
    const u1 = await db.user.create({
      data: {
        email: `test-patch-u1-${Date.now()}@linkpulse.test`,
        passwordHash: "hash123",
        role: Role.USER,
      },
    });
    const u2 = await db.user.create({
      data: {
        email: `test-patch-u2-${Date.now()}@linkpulse.test`,
        passwordHash: "hash123",
        role: Role.USER,
      },
    });

    user1 = u1;
    user2 = u2;
    createdUserIds.push(u1.id, u2.id);

    // 2. Create campaigns
    const c1 = await db.campaign.create({
      data: { name: `U1 Campaign ${Date.now()}`, userId: u1.id },
    });
    const c2 = await db.campaign.create({
      data: { name: `U2 Campaign ${Date.now()}`, userId: u2.id },
    });
    camp1 = c1;
    camp2 = c2;
    createdCampaignIds.push(c1.id, c2.id);

    // 3. Create tags
    const t1 = await db.tag.create({
      data: { name: `U1 Tag1 ${Date.now()}`, userId: u1.id, color: "#10B981" },
    });
    const t2 = await db.tag.create({
      data: { name: `U1 Tag2 ${Date.now()}`, userId: u1.id, color: "#3B82F6" },
    });
    const tOther = await db.tag.create({
      data: { name: `U2 Tag ${Date.now()}`, userId: u2.id, color: "#EF4444" },
    });
    tag1 = t1;
    tag2 = t2;
    tagOther = tOther;
    createdTagIds.push(t1.id, t2.id, tOther.id);

    // Default mock user is User 1
    mockUser = { userId: user1.id, role: Role.USER, email: user1.email };
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.linkTag.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (createdCampaignIds.length > 0) {
      await db.campaign.deleteMany({ where: { id: { in: createdCampaignIds } } });
    }
    if (createdTagIds.length > 0) {
      await db.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    }
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("successfully updates campaignId and tagIds on a link via PATCH", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-ok-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/initial",
        userId: user1.id,
      },
    });
    createdLinkIds.push(link.id);

    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: camp1.id,
        tagIds: [tag1.id, tag2.id],
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.link.campaignId).toBe(camp1.id);
    expect(data.link.campaign?.name).toBe(camp1.name);
    expect(data.link.tags).toHaveLength(2);

    // Verify persisted directly in database
    const dbLink = await db.link.findUnique({
      where: { id: link.id },
      include: { tags: true },
    });
    expect(dbLink?.campaignId).toBe(camp1.id);
    const assignedTagIds = dbLink?.tags.map((t) => t.tagId) || [];
    expect(assignedTagIds).toContain(tag1.id);
    expect(assignedTagIds).toContain(tag2.id);
  });

  it("rejects assigning another user's campaign with 403 FORBIDDEN", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-camp-rej-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/camp-check",
        userId: user1.id,
        campaignId: camp1.id,
      },
    });
    createdLinkIds.push(link.id);

    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: camp2.id, // belongs to user2!
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toMatch(/campaign/i);

    // DB link must remain untouched
    const dbLink = await db.link.findUnique({ where: { id: link.id } });
    expect(dbLink?.campaignId).toBe(camp1.id);
  });

  it("rejects assigning another user's tag with 403 FORBIDDEN", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-tag-rej-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/tag-check",
        userId: user1.id,
        tags: {
          create: [{ tagId: tag1.id }],
        },
      },
    });
    createdLinkIds.push(link.id);

    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tagIds: [tag1.id, tagOther.id], // tagOther belongs to user2!
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toMatch(/tag/i);

    // DB link tags must remain untouched
    const dbTags = await db.linkTag.findMany({ where: { linkId: link.id } });
    expect(dbTags).toHaveLength(1);
    expect(dbTags[0].tagId).toBe(tag1.id);
  });

  it("allows explicitly unlinking campaign and clearing tags", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-clear-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/clear",
        userId: user1.id,
        campaignId: camp1.id,
        tags: {
          create: [{ tagId: tag1.id }],
        },
      },
    });
    createdLinkIds.push(link.id);

    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: null,
        tagIds: [],
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(200);

    const dbLink = await db.link.findUnique({
      where: { id: link.id },
      include: { tags: true },
    });
    expect(dbLink?.campaignId).toBeNull();
    expect(dbLink?.tags).toHaveLength(0);
  });

  it("preserves campaign and tags when updating other fields and omitting campaignId/tagIds", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-preserve-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/before",
        userId: user1.id,
        campaignId: camp1.id,
        tags: {
          create: [{ tagId: tag1.id }],
        },
      },
    });
    createdLinkIds.push(link.id);

    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationUrl: "https://pulse-safe-test-target.org/after",
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(200);

    const dbLink = await db.link.findUnique({
      where: { id: link.id },
      include: { tags: true },
    });
    expect(dbLink?.destinationUrl).toBe("https://pulse-safe-test-target.org/after");
    expect(dbLink?.campaignId).toBe(camp1.id);
    expect(dbLink?.tags).toHaveLength(1);
    expect(dbLink?.tags[0].tagId).toBe(tag1.id);
  });

  it("updates the link title via PATCH /api/links/[id] with trimming and empty-to-null rules", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-title-${Date.now()}`,
        destinationUrl: "https://my-safe-patch-domain.org/initial",
        title: "Old Title",
        userId: user1.id,
      },
    });
    createdLinkIds.push(link.id);

    // 1. Updating with leading/trailing spaces trims the title
    const req1 = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "   Trimmed Brand Title   ",
      }),
    });
    const res1 = await PATCH(req1, { params: Promise.resolve({ id: link.id }) });
    expect(res1.status).toBe(200);

    let dbLink = await db.link.findUnique({ where: { id: link.id } });
    expect(dbLink?.title).toBe("Trimmed Brand Title");

    // 2. Updating with empty string or whitespace sets title to null
    const req2 = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "     ",
      }),
    });
    const res2 = await PATCH(req2, { params: Promise.resolve({ id: link.id }) });
    expect(res2.status).toBe(200);

    dbLink = await db.link.findUnique({ where: { id: link.id } });
    expect(dbLink?.title).toBeNull();
  });

  it("rejects title exceeding 255 characters with 422 INVALID_TITLE", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-len-${Date.now()}`,
        destinationUrl: "https://my-safe-patch-domain.org/initial",
        title: "Initial Title",
        userId: user1.id,
      },
    });
    createdLinkIds.push(link.id);

    const longTitle = "A".repeat(256);
    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: longTitle,
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.code).toBe("INVALID_TITLE");
  });

  it("enforces ownership on PATCH: non-owner gets 403 Forbidden", async () => {
    const link = await db.link.create({
      data: {
        code: `test-patch-owner-${Date.now()}`,
        destinationUrl: "https://my-safe-patch-domain.org/initial",
        title: "Owner's Link",
        userId: user1.id,
      },
    });
    createdLinkIds.push(link.id);

    // Switch mock session user to user2 (non-owner)
    mockUser = { userId: user2.id, email: user2.email, role: Role.USER };

    const req = new NextRequest(`http://localhost:3000/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Hacked Title",
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: link.id }) });
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toMatch(/permission denied/i);

    // Switch back to user1
    mockUser = { userId: user1.id, email: user1.email, role: Role.USER };
  });
});
