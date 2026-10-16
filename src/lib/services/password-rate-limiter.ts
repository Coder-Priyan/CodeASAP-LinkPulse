import { db } from "../db";
import { hashIp } from "../utils/visitor-hash";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export class PasswordRateLimitError extends Error {
  constructor(message: string, public retryAfterSeconds: number = 900) {
    super(message);
    this.name = "PasswordRateLimitError";
  }
}

/**
 * Checks if a visitor IP has exceeded failed passcode attempts on a link.
 * Matches on the privacy-safe hashed IP.
 */
export async function checkPasswordRateLimit(linkId: string, ip: string): Promise<void> {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const ipHash = hashIp(ip);

  const failedAttempts = await db.passwordAttempt.count({
    where: {
      linkId,
      ipHash,
      success: false,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    throw new PasswordRateLimitError(
      "Too many failed passcode attempts. For security, please wait 15 minutes before trying again.",
      Math.ceil(LOCKOUT_WINDOW_MS / 1000)
    );
  }
}

/**
 * Records a passcode verification attempt for rate-limiting tracking.
 * Stores only a salted one-way hash of the IP, never raw personal IP data.
 */
export async function recordPasswordAttempt(
  linkId: string,
  ip: string,
  success: boolean
): Promise<void> {
  try {
    const ipHash = hashIp(ip);

    await db.passwordAttempt.create({
      data: {
        linkId,
        ipHash,
        success,
      },
    });

    // If successful, clean up old failed attempts for this IP hash and link
    if (success) {
      await db.passwordAttempt.deleteMany({
        where: {
          linkId,
          ipHash,
          success: false,
        },
      });
    }
  } catch (err) {
    console.error("[PasswordRateLimiter] Error logging attempt:", err);
  }
}
