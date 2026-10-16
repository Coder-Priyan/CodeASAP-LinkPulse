import { getSession, SessionPayload } from "./session";
import { db } from "../db";
import { Role } from "@prisma/client";

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Get current session user, verifying that the user still exists in DB
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;

  // Optional: check if user still exists in DB
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, name: true },
  });

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

/**
 * Ensures a valid session exists. Throws AuthError(401) if not authenticated.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required.", 401);
  }
  return user;
}

/**
 * Ensures the user has ADMIN role. Throws AuthError(403) if unauthorized.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireAuth();
  if (user.role !== Role.ADMIN) {
    throw new AuthError("Administrator privileges required.", 403);
  }
  return user;
}
