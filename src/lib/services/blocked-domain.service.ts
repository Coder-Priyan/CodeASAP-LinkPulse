import { db } from "../db";

export class BlockedDomainError extends Error {
  constructor(message: string, public code = "BLOCKED_DOMAIN", public status = 422) {
    super(message);
    this.name = "BlockedDomainError";
  }
}

/**
 * Normalizes user/admin domain input:
 * - Lowercase & trim
 * - Strips protocol (http://, https://)
 * - Strips trailing paths, queries, fragments (/...)
 * - Strips port numbers (:8080)
 * - Strips leading "www."
 */
export function normalizeDomain(input: string): string {
  if (!input) return "";

  let cleaned = input.trim().toLowerCase();

  // Strip protocol
  cleaned = cleaned.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");

  // Strip userinfo if present (e.g. user@domain.com)
  if (cleaned.includes("@")) {
    cleaned = cleaned.replace(/^.*@/, "");
  }

  // Strip path, query, hash
  cleaned = cleaned.replace(/[\/?#].*$/, "");

  // Strip port
  cleaned = cleaned.replace(/:\d+$/, "");

  // Strip leading www.
  cleaned = cleaned.replace(/^www\./, "");

  // Remove any trailing dot
  cleaned = cleaned.replace(/\.+$/, "");

  return cleaned;
}

/**
 * Extracts candidate parent domains for indexed lookup.
 * e.g., "phishing.sub.evil.com" -> ["phishing.sub.evil.com", "sub.evil.com", "evil.com"]
 */
export function getCandidateDomains(hostname: string): string[] {
  const normalized = normalizeDomain(hostname);
  if (!normalized) return [];

  const parts = normalized.split(".");
  if (parts.length <= 1) return [normalized];

  const candidates: string[] = [];
  // Build parent domains down to two labels (e.g. evil.com)
  for (let i = 0; i <= parts.length - 2; i++) {
    candidates.push(parts.slice(i).join("."));
  }

  return candidates;
}

/**
 * In-memory cache of blocked domains for high-throughput redirect checks.
 * Bounded by a short 5-second TTL to ensure safe multi-instance and serverless convergence.
 */
let cachedDomainsMap: Map<string, string | null> | null = null;
let lastCacheFetchTime = 0;
let timeProvider: () => number = () => Date.now();
let overrideTtlMs: number | null = null;

export const DEFAULT_BLOCKED_DOMAIN_CACHE_TTL_MS = 5_000; // 5 seconds default

export function setClockForTesting(fn?: (() => number) | null): void {
  timeProvider = fn || (() => Date.now());
}

export function setCacheTtlForTesting(ttlMs?: number | null): void {
  overrideTtlMs = ttlMs ?? null;
}

export function invalidateBlockedDomainCache(): void {
  cachedDomainsMap = null;
  lastCacheFetchTime = 0;
}

async function getOrLoadBlockedDomainsMap(): Promise<Map<string, string | null>> {
  const effectiveTtl =
    overrideTtlMs !== null
      ? overrideTtlMs
      : (process.env.NODE_ENV === "test" || process.env.VITEST ? 0 : DEFAULT_BLOCKED_DOMAIN_CACHE_TTL_MS);

  const now = timeProvider();
  if (effectiveTtl > 0 && cachedDomainsMap && now - lastCacheFetchTime < effectiveTtl) {
    return cachedDomainsMap;
  }

  try {
    const records = await db.blockedDomain.findMany({
      select: { domain: true, reason: true },
    });
    const map = new Map<string, string | null>();
    for (const r of records) {
      map.set(r.domain, r.reason);
    }
    cachedDomainsMap = map;
    lastCacheFetchTime = now;
    return map;
  } catch (err) {
    if (cachedDomainsMap) {
      return cachedDomainsMap;
    }
    throw err;
  }
}

/**
 * Fast indexed check if a destination URL belongs to a blocked domain or subdomain.
 * Uses in-memory cached domain map with automatic invalidation on add/remove.
 */
export async function isDomainBlocked(
  destinationUrl: string
): Promise<{ isBlocked: boolean; matchedDomain?: string; reason?: string }> {
  try {
    let hostname: string;
    try {
      const parsed = new URL(destinationUrl);
      hostname = parsed.hostname;
    } catch {
      // If not a full URL, attempt normalizing as hostname
      hostname = destinationUrl;
    }

    const candidateDomains = getCandidateDomains(hostname);
    if (candidateDomains.length === 0) {
      return { isBlocked: false };
    }

    const domainMap = await getOrLoadBlockedDomainsMap();
    for (const candidate of candidateDomains) {
      if (domainMap.has(candidate)) {
        return {
          isBlocked: true,
          matchedDomain: candidate,
          reason: domainMap.get(candidate) || "This domain is restricted by platform policy.",
        };
      }
    }

    return { isBlocked: false };
  } catch (err) {
    console.error("[BlockedDomainService] Error checking blocked domain:", err);
    // On unexpected database error, do not block traffic
    return { isBlocked: false };
  }
}

/**
 * Add a domain to the blocklist (Admin only).
 */
export async function addBlockedDomain(
  domainInput: string,
  createdById?: string | null,
  reason?: string | null
) {
  const normalized = normalizeDomain(domainInput);

  // Validate domain format: at least two labels, alphanumeric and hyphens
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!normalized || normalized.length < 3 || !domainRegex.test(normalized)) {
    throw new BlockedDomainError("Invalid domain format. Please enter a valid domain (e.g. evil.com).", "INVALID_DOMAIN", 400);
  }

  // Check if already blocked
  const existing = await db.blockedDomain.findUnique({
    where: { domain: normalized },
  });

  if (existing) {
    throw new BlockedDomainError("This domain is already in the blocklist.", "DUPLICATE_DOMAIN", 409);
  }

  try {
    const created = await db.blockedDomain.create({
      data: {
        domain: normalized,
        reason: reason?.trim() || null,
        createdById: createdById || null,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });
    invalidateBlockedDomainCache();
    return created;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new BlockedDomainError("This domain is already in the blocklist.", "DUPLICATE_DOMAIN", 409);
    }
    throw err;
  }
}

/**
 * Remove a domain from the blocklist (Admin only).
 */
export async function removeBlockedDomain(id: string) {
  const existing = await db.blockedDomain.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new BlockedDomainError("Blocked domain not found.", "NOT_FOUND", 404);
  }

  await db.blockedDomain.delete({
    where: { id },
  });
  invalidateBlockedDomainCache();

  return { success: true };
}

/**
 * List all blocked domains with creator info.
 */
export async function listBlockedDomains() {
  return db.blockedDomain.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });
}
