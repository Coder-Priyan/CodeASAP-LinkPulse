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

// Bulk import rate limiting: 10 imports per hour per user
const MAX_BULK_IMPORTS_PER_HOUR = 10;
const BULK_WINDOW_DURATION_MS = 60 * 60 * 1000; // 1 hour

const bulkImportTimestamps = new Map<string, number[]>();

export async function checkBulkImportRateLimit(userId: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - BULK_WINDOW_DURATION_MS;

  const timestamps = (bulkImportTimestamps.get(userId) || []).filter(
    (t) => t > windowStart
  );

  if (timestamps.length >= MAX_BULK_IMPORTS_PER_HOUR) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + BULK_WINDOW_DURATION_MS - now) / 1000);
    throw new RateLimitError(
      `Bulk import rate limit exceeded: You can only perform ${MAX_BULK_IMPORTS_PER_HOUR} bulk imports per hour. Please try again later.`,
      retryAfter > 0 ? retryAfter : 60
    );
  }

  timestamps.push(now);
  bulkImportTimestamps.set(userId, timestamps);
}

export function resetBulkImportRateLimitForTesting(userId?: string): void {
  if (userId) {
    bulkImportTimestamps.delete(userId);
  } else {
    bulkImportTimestamps.clear();
  }
}

// Login rate limiting: 10 attempts per minute per IP/identifier to protect against credential brute-forcing
const MAX_LOGIN_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_WINDOW_MS = 60 * 1000;

const loginTimestamps = new Map<string, number[]>();

export async function checkLoginRateLimit(identifier: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - LOGIN_WINDOW_MS;

  const timestamps = (loginTimestamps.get(identifier) || []).filter(
    (t) => t > windowStart
  );

  if (timestamps.length >= MAX_LOGIN_ATTEMPTS_PER_WINDOW) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + LOGIN_WINDOW_MS - now) / 1000);
    throw new RateLimitError(
      `Too many login attempts. Please wait ${retryAfter > 0 ? retryAfter : 60} seconds before trying again.`,
      retryAfter > 0 ? retryAfter : 60
    );
  }

  timestamps.push(now);
  loginTimestamps.set(identifier, timestamps);
}

export function resetLoginRateLimitForTesting(identifier?: string): void {
  if (identifier) {
    loginTimestamps.delete(identifier);
  } else {
    loginTimestamps.clear();
  }
}

// Registration rate limiting: 5 attempts per hour per IP/identifier to protect against mass account creation and bcrypt DoS
const MAX_REGISTER_ATTEMPTS_PER_WINDOW = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const registerTimestamps = new Map<string, number[]>();

function pruneStaleRegisterEntries(windowStart: number): void {
  for (const [key, times] of registerTimestamps.entries()) {
    const valid = times.filter((t) => t > windowStart);
    if (valid.length === 0) {
      registerTimestamps.delete(key);
    } else if (valid.length < times.length) {
      registerTimestamps.set(key, valid);
    }
  }
}

export async function checkRegisterRateLimit(identifier: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - REGISTER_WINDOW_MS;

  // Prune stale entries to prevent unbounded Map growth
  pruneStaleRegisterEntries(windowStart);

  const timestamps = registerTimestamps.get(identifier) || [];

  if (timestamps.length >= MAX_REGISTER_ATTEMPTS_PER_WINDOW) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + REGISTER_WINDOW_MS - now) / 1000);
    throw new RateLimitError(
      `Too many registration attempts. Please wait ${retryAfter > 0 ? retryAfter : 3600} seconds before trying again.`,
      retryAfter > 0 ? retryAfter : 3600
    );
  }

  timestamps.push(now);
  registerTimestamps.set(identifier, timestamps);
}

export function resetRegisterRateLimitForTesting(identifier?: string): void {
  if (identifier) {
    registerTimestamps.delete(identifier);
  } else {
    registerTimestamps.clear();
  }
}

