import { db } from "../db";
import { hashPassword, verifyPassword, SessionPayload } from "../auth/session";
import { Role } from "@prisma/client";

export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserValidationError";
  }
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  role?: Role;
}

/**
 * Register a new user with email and hashed password
 */
export async function registerUser(input: RegisterInput): Promise<SessionPayload> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const name = input.name?.trim() || null;
  const role = input.role || Role.USER;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserValidationError("Please provide a valid email address.");
  }

  if (!password || password.length < 8) {
    throw new UserValidationError("Password must be at least 8 characters long.");
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new UserValidationError("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(emailInput: string, passwordInput: string): Promise<SessionPayload> {
  const email = emailInput.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UserValidationError("Invalid email or password.");
  }

  const isValid = await verifyPassword(passwordInput, user.passwordHash);
  if (!isValid) {
    throw new UserValidationError("Invalid email or password.");
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
