import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const enableQueryLogging = process.env.PRISMA_LOG_QUERIES === "true";

export const db =
  globalForPrisma.prisma ??
  (new PrismaClient({
    log: enableQueryLogging
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  }) as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
