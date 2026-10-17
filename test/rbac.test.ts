import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { POST as registerHandler } from "@/app/api/auth/register/route";
import {
  createLink,
  getUserLinks,
  updateLinkRules,
  deleteLink,
  toggleLinkActive,
  evaluateLinkRules,
  LinkServiceError,
} from "@/lib/services/link.service";
import { createCampaign, deleteCampaign, CampaignServiceError } from "@/lib/services/campaign.service";
import { createTag, deleteTag, TagServiceError } from "@/lib/services/tag.service";
import { getAnalyticsReport } from "@/lib/services/analytics.service";
import { recordClick } from "@/lib/services/click.service";

describe("6. Role-Based Access Control (RBAC) & Multi-Tenant Isolation", () => {
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };
  let admin: { id: string; email: string };

  const createdLinkIds: string[] = [];
  const createdCampaignIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const u1 = await db.user.create({
      data: {
        email: `test-u1-${Date.now()}@linkpulse.test`,
        passwordHash: "hash",
        role: Role.USER,
      },
    });
    const u2 = await db.user.create({
      data: {
        email: `test-u2-${Date.now()}@linkpulse.test`,
        passwordHash: "hash",
        role: Role.USER,
      },
    });
    const adm = await db.user.create({
      data: {
        email: `test-adm-${Date.now()}@linkpulse.test`,
        passwordHash: "hash",
        role: Role.ADMIN,
      },
    });

    user1 = u1;
    user2 = u2;
    admin = adm;
    createdUserIds.push(u1.id, u2.id, adm.id);
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { linkId: { in: createdLinkIds } } });
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

  it("prevents User 2 from viewing or accessing User 1's links, campaigns, tags, and analytics", async () => {
    // 1. User 1 creates resources
    const link1 = await createLink({
      destinationUrl: "https://example.com/u1-target",
      customAlias: `u1-link-${Date.now()}`,
      userId: user1.id,
    });
    createdLinkIds.push(link1.id);

    const camp1 = await createCampaign(user1.id, { name: `Camp 1 ${Date.now()}` });
    createdCampaignIds.push(camp1.id);

    const tag1 = await createTag(user1.id, { name: `Tag 1 ${Date.now()}` });
    createdTagIds.push(tag1.id);

    // Record a click for User 1's link
    await recordClick(link1.id, { ip: "192.168.1.1", userAgent: "Chrome" });

    // 2. User 2 views their links -> link1 must NOT be present
    const u2Links = await getUserLinks(user2.id);
    expect(u2Links.some((l) => l.id === link1.id)).toBe(false);

    // 3. User 2 attempts to modify User 1's link -> throws FORBIDDEN
    await expect(
      updateLinkRules(link1.id, user2.id, Role.USER, {
        destinationUrl: "https://hacked.com",
      })
    ).rejects.toThrowError("Permission denied.");

    // 4. User 2 attempts to delete User 1's link -> throws FORBIDDEN
    await expect(deleteLink(link1.id, user2.id, Role.USER)).rejects.toThrowError(
      "Permission denied."
    );

    // 5. User 2 attempts to delete User 1's campaign -> throws 403
    await expect(deleteCampaign(user2.id, Role.USER, camp1.id)).rejects.toThrowError(
      CampaignServiceError
    );

    // 6. User 2 attempts to delete User 1's tag -> throws 403
    await expect(deleteTag(user2.id, Role.USER, tag1.id)).rejects.toThrowError(
      TagServiceError
    );

    // 7. User 2 requests analytics with scope='all' -> must only receive User 2's data (0 clicks)
    const u2Analytics = await getAnalyticsReport(user2.id, Role.USER, { scope: "all" });
    expect(u2Analytics.metrics.totalClicks).toBe(0);
    expect(u2Analytics.metrics.totalLinks).toBe(0);
  });

  it("allows Admin to disable any link; disabled link immediately stops redirecting and retains click history", async () => {
    const link = await createLink({
      destinationUrl: "https://example.com/target-to-disable",
      customAlias: `disable-test-${Date.now()}`,
      userId: user1.id,
    });
    createdLinkIds.push(link.id);

    // Record click history before disabling
    await recordClick(link.id, { ip: "10.0.0.1", userAgent: "Mozilla/5.0 Chrome" });
    await recordClick(link.id, { ip: "10.0.0.2", userAgent: "Mozilla/5.0 Safari" });

    const beforeClicks = await db.clickEvent.count({ where: { linkId: link.id } });
    expect(beforeClicks).toBe(2);

    // Admin disables User 1's link
    const updated = await toggleLinkActive(
      link.id,
      false,
      admin.id,
      Role.ADMIN,
      "Flagged for policy violation"
    );

    expect(updated.isActive).toBe(false);
    expect(updated.disabledReason).toBe("Flagged for policy violation");

    // Disabled link rule evaluation
    const evalResult = await evaluateLinkRules(updated);
    expect(evalResult.status).toBe("DISABLED");
    expect(evalResult.reason).toBe("Flagged for policy violation");

    // Click history must remain completely intact
    const afterClicks = await db.clickEvent.count({ where: { linkId: link.id } });
    expect(afterClicks).toBe(2);
  });

  it("enforces role USER on registration: POST /api/auth/register with {'role':'ADMIN'} creates a user with role USER in the DB", async () => {
    const testRegEmail = `test-reg-role-${Date.now()}@linkpulse.test`;
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testRegEmail,
        password: "ValidPassword123!",
        name: "Test Attacker",
        role: "ADMIN",
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(201);

    const createdUser = await db.user.findUnique({
      where: { email: testRegEmail },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.role).toBe(Role.USER);

    // Clean up test user
    if (createdUser) {
      await db.user.delete({ where: { id: createdUser.id } });
    }
  });
});
