import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { validateUrl } from "@/lib/validations/url-validator";
import { validateCustomAlias } from "@/lib/validations/alias-validator";
import { createLink, LinkServiceError } from "@/lib/services/link.service";

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
        destinationUrl: "https://example.com/one",
        customAlias: alias,
        userId: testUserId,
      });
      createdLinkIds.push(link1.id);
      expect(link1.code).toBe(alias);

      // Attempt to create second link with same alias
      await expect(
        createLink({
          destinationUrl: "https://example.com/two",
          customAlias: alias,
          userId: testUserId,
        })
      ).rejects.toThrowError(LinkServiceError);

      try {
        await createLink({
          destinationUrl: "https://example.com/two",
          customAlias: alias,
          userId: testUserId,
        });
      } catch (err: any) {
        expect(err.code).toBe("DUPLICATE_ALIAS");
        expect(err.status).toBe(409);
      }
    });
  });
});
