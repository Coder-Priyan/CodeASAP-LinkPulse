import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  normalizeDomain,
  getCandidateDomains,
  isDomainBlocked,
  addBlockedDomain,
  setClockForTesting,
  setCacheTtlForTesting,
  invalidateBlockedDomainCache,
} from "@/lib/services/blocked-domain.service";
import { createLink, updateLinkRules, evaluateLinkRules } from "@/lib/services/link.service";
import { previewCsvImport } from "@/lib/services/csv-import.service";
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
    requireAdmin: vi.fn(async () => {
      if (!mockUser) {
        throw new AuthError("Authentication required.", 401);
      }
      if (mockUser.role !== Role.ADMIN) {
        throw new AuthError("Administrator privileges required.", 403);
      }
      return mockUser;
    }),
  };
});

import { GET as getDomainsHandler, POST as postDomainHandler } from "@/app/api/admin/blocked-domains/route";
import { DELETE as deleteDomainHandler } from "@/app/api/admin/blocked-domains/[id]/route";
import { POST as verifyHandler } from "@/app/api/links/verify/route";
import { GET as redirectHandler } from "@/app/[code]/route";

describe("Milestone 4: Admin Domain Blocklist", () => {
  let adminUser: { id: string; email: string };
  let normalUser: { id: string; email: string };
  const createdBlockedDomainIds: string[] = [];
  const createdLinkIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const ts = Date.now();
    adminUser = await db.user.create({
      data: {
        email: `admin-block-${ts}@linkpulse.test`,
        passwordHash: "hashed",
        role: Role.ADMIN,
      },
    });
    createdUserIds.push(adminUser.id);

    normalUser = await db.user.create({
      data: {
        email: `normal-block-${ts}@linkpulse.test`,
        passwordHash: "hashed",
        role: Role.USER,
      },
    });
    createdUserIds.push(normalUser.id);
  });

  afterAll(async () => {
    for (const linkId of createdLinkIds) {
      try {
        await db.clickEvent.deleteMany({ where: { linkId } });
        await db.linkTag.deleteMany({ where: { linkId } });
        await db.passwordAttempt.deleteMany({ where: { linkId } });
        await db.link.delete({ where: { id: linkId } });
      } catch {
        // Record might already be deleted
      }
    }
    for (const id of createdBlockedDomainIds) {
      try {
        await db.blockedDomain.delete({ where: { id } });
      } catch {
        // Record might already be deleted
      }
    }
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } });
      } catch {
        // Record might already be deleted
      }
    }
  });

  it("normalizes domain inputs: lowercase, trims, strips protocol, path, and 'www.'", () => {
    expect(normalizeDomain("  HTTPS://WWW.EVIL-PHISHING.COM/login?bad=1  ")).toBe("evil-phishing.com");
    expect(normalizeDomain("HTTP://WWW.SPAM.ORG/ ")).toBe("spam.org");
    expect(normalizeDomain("malicious.net/malware.exe")).toBe("malicious.net");
    expect(normalizeDomain("WWW.SUB.DOMAIN.CO.UK")).toBe("sub.domain.co.uk");
  });

  it("generates correct hierarchical candidate domains for subdomain matching", () => {
    const candidates = getCandidateDomains("deep.sub.phishing.evil.com");
    expect(candidates).toEqual([
      "deep.sub.phishing.evil.com",
      "sub.phishing.evil.com",
      "phishing.evil.com",
      "evil.com",
    ]);
  });

  it("matches subdomains when root domain is blocked, but does not overblock unrelated domains", async () => {
    const testDomain = `evil-site-${Date.now()}.com`;
    const blocked = await addBlockedDomain(testDomain, adminUser.id, "Malicious domain");
    createdBlockedDomainIds.push(blocked.id);

    // Exact match
    const exact = await isDomainBlocked(`https://${testDomain}/path`);
    expect(exact.isBlocked).toBe(true);
    expect(exact.reason).toBe("Malicious domain");

    // Subdomain match
    const sub = await isDomainBlocked(`https://login.sub.${testDomain}/fake`);
    expect(sub.isBlocked).toBe(true);

    // Unrelated domain sharing suffix should NOT be blocked
    const notBlocked = await isDomainBlocked(`https://not${testDomain}`);
    expect(notBlocked.isBlocked).toBe(false);

    const safeHost = await isDomainBlocked(`https://${testDomain}.legit.org`);
    expect(safeHost.isBlocked).toBe(false);
  });

  it("enforces blocklist when creating a link", async () => {
    const testDomain = `blocked-create-${Date.now()}.com`;
    const blocked = await addBlockedDomain(testDomain, adminUser.id);
    createdBlockedDomainIds.push(blocked.id);

    await expect(
      createLink({
        destinationUrl: `https://${testDomain}/login`,
        userId: normalUser.id,
      })
    ).rejects.toThrow(/Destination domain is blocked/);
  });

  it("enforces blocklist when editing link destinationUrl", async () => {
    const link = await createLink({
      destinationUrl: "https://initial-legit-domain.com",
      userId: normalUser.id,
    });
    createdLinkIds.push(link.id);

    const testDomain = `blocked-edit-${Date.now()}.com`;
    const blocked = await addBlockedDomain(testDomain, adminUser.id);
    createdBlockedDomainIds.push(blocked.id);

    // Attempting to change destinationUrl to a blocked domain must fail
    await expect(
      updateLinkRules(link.id, normalUser.id, Role.USER, {
        destinationUrl: `https://sub.${testDomain}/hacked`,
      })
    ).rejects.toThrow(/Destination domain is blocked/);
  });

  it("enforces blocklist at redirect time: existing link to newly blocked domain stops redirecting", async () => {
    // 1. Create link to a domain that is currently allowed
    const testDomain = `redirect-check-${Date.now()}.com`;
    const link = await db.link.create({
      data: {
        code: `blk-redir-${Date.now()}`,
        destinationUrl: `https://${testDomain}/page`,
        userId: normalUser.id,
        clicksCount: 5,
      },
    });
    createdLinkIds.push(link.id);

    // Initially passes evaluation
    const beforeBlock = await evaluateLinkRules(link);
    expect(beforeBlock.status).toBe("ACTIVE");

    // 2. Admin now blocks this domain
    const blocked = await addBlockedDomain(testDomain, adminUser.id, "Violates Terms of Service");
    createdBlockedDomainIds.push(blocked.id);

    // 3. Immediately fails rule evaluation with BLOCKED status
    const afterBlock = await evaluateLinkRules(link);
    expect(afterBlock.status).toBe("BLOCKED");
    expect(afterBlock.reason).toBe("Violates Terms of Service");

    // Click history stays preserved
    const linkInDb = await db.link.findUnique({ where: { id: link.id } });
    expect(linkInDb?.clicksCount).toBe(5);
  });

  it("returns BLOCKED and never returns destinationUrl when verifying passcode on a blocked domain link", async () => {
    const testDomain = `pwd-block-${Date.now()}.com`;
    const pwdHash = await bcrypt.hash("Secret123!", 10);

    const link = await db.link.create({
      data: {
        code: `pwd-blk-${Date.now()}`,
        destinationUrl: `https://${testDomain}/confidential`,
        userId: normalUser.id,
        passwordHash: pwdHash,
        clicksCount: 0,
      },
    });
    createdLinkIds.push(link.id);

    // Block the domain
    const blocked = await addBlockedDomain(testDomain, adminUser.id, "Malicious domain blocked");
    createdBlockedDomainIds.push(blocked.id);

    // 1. Visit redirect route GET /[code] -> must redirect to /link-status with status=BLOCKED, never to /p/[code]
    const redirReq = new NextRequest(`http://localhost:3000/${link.code}`);
    const redirRes = await redirectHandler(redirReq, { params: Promise.resolve({ code: link.code }) });
    expect(redirRes.status).toBe(307);
    const locationHeader = redirRes.headers.get("location") || "";
    expect(locationHeader).toContain("/link-status");
    expect(locationHeader).toContain("status=BLOCKED");
    expect(locationHeader).not.toContain(`/p/${link.code}`);

    // 2. Direct POST to /api/links/verify with correct password
    const verifyReq = new NextRequest("http://localhost:3000/api/links/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: link.code,
        password: "Secret123!",
      }),
    });

    const verifyRes = await verifyHandler(verifyReq);
    expect(verifyRes.status).toBe(403);
    const data = await verifyRes.json();
    expect(data.status).toBe("BLOCKED");
    expect(data.error).toContain("Malicious domain blocked");
    expect(data.destinationUrl).toBeUndefined(); // NEVER returns the blocked destination URL!

    // Verify no click event recorded
    const clicks = await db.clickEvent.findMany({ where: { linkId: link.id } });
    expect(clicks.length).toBe(0);
  });

  it("enforces RBAC on blocklist endpoints: normal users get 403, admin has full access", async () => {
    // 0. Unauthenticated (logged-out) visitor -> 401 on GET, POST, DELETE
    mockUser = null;
    const anonGetReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains");
    const anonGetRes = await getDomainsHandler(anonGetReq);
    expect(anonGetRes.status).toBe(401);

    const anonPostReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "anon-blocked.com" }),
    });
    const anonPostRes = await postDomainHandler(anonPostReq);
    expect(anonPostRes.status).toBe(401);

    const anonDeleteReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains/some-id", {
      method: "DELETE",
    });
    const anonDeleteRes = await deleteDomainHandler(anonDeleteReq, {
      params: Promise.resolve({ id: "some-id" }),
    });
    expect(anonDeleteRes.status).toBe(401);

    // 1. Normal user GET /api/admin/blocked-domains -> 403
    mockUser = { userId: normalUser.id, email: normalUser.email, role: Role.USER };
    const userGetReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains");
    const userGetRes = await getDomainsHandler(userGetReq);
    expect(userGetRes.status).toBe(403);

    // 2. Normal user POST /api/admin/blocked-domains -> 403
    const userPostReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "user-blocked.com" }),
    });
    const userPostRes = await postDomainHandler(userPostReq);
    expect(userPostRes.status).toBe(403);

    // 3. Admin user POST /api/admin/blocked-domains -> 201
    mockUser = { userId: adminUser.id, email: adminUser.email, role: Role.ADMIN };
    const adminPostReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: `admin-added-${Date.now()}.com`, reason: "Admin added" }),
    });
    const adminPostRes = await postDomainHandler(adminPostReq);
    expect(adminPostRes.status).toBe(201);
    const postData = await adminPostRes.json();
    expect(postData.success).toBe(true);
    createdBlockedDomainIds.push(postData.blockedDomain.id);

    // 4. Admin user GET /api/admin/blocked-domains -> 200
    const adminGetReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains");
    const adminGetRes = await getDomainsHandler(adminGetReq);
    expect(adminGetRes.status).toBe(200);

    // 5. Normal user DELETE /api/admin/blocked-domains/[id] -> 403
    mockUser = { userId: normalUser.id, email: normalUser.email, role: Role.USER };
    const userDeleteReq = new NextRequest(
      `http://localhost:3000/api/admin/blocked-domains/${postData.blockedDomain.id}`,
      { method: "DELETE" }
    );
    const userDeleteRes = await deleteDomainHandler(userDeleteReq, {
      params: Promise.resolve({ id: postData.blockedDomain.id }),
    });
    expect(userDeleteRes.status).toBe(403);

    // 6. Admin user DELETE /api/admin/blocked-domains/[id] -> 200
    mockUser = { userId: adminUser.id, email: adminUser.email, role: Role.ADMIN };
    const adminDeleteReq = new NextRequest(
      `http://localhost:3000/api/admin/blocked-domains/${postData.blockedDomain.id}`,
      { method: "DELETE" }
    );
    const adminDeleteRes = await deleteDomainHandler(adminDeleteReq, {
      params: Promise.resolve({ id: postData.blockedDomain.id }),
    });
    expect(adminDeleteRes.status).toBe(200);
  });

  it("persists added domain, returns it on refresh/GET with both keys, rejects duplicates, and blocks subdomains platform-wide", async () => {
    mockUser = { userId: adminUser.id, email: adminUser.email, role: Role.ADMIN };
    const domainToBlock = `persist-test-${Date.now()}.com`;

    // 1. Add domain via POST
    const addReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domainToBlock, reason: "Phishing site" }),
    });
    const addRes = await postDomainHandler(addReq);
    expect(addRes.status).toBe(201);
    const addData = await addRes.json();
    expect(addData.success).toBe(true);
    expect(addData.blockedDomain.domain).toBe(domainToBlock);
    createdBlockedDomainIds.push(addData.blockedDomain.id);

    // 2. Fetch list via GET /api/admin/blocked-domains (simulating initial load and refresh)
    const getReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains");
    const getRes = await getDomainsHandler(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    // Must return both keys for UI compatibility
    expect(Array.isArray(getData.domains)).toBe(true);
    expect(Array.isArray(getData.blockedDomains)).toBe(true);
    const foundInDomains = getData.domains.find((d: any) => d.id === addData.blockedDomain.id);
    const foundInBlockedDomains = getData.blockedDomains.find((d: any) => d.id === addData.blockedDomain.id);
    expect(foundInDomains).toBeDefined();
    expect(foundInBlockedDomains).toBeDefined();
    expect(foundInBlockedDomains.domain).toBe(domainToBlock);
    expect(foundInBlockedDomains.createdBy?.email).toBe(adminUser.email);

    // 3. Attempt duplicate addition -> 409 DUPLICATE_DOMAIN
    const dupReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: `https://WWW.${domainToBlock}/login`, reason: "Duplicate" }),
    });
    const dupRes = await postDomainHandler(dupReq);
    expect(dupRes.status).toBe(409);
    const dupData = await dupRes.json();
    expect(dupData.code).toBe("DUPLICATE_DOMAIN");

    // 4. Verify subdomain enforcement on link creation (sub.domainToBlock)
    await expect(
      createLink({
        destinationUrl: `https://sub.${domainToBlock}/register`,
        userId: normalUser.id,
      })
    ).rejects.toThrow(/Destination domain is blocked/);

    // 5. Verify subdomain enforcement on deep subdomain (deep.sub.domainToBlock)
    await expect(
      createLink({
        destinationUrl: `https://deep.sub.${domainToBlock}/account`,
        userId: normalUser.id,
      })
    ).rejects.toThrow(/Destination domain is blocked/);

    // 6. Verify subdomain enforcement on link editing
    const safeLink = await createLink({
      destinationUrl: "https://legit-platform-service.org/welcome",
      userId: normalUser.id,
    });
    createdLinkIds.push(safeLink.id);
    await expect(
      updateLinkRules(safeLink.id, normalUser.id, Role.USER, {
        destinationUrl: `https://api.${domainToBlock}/v1/payload`,
      })
    ).rejects.toThrow(/Destination domain is blocked/);

    // 7. Verify subdomain enforcement in CSV bulk import
    const csvContent =
      "destination_url,alias,title\n" +
      `https://sub.${domainToBlock}/landing,csv-sub-alias,Blocked Landing\n` +
      "https://safe-domain.org/about,safe-alias,Safe About";
    const csvPreview = await previewCsvImport(csvContent, normalUser.id);
    expect(csvPreview.rows[0].isValid).toBe(false);
    expect(csvPreview.rows[0].error).toContain("Blocked domain");
    expect(csvPreview.rows[1].isValid).toBe(true);

    // 8. Verify subdomain enforcement at redirect time
    const preExistingLink = await db.link.create({
      data: {
        code: `pre-blk-${Date.now()}`,
        destinationUrl: `https://sub.${domainToBlock}/target`,
        userId: normalUser.id,
        clicksCount: 0,
      },
    });
    createdLinkIds.push(preExistingLink.id);

    const redirectReq = new NextRequest(`http://localhost:3000/${preExistingLink.code}`);
    const redirectRes = await redirectHandler(redirectReq, {
      params: Promise.resolve({ code: preExistingLink.code }),
    });
    expect(redirectRes.status).toBe(307);
    const redirectLocation = redirectRes.headers.get("location") || "";
    expect(redirectLocation).toContain("/link-status");
    expect(redirectLocation).toContain("status=BLOCKED");

    // 9. Verify refresh/page reload maintains the persisted entry and count
    const refreshReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains");
    const refreshRes = await getDomainsHandler(refreshReq);
    expect(refreshRes.status).toBe(200);
    const refreshData = await refreshRes.json();
    const persistedEntry = refreshData.blockedDomains.find((d: any) => d.id === addData.blockedDomain.id);
    expect(persistedEntry).toBeDefined();
    expect(persistedEntry.domain).toBe(domainToBlock);
  });

  it("strictly enforces blocklist for github.com across creation, subdomains, editing, CSV import, redirects, and duplicate rejection", async () => {
    // Ensure github.com exists in the blocklist
    let githubEntry = await db.blockedDomain.findUnique({ where: { domain: "github.com" } });
    if (!githubEntry) {
      githubEntry = await db.blockedDomain.create({
        data: {
          domain: "github.com",
          reason: "Blocklist enforcement verification",
          createdById: adminUser.id,
        },
      });
      createdBlockedDomainIds.push(githubEntry.id);
    }

    // 1. Creating a short link targeting https://github.com/ -> must fail
    await expect(
      createLink({
        destinationUrl: "https://github.com/",
        userId: normalUser.id,
      })
    ).rejects.toThrow(/Destination domain is blocked/);

    // 2. Creating a short link targeting https://sub.github.com/ -> must fail
    await expect(
      createLink({
        destinationUrl: "https://sub.github.com/",
        userId: normalUser.id,
      })
    ).rejects.toThrow(/Destination domain is blocked/);

    // 3. Editing an existing link to use a blocked destination -> must fail
    const validLink = await createLink({
      destinationUrl: "https://unblocked-legit-example.org/path",
      userId: normalUser.id,
    });
    createdLinkIds.push(validLink.id);

    await expect(
      updateLinkRules(validLink.id, normalUser.id, Role.USER, {
        destinationUrl: "https://sub.github.com/injected",
      })
    ).rejects.toThrow(/Destination domain is blocked/);

    // 4. Importing blocked destinations through CSV -> preview flags as invalid
    const csvContent =
      "destination_url,alias,title\n" +
      "https://github.com/torvalds/linux,linux-kernel,Linux Repo\n" +
      "https://gist.github.com/sample,sample-gist,Sample Gist\n" +
      "https://valid-target.org/docs,valid-docs,Valid Docs";

    const csvPreview = await previewCsvImport(csvContent, normalUser.id);
    expect(csvPreview.totalRows).toBe(3);
    expect(csvPreview.rows[0].isValid).toBe(false);
    expect(csvPreview.rows[0].error).toContain("Blocked domain");
    expect(csvPreview.rows[1].isValid).toBe(false);
    expect(csvPreview.rows[1].error).toContain("Blocked domain");
    expect(csvPreview.rows[2].isValid).toBe(true);

    // 5. Opening an existing short link whose destination is now blocked -> 307 to /link-status?status=BLOCKED
    const preBlockedLink = await db.link.create({
      data: {
        code: `gh-redir-${Date.now()}`,
        destinationUrl: "https://sub.github.com/old-link",
        userId: normalUser.id,
        clicksCount: 3,
      },
    });
    createdLinkIds.push(preBlockedLink.id);

    const redirectReq = new NextRequest(`http://localhost:3000/${preBlockedLink.code}`);
    const redirectRes = await redirectHandler(redirectReq, {
      params: Promise.resolve({ code: preBlockedLink.code }),
    });
    expect(redirectRes.status).toBe(307);
    const location = redirectRes.headers.get("location") || "";
    expect(location).toContain("/link-status");
    expect(location).toContain("status=BLOCKED");

    // 6. Adding github.com again -> 409 DUPLICATE_DOMAIN and count remains 1
    mockUser = { userId: adminUser.id, email: adminUser.email, role: Role.ADMIN };
    const dupReq = new NextRequest("http://localhost:3000/api/admin/blocked-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "https://github.com/", reason: "Duplicate attempt" }),
    });
    const dupRes = await postDomainHandler(dupReq);
    expect(dupRes.status).toBe(409);
    const dupData = await dupRes.json();
    expect(dupData.code).toBe("DUPLICATE_DOMAIN");
    expect(dupData.error).toContain("already in the blocklist");

    const count = await db.blockedDomain.count({ where: { domain: "github.com" } });
    expect(count).toBe(1);
  });

  it("exercises the real blocked-domain cache path with TTL bypass OFF using an injectable clock", async () => {
    // 1. Configure deterministic clock and 5000ms TTL
    let currentTime = 1_000_000;
    setClockForTesting(() => currentTime);
    setCacheTtlForTesting(5000);
    invalidateBlockedDomainCache();

    const uniqueDomain = `cache-test-${Date.now()}.net`;
    const targetUrl = `https://${uniqueDomain}/path`;

    try {
      // Step A: Domain not in DB -> loads cache at t=1,000,000, returns not blocked
      const res1 = await isDomainBlocked(targetUrl);
      expect(res1.isBlocked).toBe(false);

      // Step B: Insert domain directly into DB (bypassing in-process cache, simulating an external multi-instance write)
      const inserted = await db.blockedDomain.create({
        data: {
          domain: uniqueDomain,
          reason: "Direct DB insertion simulation",
          createdById: adminUser.id,
        },
      });
      createdBlockedDomainIds.push(inserted.id);

      // Step C: Advance clock by 2,000ms (t = 1,002,000 < t_fetch + 5,000)
      currentTime += 2000;

      // Because TTL has not expired, check MUST hit cached map and return false
      const resCached = await isDomainBlocked(targetUrl);
      expect(resCached.isBlocked).toBe(false);

      // Step D: Advance clock past 5,000ms TTL (t = 1,006,000 > t_fetch + 5,000)
      currentTime += 4000;

      // Cache has expired, must query DB and return blocked with reason
      const resRefreshed = await isDomainBlocked(targetUrl);
      expect(resRefreshed.isBlocked).toBe(true);
      expect(resRefreshed.matchedDomain).toBe(uniqueDomain);
      expect(resRefreshed.reason).toBe("Direct DB insertion simulation");

      // Step E: Test immediate in-process invalidation
      invalidateBlockedDomainCache();
      const resPostInvalidation = await isDomainBlocked(targetUrl);
      expect(resPostInvalidation.isBlocked).toBe(true);
    } finally {
      // Reset clock and TTL back to test environment defaults
      setClockForTesting(null);
      setCacheTtlForTesting(null);
      invalidateBlockedDomainCache();
    }
  });
});
