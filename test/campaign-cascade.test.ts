import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createCampaign, deleteCampaign } from "@/lib/services/campaign.service";
import { recordClick } from "@/lib/services/click.service";

describe("9. Campaign Deletion Safe Cascade", () => {
  let testUserId: string;
  let testLinkId: string;

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-cascade-${Date.now()}@linkpulse.test`,
        passwordHash: "hash",
        role: Role.USER,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testLinkId) {
      await db.clickEvent.deleteMany({ where: { linkId: testLinkId } });
      await db.link.deleteMany({ where: { id: testLinkId } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("deleting a campaign decouples the campaign but preserves links and their click history", async () => {
    // 1. Create a campaign
    const campaign = await createCampaign(testUserId, {
      name: `Promo Campaign ${Date.now()}`,
      description: "Testing cascade safety",
    });

    // 2. Create a link assigned to this campaign
    const link = await db.link.create({
      data: {
        code: `test-casc-${Date.now()}`,
        destinationUrl: "https://example.com/preserve-me",
        userId: testUserId,
        campaignId: campaign.id,
        clicksCount: 3,
      },
    });
    testLinkId = link.id;

    // 3. Record 3 click events
    await recordClick(link.id, { ip: "10.0.0.1", userAgent: "Chrome" });
    await recordClick(link.id, { ip: "10.0.0.2", userAgent: "Safari" });
    await recordClick(link.id, { ip: "10.0.0.3", userAgent: "Firefox" });

    const initialEvents = await db.clickEvent.count({ where: { linkId: link.id } });
    expect(initialEvents).toBe(3);

    // 4. Delete the campaign
    const delResult = await deleteCampaign(testUserId, Role.USER, campaign.id);
    expect(delResult.success).toBe(true);

    // 5. Verify the campaign is deleted
    const checkCampaign = await db.campaign.findUnique({ where: { id: campaign.id } });
    expect(checkCampaign).toBeNull();

    // 6. Verify the link STILL EXISTS and campaignId is safely decoupled to null
    const checkLink = await db.link.findUnique({ where: { id: link.id } });
    expect(checkLink).not.toBeNull();
    expect(checkLink?.id).toBe(link.id);
    expect(checkLink?.campaignId).toBeNull();
    expect(checkLink?.clicksCount).toBe(3);

    // 7. Verify all click events remain intact
    const remainingEvents = await db.clickEvent.count({ where: { linkId: link.id } });
    expect(remainingEvents).toBe(3);
  });
});
