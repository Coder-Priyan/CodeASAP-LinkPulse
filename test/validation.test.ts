import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { validateUrl } from "@/lib/validations/url-validator";
import { validateCustomAlias } from "@/lib/validations/alias-validator";
import { createLink, updateLinkRules, LinkServiceError } from "@/lib/services/link.service";

let mockUser: { userId: string; role: Role; email: string } | null = null;

vi.mock("@/lib/auth/guard", () => {
  class AuthError extends Error {
    constructor(message: string, public status: number = 401) {
      super(message);
      this.name = "AuthError";
    }
  }

  return {
    AuthError,
    requireAuth: vi.fn(async () => {
      if (!mockUser) {
        throw new AuthError("Authentication required.", 401);
      }
      return mockUser;
    }),
  };
});

import { GET as getLinksHandler } from "@/app/api/links/route";

describe("4. URL and Alias Validation", () => {
  let testUserId: string;
  const createdLinkIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `test-val-${Date.now()}@linkpulse.test`,
        passwordHash: "hashed",
        role: "USER",
      },
    });
    testUserId = user.id;
    mockUser = { userId: user.id, role: Role.USER, email: user.email };
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  describe("URL Validator", () => {
    it("rejects non-http/https protocols and dangerous schemes", () => {
      expect(validateUrl("javascript:alert(1)").isValid).toBe(false);
      expect(validateUrl("data:text/html,evil").isValid).toBe(false);
      expect(validateUrl("ftp://ftp.example.com").isValid).toBe(false);
      expect(validateUrl("file:///etc/passwd").isValid).toBe(false);
    });

    it("rejects malformed and empty URLs", () => {
      expect(validateUrl("").isValid).toBe(false);
      expect(validateUrl("   ").isValid).toBe(false);
      expect(validateUrl("not_a_valid_url").isValid).toBe(false);
      expect(validateUrl("http://").isValid).toBe(false);
    });

    it("rejects URLs containing CRLF or illegal control characters", () => {
      expect(validateUrl("https://example.com\r\nSet-Cookie: evil=1").isValid).toBe(false);
      expect(validateUrl("https://example.com\nLocation: https://evil.com").isValid).toBe(false);
      expect(validateUrl("https://example.com\0").isValid).toBe(false);
    });

    it("prevents self-referencing redirect loops", () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      expect(validateUrl(`${appUrl}/loop-code`).isValid).toBe(false);
      expect(validateUrl("http://localhost:3000/some-slug").isValid).toBe(false);
    });

    it("accepts and normalizes valid URLs", () => {
      const v1 = validateUrl("https://example.com");
      expect(v1.isValid).toBe(true);
      expect(v1.normalizedUrl).toBe("https://example.com/");

      const v2 = validateUrl("http://sub.domain.org:8080/path?query=val#section");
      expect(v2.isValid).toBe(true);
      expect(v2.normalizedUrl).toBe("http://sub.domain.org:8080/path?query=val#section");
    });
  });

  describe("Alias Validator", () => {
    it("rejects aliases outside length constraints (3 to 32 chars)", () => {
      expect(validateCustomAlias("ab").isValid).toBe(false);
      expect(validateCustomAlias("a").isValid).toBe(false);
      expect(validateCustomAlias("a".repeat(33)).isValid).toBe(false);
    });

    it("rejects aliases containing forbidden characters", () => {
      expect(validateCustomAlias("hello world").isValid).toBe(false);
      expect(validateCustomAlias("link/path").isValid).toBe(false);
      expect(validateCustomAlias("user@domain").isValid).toBe(false);
      expect(validateCustomAlias("cool.link").isValid).toBe(false);
      expect(validateCustomAlias("promo!").isValid).toBe(false);
    });

    it("rejects reserved system keywords and routes", () => {
      const reserved = ["api", "admin", "dashboard", "login", "register", "import", "link-status", "favicon.ico"];
      for (const slug of reserved) {
        const res = validateCustomAlias(slug);
        expect(res.isValid).toBe(false);
        expect(res.error).toMatch(/reserved/i);
      }
    });

    it("accepts valid alphanumeric, hyphenated, and underscored aliases", () => {
      expect(validateCustomAlias("my-promo-2026").isValid).toBe(true);
      expect(validateCustomAlias("launch_v2").isValid).toBe(true);
      expect(validateCustomAlias("WinterSale").isValid).toBe(true);
    });
  });

  describe("Duplicate Alias Handling", () => {
    it("rejects duplicate alias at link creation time with 409 DUPLICATE_ALIAS", async () => {
      const alias = `dup-alias-${Date.now()}`;

      // Create first link
      const link1 = await createLink({
        destinationUrl: "https://pulse-safe-test-target.org/one",
        customAlias: alias,
        userId: testUserId,
      });
      createdLinkIds.push(link1.id);
      expect(link1.code).toBe(alias);

      // Attempt to create second link with same alias
      await expect(
        createLink({
          destinationUrl: "https://pulse-safe-test-target.org/two",
          customAlias: alias,
          userId: testUserId,
        })
      ).rejects.toThrowError(LinkServiceError);

      try {
        await createLink({
          destinationUrl: "https://pulse-safe-test-target.org/two",
          customAlias: alias,
          userId: testUserId,
        });
      } catch (err: any) {
        expect(err.code).toBe("DUPLICATE_ALIAS");
        expect(err.status).toBe(409);
      }
    });
  });

  describe("Limit and Offset Validation on /api/links", () => {
    it("rejects non-integer, negative, or zero limit with 400", async () => {
      const invalidLimits = ["abc", "-5", "0", "1.5", "NaN"];
      for (const l of invalidLimits) {
        const req = new NextRequest(`http://localhost:3000/api/links?limit=${l}`);
        const res = await getLinksHandler(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/positive integer/i);
      }
    });

    it("rejects limit exceeding maximum cap of 100 with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/links?limit=101");
      const res = await getLinksHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/cannot exceed maximum cap of 100/i);
    });

    it("rejects non-integer or negative offset with 400", async () => {
      const invalidOffsets = ["abc", "-1", "-10", "2.5"];
      for (const o of invalidOffsets) {
        const req = new NextRequest(`http://localhost:3000/api/links?offset=${o}`);
        const res = await getLinksHandler(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/non-negative integer/i);
      }
    });

    it("accepts valid limit and offset within constraints", async () => {
      const req = new NextRequest("http://localhost:3000/api/links?limit=10&offset=0");
      const res = await getLinksHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.links)).toBe(true);
    });
  });

  describe("Privacy & PasswordHash Sanitization", () => {
    it("never includes passwordHash or private fields in createLink or updateLinkRules response", async () => {
      const link = await createLink({
        destinationUrl: "https://pulse-safe-test-target.org/password-test",
        userId: testUserId,
        password: "secretpassword123",
      });
      createdLinkIds.push(link.id);

      // Verify createLink omits passwordHash
      expect(link.hasPassword).toBe(true);
      expect((link as any).passwordHash).toBeUndefined();
      expect((link as any).disabledAt).toBeUndefined();

      // Verify updateLinkRules omits passwordHash
      const updated = await updateLinkRules(link.id, testUserId, Role.USER, {
        password: "updatedpassword456",
        title: "Updated Secret Link",
      });

      expect(updated.hasPassword).toBe(true);
      expect((updated as any).passwordHash).toBeUndefined();
      expect((updated as any).disabledAt).toBeUndefined();
    });
  });
});

