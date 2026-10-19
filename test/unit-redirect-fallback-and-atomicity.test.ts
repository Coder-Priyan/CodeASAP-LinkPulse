import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

const {
  mockAfter,
  mockRecordClick,
  mockTxLinkTagDeleteMany,
  mockTxLinkUpdate,
  mockDbLinkTagDeleteMany,
  mockDbLinkUpdate,
} = vi.hoisted(() => {
  return {
    mockAfter: vi.fn((_cb: () => Promise<void>) => {
      throw new Error("`after` was called outside a request scope.");
    }),
    mockRecordClick: vi.fn().mockResolvedValue({ recorded: true }),
    mockTxLinkTagDeleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    mockTxLinkUpdate: vi.fn().mockResolvedValue({
      id: "test-link-id",
      code: "fallback-test",
      destinationUrl: "https://example.com/dest",
      title: "Updated Title",
      isActive: true,
      disabledReason: null,
      expiresAt: null,
      clickLimit: null,
      clicksCount: 0,
      tags: [],
      user: null,
      campaign: null,
    }),
    mockDbLinkTagDeleteMany: vi.fn(),
    mockDbLinkUpdate: vi.fn(),
  };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: mockAfter,
  };
});

vi.mock("@/lib/services/click.service", () => ({
  recordClick: (...args: any[]) => mockRecordClick(...args),
}));

vi.mock("@/lib/db", () => {
  return {
    db: {
      link: {
        findUnique: vi.fn().mockResolvedValue({ id: "test-link-id", userId: "test-user-id" }),
        update: mockDbLinkUpdate,
      },
      tag: {
        findMany: vi.fn().mockResolvedValue([{ id: "tag-1" }]),
      },
      linkTag: {
        deleteMany: mockDbLinkTagDeleteMany,
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
        return cb({
          linkTag: { deleteMany: mockTxLinkTagDeleteMany },
          link: { update: mockTxLinkUpdate },
        });
      }),
    },
  };
});

const mockLink = {
  id: "test-link-id",
  code: "fallback-test",
  destinationUrl: "https://example.com/dest",
  isActive: true,
  expiresAt: null,
  clickLimit: null,
  passwordHash: null,
  disabledReason: null,
  clicksCount: 0,
};

vi.mock("@/lib/services/link.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/link.service")>();
  return {
    ...actual,
    getLinkByCodeForRedirect: vi.fn(async () => mockLink),
    evaluateLinkRules: vi.fn(async () => ({ status: "ACTIVE" })),
    incrementClickCountAtomic: vi.fn(async () => ({ success: true, limitExceeded: false })),
  };
});

describe("DB-Free Unit Tests: Redirect Click Fallback & Transaction Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls recordClick exactly once when after() throws synchronously in redirect route (exercises real GET handler)", async () => {
    // Exercises the REAL GET handler from src/app/[code]/route.ts
    const { GET } = await import("@/app/[code]/route");

    const req = new NextRequest("http://localhost:3000/fallback-test", {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "x-real-ip": "1.2.3.4",
        referer: "https://google.com",
      },
    });

    const response = await GET(req, {
      params: Promise.resolve({ code: "fallback-test" }),
    });

    // Must still issue the 307 redirect
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/dest");

    // 'after' was called and threw
    expect(mockAfter).toHaveBeenCalledTimes(1);

    // Fallback caught the error and called recordClick EXACTLY once
    expect(mockRecordClick).toHaveBeenCalledTimes(1);
    expect(mockRecordClick).toHaveBeenCalledWith("test-link-id", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      referrer: "https://google.com",
      ip: "1.2.3.4",
      source: "direct",
    });
  });

  it("structural test: updateLinkRules executes tag deletion and link update on tx, never on db directly", async () => {
    const { updateLinkRules } = await import("@/lib/services/link.service");

    const result = await updateLinkRules("test-link-id", "test-user-id", Role.USER, {
      title: "Updated Title",
      tagIds: ["tag-1"],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe("test-link-id");

    // Structural assertions: operations committed through tx inside $transaction
    expect(mockTxLinkTagDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockTxLinkTagDeleteMany).toHaveBeenCalledWith({ where: { linkId: "test-link-id" } });

    expect(mockTxLinkUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxLinkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "test-link-id" },
      })
    );

    // Structural assertion: mutations were NEVER executed on db directly outside tx
    expect(mockDbLinkTagDeleteMany).not.toHaveBeenCalled();
    expect(mockDbLinkUpdate).not.toHaveBeenCalled();
  });
});
