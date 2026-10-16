import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { evaluateLinkRules, computeLinkState } from "@/lib/services/link.service";
import bcrypt from "bcryptjs";

describe("1. Rule Evaluation Order", () => {
  let testUserId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    // Create isolated test user
    const user = await db.user.create({
      data: {
        email: `test-rules-${Date.now()}@linkpulse.test`,
        passwordHash: "hashed",
        role: "USER",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("prioritizes DISABLED over EXPIRED when link is both inactive and expired", async () => {
    const link = await db.link.create({
      data: {
        code: `test-rule-dis-exp-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: testUserId,
        isActive: false,
        disabledReason: "Manually deactivated",
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });
    createdLinkIds.push(link.id);

    const result = await evaluateLinkRules(link);
    expect(result.status).toBe("DISABLED");
    expect(result.reason).toBe("Manually deactivated");

    const state = computeLinkState(link);
    expect(state).toBe("disabled");
  });

  it("prioritizes EXPIRED over CLICK LIMIT when link is both expired and at limit", async () => {
    const link = await db.link.create({
      data: {
        code: `test-rule-exp-lim-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: testUserId,
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        clickLimit: 5,
        clicksCount: 5, // at limit
      },
    });
    createdLinkIds.push(link.id);

    const result = await evaluateLinkRules(link);
    expect(result.status).toBe("EXPIRED");

    const state = computeLinkState(link);
    expect(state).toBe("expired");
  });

  it("prioritizes EXPIRED over PASSWORD when link is both expired and password protected", async () => {
    const hashed = await bcrypt.hash("Pass123!", 10);
    const link = await db.link.create({
      data: {
        code: `test-rule-exp-pwd-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: testUserId,
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000), // expired
        passwordHash: hashed,
      },
    });
    createdLinkIds.push(link.id);

    // Without password provided
    const resNoPwd = await evaluateLinkRules(link);
    expect(resNoPwd.status).toBe("EXPIRED");

    // Even with correct password provided, expired must block access
    const resWithPwd = await evaluateLinkRules(link, "Pass123!");
    expect(resWithPwd.status).toBe("EXPIRED");
  });

  it("prioritizes CLICK LIMIT over PASSWORD when link reached limit and is password protected", async () => {
    const hashed = await bcrypt.hash("Pass123!", 10);
    const link = await db.link.create({
      data: {
        code: `test-rule-lim-pwd-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: testUserId,
        isActive: true,
        clickLimit: 10,
        clicksCount: 10,
        passwordHash: hashed,
      },
    });
    createdLinkIds.push(link.id);

    const result = await evaluateLinkRules(link, "Pass123!");
    expect(result.status).toBe("LIMIT_REACHED");

    const state = computeLinkState(link);
    expect(state).toBe("limit_reached");
  });

  it("evaluates PASSWORD when link is active, unexpired, and under limit", async () => {
    const hashed = await bcrypt.hash("Pass123!", 10);
    const link = await db.link.create({
      data: {
        code: `test-rule-pwd-${Date.now()}`,
        destinationUrl: "https://example.com/dest",
        userId: testUserId,
        isActive: true,
        passwordHash: hashed,
      },
    });
    createdLinkIds.push(link.id);

    // 1. No password given -> PASSWORD_REQUIRED
    const resReq = await evaluateLinkRules(link);
    expect(resReq.status).toBe("PASSWORD_REQUIRED");

    // 2. Wrong password given -> INVALID_PASSWORD
    const resWrong = await evaluateLinkRules(link, "WrongPass");
    expect(resWrong.status).toBe("INVALID_PASSWORD");

    // 3. Correct password given -> ACTIVE
    const resOk = await evaluateLinkRules(link, "Pass123!");
    expect(resOk.status).toBe("ACTIVE");

    const state = computeLinkState(link);
    expect(state).toBe("active");
  });
});
