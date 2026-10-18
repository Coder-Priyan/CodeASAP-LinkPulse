// Enable query logging before initializing DB
process.env.PRISMA_LOG_QUERIES = "true";

import { db } from "../src/lib/db";
import { Role } from "@prisma/client";
import { createLink, updateLinkRules } from "../src/lib/services/link.service";
import { addBlockedDomain } from "../src/lib/services/blocked-domain.service";

interface LoggedQuery {
  query: string;
  duration: number;
  startTime: number;
  endTime: number;
  params: string;
}

const queryLog: LoggedQuery[] = [];

// Attach query listener
(db as any).$on("query", (e: any) => {
  const duration = e.duration;
  const now = Date.now();
  queryLog.push({
    query: e.query,
    duration,
    startTime: now - duration,
    endTime: now,
    params: e.params,
  });
});

async function profileSection(name: string, fn: () => Promise<any>) {
  queryLog.length = 0;
  const t0 = performance.now();
  const result = await fn();
  const totalWallMs = Number((performance.now() - t0).toFixed(1));

  console.log(`\n============================================================`);
  console.log(`[PROFILE: ${name}] Total Wall Time: ${totalWallMs} ms`);
  console.log(`Queries executed (${queryLog.length}):`);

  let sumQueryMs = 0;
  let hasParallel = false;

  queryLog.forEach((q, idx) => {
    sumQueryMs += q.duration;
    const cleanSql = q.query.replace(/\s+/g, " ").trim();
    console.log(`\n  #${idx + 1} Duration: ${q.duration} ms | Range: [${q.startTime} - ${q.endTime}]`);
    console.log(`     SQL: ${cleanSql.slice(0, 160)}${cleanSql.length > 160 ? "..." : ""}`);
    console.log(`     Params: ${q.params}`);

    // Check if this query overlapped with previous query
    if (idx > 0) {
      const prev = queryLog[idx - 1];
      if (q.startTime < prev.endTime) {
        hasParallel = true;
        console.log(`     -> OVERLAPPED with query #${idx}! (Parallel execution)`);
      } else {
        const gap = q.startTime - prev.endTime;
        console.log(`     -> SEQUENTIAL (gap after query #${idx}: ${gap} ms)`);
      }
    }
  });

  console.log(`\nSummary for ${name}:`);
  console.log(`- Sum of Query Durations: ${sumQueryMs} ms`);
  console.log(`- Wall Time: ${totalWallMs} ms`);
  console.log(`- Non-DB Wall Time (Network / CPU): ${(totalWallMs - sumQueryMs).toFixed(1)} ms`);
  console.log(`- Parallel Queries Detected: ${hasParallel ? "YES" : "NO (All queries ran sequentially)"}`);

  return { result, wallMs: totalWallMs, queries: [...queryLog], hasParallel };
}

async function runRealServerProfiling() {
  console.log("=== LINKPULSE REAL SERVER-SIDE PROFILING WITH PRISMA QUERY LOGS ===");

  // Warmup connection
  await db.$queryRaw`SELECT 1 as warmup`;
  queryLog.length = 0;

  // Retrieve existing admin user
  const admin = await db.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) throw new Error("No admin user found in database!");
  console.log(`Profiling with Admin: ${admin.email} (id: ${admin.id})`);

  let createdLinkId: string | null = null;
  let createdDomainId: string | null = null;

  try {
    // -------------------------------------------------------------
    // 1. POST /api/links (createLink)
    // -------------------------------------------------------------
    const testAlias = `prof-link-${Date.now().toString().slice(-6)}`;
    const createRes = await profileSection("POST /api/links (createLink with alias & rules)", async () => {
      // Simulate auth check query as done in requireAuth()
      await db.user.findUnique({
        where: { id: admin.id },
        select: { id: true, email: true, role: true, name: true },
      });

      return createLink({
        title: "Profiling Test Link",
        destinationUrl: "https://safe-profiling-target-alpha-99.org/page",
        customAlias: testAlias,
        userId: admin.id,
        user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        clickLimit: 1000,
      });
    });
    createdLinkId = createRes.result.id;

    // -------------------------------------------------------------
    // 2. PATCH /api/links/[id] (updateLinkRules)
    // -------------------------------------------------------------
    const updateRes = await profileSection("PATCH /api/links/[id] (updateLinkRules)", async () => {
      // Simulate auth check query as done in requireAuth()
      await db.user.findUnique({
        where: { id: admin.id },
        select: { id: true, email: true, role: true, name: true },
      });

      return updateLinkRules(createdLinkId!, admin.id, Role.ADMIN, {
        title: "Updated Profiling Title",
        clickLimit: 2000,
        destinationUrl: "https://safe-profiling-target-alpha-99.org/updated",
      });
    });

    // -------------------------------------------------------------
    // 3. POST /api/admin/blocked-domains (addBlockedDomain)
    // -------------------------------------------------------------
    const testDomain = `prof-test-${Date.now().toString().slice(-6)}.xyz`;
    const blockRes = await profileSection("POST /api/admin/blocked-domains (addBlockedDomain)", async () => {
      // Simulate auth check query as done in requireAdmin()
      await db.user.findUnique({
        where: { id: admin.id },
        select: { id: true, email: true, role: true, name: true },
      });

      return addBlockedDomain(testDomain, admin.id, "Real query profiling test");
    });
    createdDomainId = blockRes.result.id;

  } finally {
    console.log("\n------------------------------------------------------------");
    console.log("[CLEANUP OF PROFILING FIXTURES STRICTLY BY EXACT ID]");
    if (createdLinkId) {
      console.log(`Deleting created profiling link: ${createdLinkId}`);
      await db.clickEvent.deleteMany({ where: { linkId: createdLinkId } });
      await db.linkTag.deleteMany({ where: { linkId: createdLinkId } });
      await db.link.delete({ where: { id: createdLinkId } });
      console.log(`Deleted profiling link: ${createdLinkId}`);
    }
    if (createdDomainId) {
      console.log(`Deleting created profiling domain: ${createdDomainId}`);
      await db.blockedDomain.delete({ where: { id: createdDomainId } });
      console.log(`Deleted profiling domain: ${createdDomainId}`);
    }
    await db.$disconnect();
  }
}

runRealServerProfiling().catch(console.error);
