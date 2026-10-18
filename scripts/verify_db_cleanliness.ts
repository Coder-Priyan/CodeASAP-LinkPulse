import { db } from "../src/lib/db";

async function main() {
  console.log("=== LinkPulse Database Cleanliness Verification ===");

  const domains = await db.blockedDomain.findMany({
    where: {
      OR: [
        { domain: { contains: "test-" } },
        { domain: { contains: "prof-" } },
        { domain: { contains: "bench-" } },
        { domain: { contains: "perf-" } },
        { domain: { contains: "mutation-" } },
        { domain: { contains: "redirect-check-" } },
        { domain: { contains: "pwd-block-" } },
        { domain: { contains: "evil-site" } },
        { domain: { contains: "spam-network" } },
        { domain: { contains: "phishing-attack" } },
        { domain: { contains: "temporary-hazard" } },
        { domain: { contains: "cache-invalidation-check" } },
      ],
    },
  });
  console.log("Leftover test blocked domains count:", domains.length);
  if (domains.length > 0) {
    console.log("Leftovers:", domains.map((d) => ({ id: d.id, domain: d.domain })));
  }

  const testLinks = await db.link.findMany({
    where: {
      OR: [
        { code: { startsWith: "test-" } },
        { code: { startsWith: "prof-" } },
        { code: { startsWith: "bench-" } },
        { code: { startsWith: "mut-" } },
        { code: { startsWith: "b-" } },
        { code: { startsWith: "thr-" } },
        { code: { startsWith: "fix-" } },
        { title: { contains: "Fixture" } },
        { title: { contains: "Benchmark" } },
        { title: { contains: "Profiling" } },
      ],
    },
  });
  console.log("Leftover test links count:", testLinks.length);
  if (testLinks.length > 0) {
    console.log("Leftover links:", testLinks.map((l) => ({ id: l.id, code: l.code, title: l.title })));
  }

  const testUsers = await db.user.findMany({
    where: {
      OR: [
        { email: { contains: "test-" } },
        { email: { contains: "alice-" } },
        { email: { contains: "bob-" } },
        { email: { contains: "admin-block-" } },
        { email: { contains: "testuser_" } },
        { email: { contains: "@linkpulse.test" } },
      ],
    },
  });
  console.log("Leftover test users count:", testUsers.length);
  if (testUsers.length > 0) {
    console.log("Leftover users:", testUsers.map((u) => ({ id: u.id, email: u.email, role: u.role })));
  }
}

main().catch(console.error);
