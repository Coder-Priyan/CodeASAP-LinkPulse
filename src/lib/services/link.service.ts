import { db } from "../db";
import { validateUrl } from "../validations/url-validator";
import { validateCustomAlias } from "../validations/alias-validator";
import { generateShortCode } from "../utils/code-generator";
import { checkLinkCreationRateLimit } from "./rate-limiter";
import { isDomainBlocked } from "./blocked-domain.service";
import bcrypt from "bcryptjs";
import { Role, Prisma } from "@prisma/client";

export class LinkServiceError extends Error {
  constructor(message: string, public code: string = "BAD_REQUEST", public status: number = 400) {
    super(message);
    this.name = "LinkServiceError";
  }
}

export type ComputedLinkState = "active" | "expired" | "limit_reached" | "disabled";

export type LinkEvaluationStatus =
  | "ACTIVE"
  | "DISABLED"
  | "BLOCKED"
  | "EXPIRED"
  | "LIMIT_REACHED"
  | "PASSWORD_REQUIRED"
  | "INVALID_PASSWORD"
  | "NOT_FOUND";

export interface CreateLinkInput {
  title?: string | null;
  destinationUrl: string;
  customAlias?: string;
  userId: string;
  expiresAt?: Date | string | null;
  clickLimit?: number | null;
  password?: string | null;
  campaignId?: string | null;
  tagIds?: string[];
  skipRateLimit?: boolean;
}

export interface UpdateLinkRulesInput {
  title?: string | null;
  destinationUrl?: string;
  isActive?: boolean;
  expiresAt?: Date | string | null;
  clickLimit?: number | null;
  password?: string | null;
  removePassword?: boolean;
  disabledReason?: string | null;
  campaignId?: string | null;
  tagIds?: string[];
}

export interface LinkFilters {
  campaignId?: string;
  tagId?: string;
}

export interface TagSummary {
  id: string;
  name: string;
  color: string | null;
}

export interface CampaignSummary {
  id: string;
  name: string;
}

export interface LinkWithStats {
  id: string;
  code: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  disabledReason: string | null;
  expiresAt: Date | null;
  clickLimit: number | null;
  hasPassword: boolean;
  campaignId: string | null;
  campaign: CampaignSummary | null;
  tags: TagSummary[];
  createdAt: Date;
  updatedAt: Date;
  clicksCount: number;
  uniqueVisitorsCount: number;
  qrScansCount: number;
  state: ComputedLinkState;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
}

/**
 * Computes the real-time operational state of a link based on its rules.
 * Order: disabled -> expired -> limit reached -> active
 */
export function computeLinkState(link: {
  isActive: boolean;
  expiresAt?: Date | null;
  clickLimit?: number | null;
  clicksCount: number;
}): ComputedLinkState {
  if (!link.isActive) return "disabled";
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) return "expired";
  if (link.clickLimit !== null && link.clickLimit !== undefined && link.clicksCount >= link.clickLimit) {
    return "limit_reached";
  }
  return "active";
}

/**
 * Evaluates redirect rules in a deliberate, centralized order:
 * 1. Disabled (admin or owner manual toggle)
 * 2. Blocked Domain (platform safety check against admin domain blocklist)
 *    Placed immediately after disabled state because malicious or policy-violating
 *    destination domains must be intercepted before consuming click limits, time
 *    expiry checks, or presenting password prompts.
 * 3. Expired (time-based expiry)
 * 4. Click Limit (maximum visit capacity)
 * 5. Password Protection (hashed verification)
 */
export async function evaluateLinkRules(
  link: {
    id: string;
    code: string;
    destinationUrl: string;
    isActive: boolean;
    expiresAt: Date | null;
    clickLimit: number | null;
    passwordHash: string | null;
    disabledReason: string | null;
    clicksCount: number;
  },
  providedPassword?: string | null
): Promise<{ status: LinkEvaluationStatus; reason?: string }> {
  // 1. Check disabled state
  if (!link.isActive) {
    return {
      status: "DISABLED",
      reason: link.disabledReason || "This link has been deactivated.",
    };
  }

  // 2. Check admin domain blocklist (platform safety overrides expiry/limits/passwords)
  const blockCheck = await isDomainBlocked(link.destinationUrl);
  if (blockCheck.isBlocked) {
    return {
      status: "BLOCKED",
      reason: blockCheck.reason || "This destination domain has been blocked by administrators.",
    };
  }

  // 3. Check expiration date
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    return {
      status: "EXPIRED",
      reason: `This link expired on ${new Date(link.expiresAt).toUTCString()}.`,
    };
  }

  // 3. Check click limit
  if (link.clickLimit !== null && link.clickLimit !== undefined && link.clicksCount >= link.clickLimit) {
    return {
      status: "LIMIT_REACHED",
      reason: `This link has reached its maximum capacity of ${link.clickLimit} clicks.`,
    };
  }

  // 4. Check password protection
  if (link.passwordHash) {
    if (!providedPassword) {
      return {
        status: "PASSWORD_REQUIRED",
        reason: "A password is required to access this destination.",
      };
    }

    const isValid = await bcrypt.compare(providedPassword, link.passwordHash);
    if (!isValid) {
      return {
        status: "INVALID_PASSWORD",
        reason: "Incorrect password entered.",
      };
    }
  }

  return { status: "ACTIVE" };
}

/**
 * Atomically increments the click counter on the Link.
 * If a clickLimit is configured, performs a conditional atomic update:
 * `WHERE id = ... AND clicksCount < clickLimit`
 *
 * This guarantees that concurrent visits never exceed the limit.
 */
export async function incrementClickCountAtomic(
  linkId: string,
  clickLimit: number | null
): Promise<{ success: boolean; limitExceeded: boolean }> {
  if (clickLimit !== null && clickLimit !== undefined) {
    // Atomic conditional SQL update
    const updatedCount = await db.$executeRaw`
      UPDATE "Link"
      SET "clicksCount" = "clicksCount" + 1
      WHERE "id" = ${linkId} AND "clicksCount" < ${clickLimit}
    `;

    if (updatedCount === 0) {
      return { success: false, limitExceeded: true };
    }
    return { success: true, limitExceeded: false };
  }

  // If no click limit, standard atomic increment
  await db.link.update({
    where: { id: linkId },
    data: { clicksCount: { increment: 1 } },
  });

  return { success: true, limitExceeded: false };
}

/**
 * Creates a new shortened link with validated URL, unique alias, rules, and optional campaign/tags.
 */
export async function createLink(input: CreateLinkInput): Promise<LinkWithStats> {
  const { title, destinationUrl, customAlias, userId, expiresAt, clickLimit, password, campaignId, tagIds, skipRateLimit } = input;

  // 1. Enforce rate limiting per user (unless bypassed for bulk import)
  if (!skipRateLimit) {
    await checkLinkCreationRateLimit(userId);
  }

  // 2. Validate destination URL
  const urlValidation = validateUrl(destinationUrl);
  if (!urlValidation.isValid || !urlValidation.normalizedUrl) {
    throw new LinkServiceError(
      urlValidation.error || "Invalid destination URL.",
      "INVALID_URL",
      422
    );
  }
  const cleanUrl = urlValidation.normalizedUrl;

  // 2b. Check against admin domain blocklist
  const blockCheck = await isDomainBlocked(cleanUrl);
  if (blockCheck.isBlocked) {
    throw new LinkServiceError(
      blockCheck.reason ? `Destination domain is blocked: ${blockCheck.reason}` : "Destination domain is blocked by platform policy.",
      "BLOCKED_DOMAIN",
      422
    );
  }

  let finalCode = "";

  // 3. Validate custom alias if provided
  if (customAlias && customAlias.trim().length > 0) {
    const aliasValidation = validateCustomAlias(customAlias);
    if (!aliasValidation.isValid || !aliasValidation.sanitizedAlias) {
      throw new LinkServiceError(
        aliasValidation.error || "Invalid custom alias.",
        "INVALID_ALIAS",
        422
      );
    }
    const sanitized = aliasValidation.sanitizedAlias;

    // Check if alias is already taken
    const existing = await db.link.findUnique({
      where: { code: sanitized },
      select: { id: true },
    });

    if (existing) {
      throw new LinkServiceError(
        `Alias "${sanitized}" is already in use. Please pick another one.`,
        "DUPLICATE_ALIAS",
        409
      );
    }

    finalCode = sanitized;
  } else {
    // 4. Generate unique random short code with collision avoidance retry
    let attempts = 0;
    const maxAttempts = 5;
    let uniqueFound = false;

    while (attempts < maxAttempts && !uniqueFound) {
      const candidate = generateShortCode(6);
      const existing = await db.link.findUnique({
        where: { code: candidate },
        select: { id: true },
      });

      if (!existing) {
        finalCode = candidate;
        uniqueFound = true;
      }
      attempts++;
    }

    if (!uniqueFound) {
      finalCode = generateShortCode(7);
    }
  }

  // 5. Parse rules: Expiry, Click Limit, Password
  let parsedExpiry: Date | null = null;
  if (expiresAt) {
    parsedExpiry = new Date(expiresAt);
    if (isNaN(parsedExpiry.getTime())) {
      throw new LinkServiceError("Invalid expiration date format.", "INVALID_EXPIRY", 422);
    }
    if (parsedExpiry.getTime() <= Date.now()) {
      throw new LinkServiceError("Expiration date must be in the future.", "INVALID_EXPIRY", 422);
    }
  }

  let parsedLimit: number | null = null;
  if (clickLimit !== undefined && clickLimit !== null && String(clickLimit).trim() !== "") {
    parsedLimit = parseInt(String(clickLimit), 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new LinkServiceError("Click limit must be a positive number.", "INVALID_LIMIT", 422);
    }
  }

  let passwordHash: string | null = null;
  if (password && password.trim().length > 0) {
    if (password.length < 4) {
      throw new LinkServiceError("Link password must be at least 4 characters.", "INVALID_PASSWORD", 422);
    }
    passwordHash = await bcrypt.hash(password, 12);
  }

  // 6. Verify Campaign ownership if provided
  let validCampaignId: string | null = null;
  if (campaignId) {
    const camp = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, userId: true },
    });
    if (camp && camp.userId === userId) {
      validCampaignId = camp.id;
    }
  }

  // 7. Create the link entity with relations
  const link = await db.link.create({
    data: {
      code: finalCode,
      destinationUrl: cleanUrl,
      title: title ? title.trim() : null,
      userId,
      isActive: true,
      expiresAt: parsedExpiry,
      clickLimit: parsedLimit,
      passwordHash,
      clicksCount: 0,
      campaignId: validCampaignId,
      tags: tagIds && tagIds.length > 0 ? {
        create: tagIds.map((tagId) => ({ tagId })),
      } : undefined,
    },
    include: {
      campaign: {
        select: { id: true, name: true },
      },
      tags: {
        select: {
          tag: {
            select: { id: true, name: true, color: true },
          },
        },
      },
    },
  });

  const state = computeLinkState({
    isActive: link.isActive,
    expiresAt: link.expiresAt,
    clickLimit: link.clickLimit,
    clicksCount: 0,
  });

  return {
    id: link.id,
    code: link.code,
    destinationUrl: link.destinationUrl,
    title: link.title,
    isActive: link.isActive,
    disabledReason: link.disabledReason,
    expiresAt: link.expiresAt,
    clickLimit: link.clickLimit,
    hasPassword: Boolean(link.passwordHash),
    campaignId: link.campaignId,
    campaign: link.campaign,
    tags: link.tags.map((t) => t.tag),
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    clicksCount: 0,
    uniqueVisitorsCount: 0,
    qrScansCount: 0,
    state,
  };
}

/**
 * Retrieve a link by short code for evaluation.
 */
export async function getLinkByCodeForRedirect(code: string) {
  if (!code || typeof code !== "string") return null;

  return db.link.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      destinationUrl: true,
      isActive: true,
      expiresAt: true,
      clickLimit: true,
      passwordHash: true,
      disabledReason: true,
      clicksCount: true,
    },
  });
}

/**
 * Helper to calculate unique visitors for a set of link IDs.
 */
async function getUniqueVisitorsMap(linkIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (linkIds.length === 0) return map;

  const grouped = await db.clickEvent.groupBy({
    by: ["linkId", "visitorHash"],
    where: {
      linkId: { in: linkIds },
      visitorHash: { not: null },
    },
  });

  for (const row of grouped) {
    map.set(row.linkId, (map.get(row.linkId) || 0) + 1);
  }

  return map;
}

async function getQrScansMap(linkIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (linkIds.length === 0) return map;

  const grouped = await db.clickEvent.groupBy({
    by: ["linkId"],
    where: {
      linkId: { in: linkIds },
      source: "qr",
    },
    _count: {
      _all: true,
    },
  });

  for (const row of grouped) {
    map.set(row.linkId, row._count._all);
  }

  return map;
}

/**
 * Get all links owned by a specific user with click counts, unique visitors, and optional campaign/tag filtering.
 */
export async function getUserLinks(
  userId: string,
  filters: LinkFilters = {}
): Promise<LinkWithStats[]> {
  const where: Prisma.LinkWhereInput = { userId };

  if (filters.campaignId) {
    where.campaignId = filters.campaignId;
  }
  if (filters.tagId) {
    where.tags = {
      some: { tagId: filters.tagId },
    };
  }

  const links = await db.link.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      campaign: {
        select: { id: true, name: true },
      },
      tags: {
        select: {
          tag: {
            select: { id: true, name: true, color: true },
          },
        },
      },
    },
  });

  const linkIds = links.map((l) => l.id);
  const [uniqueMap, qrMap] = await Promise.all([
    getUniqueVisitorsMap(linkIds),
    getQrScansMap(linkIds),
  ]);

  return links.map((l) => {
    const state = computeLinkState({
      isActive: l.isActive,
      expiresAt: l.expiresAt,
      clickLimit: l.clickLimit,
      clicksCount: l.clicksCount,
    });

    return {
      id: l.id,
      code: l.code,
      destinationUrl: l.destinationUrl,
      title: l.title,
      isActive: l.isActive,
      disabledReason: l.disabledReason,
      expiresAt: l.expiresAt,
      clickLimit: l.clickLimit,
      hasPassword: Boolean(l.passwordHash),
      campaignId: l.campaignId,
      campaign: l.campaign,
      tags: l.tags.map((t) => t.tag),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      clicksCount: l.clicksCount,
      uniqueVisitorsCount: uniqueMap.get(l.id) || 0,
      qrScansCount: qrMap.get(l.id) || 0,
      state,
    };
  });
}

/**
 * Get all links in the entire system (ADMIN role only) with creator email, click counts, and unique visitors.
 */
export async function getAllLinksAdmin(filters: LinkFilters = {}): Promise<LinkWithStats[]> {
  const where: Prisma.LinkWhereInput = {};

  if (filters.campaignId) {
    where.campaignId = filters.campaignId;
  }
  if (filters.tagId) {
    where.tags = {
      some: { tagId: filters.tagId },
    };
  }

  const links = await db.link.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      campaign: {
        select: { id: true, name: true },
      },
      tags: {
        select: {
          tag: {
            select: { id: true, name: true, color: true },
          },
        },
      },
    },
  });

  const linkIds = links.map((l) => l.id);
  const [uniqueMap, qrMap] = await Promise.all([
    getUniqueVisitorsMap(linkIds),
    getQrScansMap(linkIds),
  ]);

  return links.map((l) => {
    const state = computeLinkState({
      isActive: l.isActive,
      expiresAt: l.expiresAt,
      clickLimit: l.clickLimit,
      clicksCount: l.clicksCount,
    });

    return {
      id: l.id,
      code: l.code,
      destinationUrl: l.destinationUrl,
      title: l.title,
      isActive: l.isActive,
      disabledReason: l.disabledReason,
      expiresAt: l.expiresAt,
      clickLimit: l.clickLimit,
      hasPassword: Boolean(l.passwordHash),
      campaignId: l.campaignId,
      campaign: l.campaign,
      tags: l.tags.map((t) => t.tag),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      clicksCount: l.clicksCount,
      uniqueVisitorsCount: uniqueMap.get(l.id) || 0,
      qrScansCount: qrMap.get(l.id) || 0,
      state,
      user: l.user,
    };
  });
}

/**
 * Update a link's configuration and rules after creation.
 */
export async function updateLinkRules(
  linkId: string,
  userId: string,
  userRole: Role,
  input: UpdateLinkRulesInput
) {
  const link = await db.link.findUnique({
    where: { id: linkId },
    select: { id: true, userId: true },
  });

  if (!link) {
    throw new LinkServiceError("Link not found.", "NOT_FOUND", 404);
  }

  if (userRole !== Role.ADMIN && link.userId !== userId) {
    throw new LinkServiceError("Permission denied.", "FORBIDDEN", 403);
  }

  const updateData: Prisma.LinkUpdateInput = {};

  if (input.title !== undefined) {
    updateData.title = input.title && input.title.trim() ? input.title.trim() : null;
  }

  if (input.destinationUrl !== undefined) {
    const urlValidation = validateUrl(input.destinationUrl);
    if (!urlValidation.isValid || !urlValidation.normalizedUrl) {
      throw new LinkServiceError(urlValidation.error || "Invalid destination URL.", "INVALID_URL", 422);
    }
    const cleanUrl = urlValidation.normalizedUrl;

    const blockCheck = await isDomainBlocked(cleanUrl);
    if (blockCheck.isBlocked) {
      throw new LinkServiceError(
        blockCheck.reason ? `Destination domain is blocked: ${blockCheck.reason}` : "Destination domain is blocked by platform policy.",
        "BLOCKED_DOMAIN",
        422
      );
    }

    updateData.destinationUrl = cleanUrl;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
    updateData.disabledAt = input.isActive ? null : new Date();
    updateData.disabledReason = input.isActive ? null : (input.disabledReason || "Deactivated by owner or admin");
  }

  if (input.expiresAt !== undefined) {
    if (input.expiresAt === null || input.expiresAt === "") {
      updateData.expiresAt = null;
    } else {
      const parsed = new Date(input.expiresAt);
      if (isNaN(parsed.getTime())) {
        throw new LinkServiceError("Invalid expiration date format.", "INVALID_EXPIRY", 422);
      }
      updateData.expiresAt = parsed;
    }
  }

  if (input.clickLimit !== undefined) {
    if (input.clickLimit === null || String(input.clickLimit).trim() === "") {
      updateData.clickLimit = null;
    } else {
      const parsed = parseInt(String(input.clickLimit), 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new LinkServiceError("Click limit must be a positive number.", "INVALID_LIMIT", 422);
      }
      updateData.clickLimit = parsed;
    }
  }

  if (input.removePassword) {
    updateData.passwordHash = null;
  } else if (input.password && input.password.trim().length > 0) {
    if (input.password.length < 4) {
      throw new LinkServiceError("Password must be at least 4 characters.", "INVALID_PASSWORD", 422);
    }
    updateData.passwordHash = await bcrypt.hash(input.password, 12);
  }

  // Handle Campaign assignment / removal
  if (input.campaignId !== undefined) {
    if (input.campaignId === null || input.campaignId === "") {
      updateData.campaign = { disconnect: true };
    } else {
      // Validate campaign ownership (must belong to the link owner)
      const camp = await db.campaign.findUnique({
        where: { id: input.campaignId },
        select: { id: true, userId: true },
      });
      if (!camp || camp.userId !== link.userId) {
        throw new LinkServiceError("Campaign not found or access denied.", "FORBIDDEN", 403);
      }
      updateData.campaign = { connect: { id: input.campaignId } };
    }
  }

  // Handle Tag updates
  if (input.tagIds !== undefined) {
    if (input.tagIds && input.tagIds.length > 0) {
      const uniqueTagIds = Array.from(new Set(input.tagIds));
      // Validate that all tags exist and belong to the link owner
      const validTags = await db.tag.findMany({
        where: {
          id: { in: uniqueTagIds },
          userId: link.userId,
        },
        select: { id: true },
      });

      if (validTags.length !== uniqueTagIds.length) {
        throw new LinkServiceError("One or more tags not found or access denied.", "FORBIDDEN", 403);
      }

      await db.linkTag.deleteMany({ where: { linkId } });
      updateData.tags = {
        create: uniqueTagIds.map((tagId) => ({ tagId })),
      };
    } else {
      // Explicitly cleared
      await db.linkTag.deleteMany({ where: { linkId } });
    }
  }

  return db.link.update({
    where: { id: linkId },
    data: updateData,
    include: {
      campaign: { select: { id: true, name: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  });
}

/**
 * Toggle link active status (Admin can toggle any link; Users can toggle their own).
 */
export async function toggleLinkActive(
  linkId: string,
  isActive: boolean,
  userId: string,
  userRole: Role,
  disabledReason?: string
) {
  return updateLinkRules(linkId, userId, userRole, {
    isActive,
    disabledReason,
  });
}

/**
 * Delete a link (Admin can delete any link; Users can delete their own).
 * Retains or cascades clicks according to schema.
 */
export async function deleteLink(linkId: string, userId: string, userRole: Role) {
  const link = await db.link.findUnique({
    where: { id: linkId },
    select: { id: true, userId: true },
  });

  if (!link) {
    throw new LinkServiceError("Link not found.", "NOT_FOUND", 404);
  }

  if (userRole !== Role.ADMIN && link.userId !== userId) {
    throw new LinkServiceError("Permission denied.", "FORBIDDEN", 403);
  }

  await db.link.delete({
    where: { id: linkId },
  });

  return { success: true };
}
