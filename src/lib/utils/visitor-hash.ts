import { createHash } from "crypto";

// Independent salt for privacy-safe visitor hashing
// Configured via VISITOR_SALT to decouple from session JWT_SECRET
const SALT =
  process.env.VISITOR_SALT ||
  process.env.JWT_SECRET ||
  "linkpulse-visitor-salt-key-default";

/**
 * Creates a one-way, privacy-preserving SHA-256 hash of the visitor's IP and User-Agent.
 * Raw IP is never written to the database.
 */
export function generateVisitorHash(ip?: string | null, userAgent?: string | null): string {
  const normalizedIp = (ip || "unknown-ip").trim();
  const normalizedUa = (userAgent || "unknown-ua").trim();

  return createHash("sha256")
    .update(`${SALT}:${normalizedIp}:${normalizedUa}`)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Creates a one-way, privacy-preserving hash of an IP for rate-limiting tables.
 * Ensures raw IP addresses are never persisted in the database.
 */
export function hashIp(ip?: string | null): string {
  const normalizedIp = (ip || "unknown-ip").trim();
  return createHash("sha256")
    .update(`${SALT}:ratelimit:${normalizedIp}`)
    .digest("hex")
    .substring(0, 32);
}

