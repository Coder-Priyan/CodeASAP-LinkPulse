import { db } from "../db";
import { Role } from "@prisma/client";

export class CampaignServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "CampaignServiceError";
  }
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
}

/**
 * Creates a new campaign for a user.
 */
export async function createCampaign(userId: string, input: CreateCampaignInput) {
  const name = input.name.trim();
  if (!name) {
    throw new CampaignServiceError("Campaign name is required.", 400);
  }

  const existing = await db.campaign.findUnique({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });

  if (existing) {
    throw new CampaignServiceError(`A campaign named "${name}" already exists.`, 409);
  }

  return db.campaign.create({
    data: {
      name,
      description: input.description?.trim() || null,
      userId,
    },
  });
}

/**
 * Gets all campaigns owned by a user, with link counts and total clicks aggregated.
 */
export async function getUserCampaigns(userId: string) {
  const campaigns = await db.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      links: {
        select: {
          id: true,
          clicksCount: true,
        },
      },
      _count: {
        select: { links: true },
      },
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    linksCount: c._count.links,
    totalClicks: c.links.reduce((sum, l) => sum + (l.clicksCount || 0), 0),
  }));
}

/**
 * Deletes a campaign.
 * In accordance with business rules, deleting a campaign does NOT delete
 * its links or their click history (onDelete: SetNull).
 */
export async function deleteCampaign(userId: string, userRole: Role, campaignId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, userId: true },
  });

  if (!campaign) {
    throw new CampaignServiceError("Campaign not found.", 404);
  }

  if (userRole !== Role.ADMIN && campaign.userId !== userId) {
    throw new CampaignServiceError("Permission denied.", 403);
  }

  await db.campaign.delete({
    where: { id: campaignId },
  });

  return { success: true };
}
