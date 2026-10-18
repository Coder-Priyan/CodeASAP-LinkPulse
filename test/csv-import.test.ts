import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import {
  neutralizeCsvFormula,
  parseCsvRecords,
  previewCsvImport,
  executeCsvImport,
} from "@/lib/services/csv-import.service";
import { resetBulkImportRateLimitForTesting } from "@/lib/services/rate-limiter";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

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

import { POST as executeImportHandler } from "@/app/api/links/import/execute/route";

describe("Milestone 4: CSV Bulk Import", () => {
  let testUserId: string;
  let testUserEmail: string;
  let otherUserId: string;
  const createdLinkIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdBlockedDomainIds: string[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();
    testUserEmail = `csv-test-${timestamp}@linkpulse.test`;
    const user = await db.user.create({
      data: {
        email: testUserEmail,
        passwordHash: "hashed",
        role: Role.USER,
      },
    });
    testUserId = user.id;
    createdUserIds.push(user.id);

    const otherUser = await db.user.create({
      data: {
        email: `csv-other-${timestamp}@linkpulse.test`,
        passwordHash: "hashed",
        role: Role.USER,
      },
    });
    otherUserId = otherUser.id;
    createdUserIds.push(otherUser.id);
  });

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await db.clickEvent.deleteMany({ where: { linkId: { in: createdLinkIds } } });
      await db.link.deleteMany({ where: { id: { in: createdLinkIds } } });
    }
    if (createdBlockedDomainIds.length > 0) {
      await db.blockedDomain.deleteMany({ where: { id: { in: createdBlockedDomainIds } } });
    }
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("neutralizes CSV formula injection starting with =, +, -, @, tab, pipe, percent", () => {
    // Formula payloads targeting Excel/Sheets
    expect(neutralizeCsvFormula("=cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0");
    expect(neutralizeCsvFormula("+1+2")).toBe("'+1+2");
    expect(neutralizeCsvFormula("-5+10")).toBe("'-5+10");
    expect(neutralizeCsvFormula("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    expect(neutralizeCsvFormula("\tcalc")).toBe("'\tcalc");
    expect(neutralizeCsvFormula("\r\ncalc")).toBe("'\r\ncalc");
    expect(neutralizeCsvFormula("|cmd")).toBe("'|cmd");
    expect(neutralizeCsvFormula("%1")).toBe("'%1");
    expect(neutralizeCsvFormula("  =cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0");

    // Safe regular values should not be altered or corrupted
    expect(neutralizeCsvFormula("LinkPulse Product Launch")).toBe("LinkPulse Product Launch");
    expect(neutralizeCsvFormula("Product - Launch")).toBe("Product - Launch");
    expect(neutralizeCsvFormula("user@example.com")).toBe("user@example.com");
    expect(neutralizeCsvFormula("50% off summer sale")).toBe("50% off summer sale");
    expect(neutralizeCsvFormula("https://example.com?a=1&b=2")).toBe("https://example.com?a=1&b=2");
    expect(neutralizeCsvFormula("")).toBe("");
  });

  it("parses CSV with UTF-8 BOM, CRLF, quoted commas, and escaped quotes", () => {
    const csvContent =
      "\uFEFFdestination_url,alias,title\r\n" +
      'https://example.com/one,alias-one,"Title with, comma"\r\n' +
      'https://example.com/two,alias-two,"Title with ""escaped quotes"""\n' +
      "https://example.com/three,alias-three,Plain Title";

    const records = parseCsvRecords(csvContent);
    expect(records.length).toBe(4); // header + 3 data rows

    expect(records[1].fields).toEqual([
      "https://example.com/one",
      "alias-one",
      "Title with, comma",
    ]);
    expect(records[2].fields).toEqual([
      "https://example.com/two",
      "alias-two",
      'Title with "escaped quotes"',
    ]);
    expect(records[3].fields).toEqual([
      "https://example.com/three",
      "alias-three",
      "Plain Title",
    ]);
  });

  it("reports accurate line numbers and flags validation errors on preview", async () => {
    // Row 1: header (line 1)
    // Row 2: valid (line 2)
    // Row 3: invalid URL (line 3)
    // Row 4: invalid alias (line 4)
    const csv =
      "destination_url,alias,title\n" +
      "https://pulse-safe-test-target.org/good,valid-alias,Valid Link\n" +
      "not-a-valid-url,bad-url-alias,Invalid URL\n" +
      "https://pulse-safe-test-target.org/alias-too-short,ab,Short Alias";

    const preview = await previewCsvImport(csv, testUserId);
    expect(preview.totalRows).toBe(3);
    expect(preview.validRowsCount).toBe(1);
    expect(preview.invalidRowsCount).toBe(2);

    expect(preview.rows[0].lineNumber).toBe(2);
    expect(preview.rows[0].isValid).toBe(true);

    expect(preview.rows[1].lineNumber).toBe(3);
    expect(preview.rows[1].isValid).toBe(false);
    expect(preview.rows[1].error).toContain("Invalid URL format");

    expect(preview.rows[2].lineNumber).toBe(4);
    expect(preview.rows[2].isValid).toBe(false);
    expect(preview.rows[2].error).toContain("Alias must be at least 3 characters");
  });

  it("detects duplicate aliases within the CSV file", async () => {
    const csv =
      "destination_url,alias,title\n" +
      "https://pulse-safe-test-target.org/first,duplicate-alias,First\n" +
      "https://pulse-safe-test-target.org/second,duplicate-alias,Second";

    const preview = await previewCsvImport(csv, testUserId);
    expect(preview.rows[0].isValid).toBe(true);
    expect(preview.rows[1].isValid).toBe(false);
    expect(preview.rows[1].error).toContain('Duplicate alias "duplicate-alias" in CSV file');
  });

  it("detects duplicate alias already taken in the database", async () => {
    const existing = await db.link.create({
      data: {
        code: `db-dup-${Date.now()}`,
        destinationUrl: "https://pulse-safe-test-target.org/existing",
        userId: otherUserId,
      },
    });
    createdLinkIds.push(existing.id);

    const csv =
      "destination_url,alias,title\n" +
      `https://pulse-safe-test-target.org/new,${existing.code},Trying taken alias`;

    const preview = await previewCsvImport(csv, testUserId);
    expect(preview.rows[0].isValid).toBe(false);
    expect(preview.rows[0].error).toContain("already taken in the database");
  });

  it("flags blocked domains in CSV preview", async () => {
    const blocked = await db.blockedDomain.create({
      data: {
        domain: `csv-blocked-${Date.now()}.com`,
        reason: "Malware domain",
        createdById: testUserId,
      },
    });
    createdBlockedDomainIds.push(blocked.id);

    const csv =
      "destination_url,alias,title\n" +
      `https://sub.${blocked.domain}/path,sub-malware,Malware Link\n` +
      "https://legit-site.com,legit-link,Legit Link";

    const preview = await previewCsvImport(csv, testUserId);
    expect(preview.rows[0].isValid).toBe(false);
    expect(preview.rows[0].error).toContain("Blocked domain: Malware domain");
    expect(preview.rows[1].isValid).toBe(true);
  });

  it("enforces file limits: rejects files > 1 MB and > 200 rows", async () => {
    // 1. > 200 rows
    let bigCsv = "destination_url,alias,title\n";
    for (let i = 1; i <= 201; i++) {
      bigCsv += `https://example.com/row-${i},alias-${i},Row ${i}\n`;
    }
    await expect(previewCsvImport(bigCsv, testUserId)).rejects.toThrow(
      /exceeds the maximum limit of 200 rows/
    );

    // 2. > 1 MB
    const hugeBuffer = "destination_url\n" + "https://example.com/".padEnd(1024 * 1024 + 10, "a");
    await expect(previewCsvImport(hugeBuffer, testUserId)).rejects.toThrow(
      /exceeds the maximum allowed limit of 1 MB/
    );
  });

  it("executes import: creates only valid rows, skips invalid, isolates to user, neutralizes formulas", async () => {
    resetBulkImportRateLimitForTesting(testUserId);

    const ts = Date.now();
    const csv =
      "destination_url,alias,title\n" +
      `https://pulse-safe-test-target.org/page1,valid-import-1-${ts},=CMD('calc')\n` +
      `not-a-valid-url,bad-row-1-${ts},Skipped Bad URL\n` +
      `https://pulse-safe-test-target.org/page2,valid-import-2-${ts},Normal Title`;

    const summary = await executeCsvImport(csv, testUserId);
    expect(summary.totalRows).toBe(3);
    expect(summary.createdCount).toBe(2);
    expect(summary.skippedCount).toBe(1);

    expect(summary.created.length).toBe(2);
    for (const item of summary.created) {
      createdLinkIds.push(item.id);
    }

    expect(summary.skipped[0].lineNumber).toBe(3);
    expect(summary.skipped[0].reason).toContain("Invalid URL format");

    // Verify created links in DB
    const firstLink = await db.link.findUnique({
      where: { code: `valid-import-1-${ts}` },
    });
    expect(firstLink).not.toBeNull();
    expect(firstLink?.userId).toBe(testUserId); // belongs to test user
    expect(firstLink?.title).toBe("'=CMD('calc')"); // neutralized formula!
  });

  it("re-validates file on server in POST /api/links/import/execute, ignoring client row overrides", async () => {
    resetBulkImportRateLimitForTesting(testUserId);
    mockUser = { userId: testUserId, email: testUserEmail, role: Role.USER };

    const blocked = await db.blockedDomain.create({
      data: {
        domain: `exec-server-block-${Date.now()}.com`,
        reason: "Malicious domain",
        createdById: testUserId,
      },
    });
    createdBlockedDomainIds.push(blocked.id);

    const ts = Date.now();
    // CSV with one blocked domain and one valid link
    const csvContent =
      "destination_url,alias,title\n" +
      `https://${blocked.domain}/payload,fake-alias-${ts},Client Claimed Valid\n` +
      `https://pulse-safe-test-target.org/safe,server-valid-${ts},Safe Link`;

    // Malicious or crafted client request attempting to inject pre-validated rows
    const req = new NextRequest("http://localhost:3000/api/links/import/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvContent,
        // Attempting to bypass server validation by claiming row 1 is valid
        rows: [
          {
            destinationUrl: `https://${blocked.domain}/payload`,
            alias: `fake-alias-${ts}`,
            isValid: true,
          },
        ],
      }),
    });

    const res = await executeImportHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.summary.totalRows).toBe(2);
    expect(data.summary.createdCount).toBe(1); // Only the legit safe link was created
    expect(data.summary.skippedCount).toBe(1); // The blocked domain was re-validated and skipped on server!

    for (const item of data.summary.created) {
      createdLinkIds.push(item.id);
    }

    expect(data.summary.skipped[0].reason).toContain("Blocked domain");

    // Verify blocked link was NOT created in DB
    const unallowedLink = await db.link.findUnique({
      where: { code: `fake-alias-${ts}` },
    });
    expect(unallowedLink).toBeNull();
  });

  it("applies optional batch campaignId and tagIds to all imported links", async () => {
    const ts = Date.now();
    const campaign = await db.campaign.create({
      data: {
        name: `Import Campaign ${ts}`,
        userId: testUserId,
      },
    });

    const tag = await db.tag.create({
      data: {
        name: `batch-tag-${ts}`,
        userId: testUserId,
      },
    });

    const csvContent =
      "destination_url,alias,title\n" +
      `https://batch-import-test.org/link1,batch-link1-${ts},Batch Link 1\n` +
      `https://batch-import-test.org/link2,batch-link2-${ts},Batch Link 2`;

    const summary = await executeCsvImport(csvContent, testUserId, {
      campaignId: campaign.id,
      tagIds: [tag.id],
    });

    expect(summary.totalRows).toBe(2);
    expect(summary.createdCount).toBe(2);
    expect(summary.skippedCount).toBe(0);

    for (const item of summary.created) {
      createdLinkIds.push(item.id);
      const linkInDb = await db.link.findUnique({
        where: { id: item.id },
        include: { tags: true },
      });
      expect(linkInDb?.campaignId).toBe(campaign.id);
      expect(linkInDb?.tags).toHaveLength(1);
      expect(linkInDb?.tags[0].tagId).toBe(tag.id);
    }

    await db.campaign.delete({ where: { id: campaign.id } });
    await db.tag.delete({ where: { id: tag.id } });
  });

  it("rejects CSV bulk import when campaignId or tagId belongs to another user", async () => {
    const ts = Date.now();
    const otherUser = await db.user.create({
      data: {
        email: `foreign-user-${ts}@pulse-auth-test.io`,
        passwordHash: "fakehash",
      },
    });

    const foreignCampaign = await db.campaign.create({
      data: {
        name: `Foreign Campaign ${ts}`,
        userId: otherUser.id,
      },
    });

    const foreignTag = await db.tag.create({
      data: {
        name: `foreign-tag-${ts}`,
        userId: otherUser.id,
      },
    });

    const csvContent =
      "destination_url,alias,title\n" +
      `https://pulse-safe-test-target.org/auth1-${ts},auth1-alias-${ts},Auth Test Link`;

    // 1. Foreign campaignId must be rejected with 403
    await expect(
      executeCsvImport(csvContent, testUserId, {
        campaignId: foreignCampaign.id,
      })
    ).rejects.toThrow(/Campaign does not exist or access denied/i);

    // 2. Foreign tagId must be rejected with 403
    await expect(
      executeCsvImport(csvContent, testUserId, {
        tagIds: [foreignTag.id],
      })
    ).rejects.toThrow(/One or more tags do not exist or access denied/i);

    // 3. Via POST /api/links/import/execute endpoint: returns 403 status
    mockUser = { userId: testUserId, email: testUserEmail, role: Role.USER };
    const req = new NextRequest("http://localhost:3000/api/links/import/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvContent,
        campaignId: foreignCampaign.id,
      }),
    });
    const res = await executeImportHandler(req);
    expect(res.status).toBe(403);

    // Cleanup foreign user, campaign, tag
    await db.campaign.delete({ where: { id: foreignCampaign.id } });
    await db.tag.delete({ where: { id: foreignTag.id } });
    await db.user.delete({ where: { id: otherUser.id } });
  });
});
