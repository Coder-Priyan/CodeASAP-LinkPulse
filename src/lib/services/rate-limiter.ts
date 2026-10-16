import { db } from "../db";

export class RateLimitError extends Error {
  constructor(message: string, public retryAfterSeconds: number = 60) {
    super(message);
    this.name = "RateLimitError";
  }
}

// Configurable limit: max links a user can create in the given time window
const MAX_LINKS_PER_WINDOW = 15;
const WINDOW_DURATION_MS = 60 * 1000; // 60 seconds

/**
 * Basic rate limiting per user on link creation.
 *
 * Choice & Tradeoffs:
 * - Why DB-backed sliding window: In a serverless environment (e.g. Vercel), in-memory
 *   stores (like Map or Set) are isolated per lambda instance and wipe on cold starts.
 *   Using an indexed DB query (`userId` + `createdAt`) provides a shared, reliable source
 *   of truth across all concurrent serverless instances without requiring an external Redis.
 * - Limits: Adds a quick count query on indexed columns before creating a link. For ultra-scale
 *   production (millions/min), an external distributed token bucket (e.g. Upstash Redis)
 *   would reduce DB roundtrips.
 */
export async function checkLinkCreationRateLimit(userId: string): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_DURATION_MS);

  const recentCount = await db.link.count({
    where: {
      userId,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (recentCount >= MAX_LINKS_PER_WINDOW) {
    throw new RateLimitError(
      `Rate limit exceeded: You can only create up to ${MAX_LINKS_PER_WINDOW} links per minute. Please wait before creating another link.`,
      60
    );
  }
}
