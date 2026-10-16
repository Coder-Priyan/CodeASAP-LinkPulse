import { db } from "../db";
import { Role } from "@prisma/client";

export class TagServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "TagServiceError";
  }
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

/**
 * Creates a new tag for a user.
 */
export async function createTag(userId: string, input: CreateTagInput) {
  const name = input.name.trim();
  if (!name) {
    throw new TagServiceError("Tag name is required.", 400);
  }

  const existing = await db.tag.findUnique({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });

  if (existing) {
    throw new TagServiceError(`A tag named "${name}" already exists.`, 409);
  }

  return db.tag.create({
    data: {
      name,
      color: input.color?.trim() || null,
      userId,
    },
  });
}

/**
 * Gets all tags owned by a user, with link counts.
 */
export async function getUserTags(userId: string) {
  const tags = await db.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { links: true },
      },
    },
  });

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    linksCount: t._count.links,
  }));
}

/**
 * Deletes a tag.
 */
export async function deleteTag(userId: string, userRole: Role, tagId: string) {
  const tag = await db.tag.findUnique({
    where: { id: tagId },
    select: { id: true, userId: true },
  });

  if (!tag) {
    throw new TagServiceError("Tag not found.", 404);
  }

  if (userRole !== Role.ADMIN && tag.userId !== userId) {
    throw new TagServiceError("Permission denied.", 403);
  }

  await db.tag.delete({
    where: { id: tagId },
  });

  return { success: true };
}
