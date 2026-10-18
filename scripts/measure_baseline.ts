import { signSession } from "../src/lib/auth/session";
import { Role } from "@prisma/client";

const BASE_URL = "http://localhost:3001";

async function timeFetch(url: string, cookie: string): Promise<{ status: number; durationMs: number; sizeBytes: number }> {
  const t0 = performance.now();
  const res = await fetch(url, {
    headers: {
      Cookie: `linkpulse_session=${cookie}`,
    },
  });
  const text = await res.text();
  const durationMs = performance.now() - t0;
  return { status: res.status, durationMs, sizeBytes: text.length };
}

async function run() {
  const userToken = await signSession({
    userId: "cmvbvbmx80001vvjwf9fofxvm",
    email: "alex@techcorp.dev",
    role: Role.USER,
  });

  const adminToken = await signSession({
    userId: "cmvbvbmmf0000vvjw0srotkpp",
    email: "admin@linkpulse.io",
    role: Role.ADMIN,
  });

  console.log("Measuring Production Server on:", BASE_URL);

  // 1. Single API Endpoints (measured over 3 iterations for average)
  const endpoints = [
    { name: "/api/auth/me", url: `${BASE_URL}/api/auth/me`, token: userToken },
    { name: "/api/campaigns", url: `${BASE_URL}/api/campaigns`, token: userToken },
    { name: "/api/tags", url: `${BASE_URL}/api/tags`, token: userToken },
    { name: "/api/links", url: `${BASE_URL}/api/links`, token: userToken },
    { name: "/api/analytics?period=7d", url: `${BASE_URL}/api/analytics?period=7d`, token: userToken },
    { name: "/api/admin/blocked-domains", url: `${BASE_URL}/api/admin/blocked-domains`, token: adminToken },
    { name: "/docs (Redirect)", url: `${BASE_URL}/docs`, token: "" },
  ];

  const endpointTimings: Record<string, { avgMs: number; samples: number[] }> = {};

  for (const ep of endpoints) {
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const { durationMs } = await timeFetch(ep.url, ep.token);
      samples.push(Number(durationMs.toFixed(1)));
    }
    const avg = Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1));
    endpointTimings[ep.name] = { avgMs: avg, samples };
  }

  // 2. Dashboard Page: Sequential Flow (Current Implementation)
  // Step 1: /api/auth/me
  // Step 2: /api/campaigns + /api/tags
  // Step 3: /api/links
  const dashSeqTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await timeFetch(`${BASE_URL}/api/auth/me`, userToken);
    await Promise.all([
      timeFetch(`${BASE_URL}/api/campaigns`, userToken),
      timeFetch(`${BASE_URL}/api/tags`, userToken),
    ]);
    await timeFetch(`${BASE_URL}/api/links`, userToken);
    dashSeqTimes.push(Number((performance.now() - t0).toFixed(1)));
  }

  // 3. Dashboard Page: Parallel Flow (Optimized)
  const dashParTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await Promise.all([
      timeFetch(`${BASE_URL}/api/auth/me`, userToken),
      timeFetch(`${BASE_URL}/api/campaigns`, userToken),
      timeFetch(`${BASE_URL}/api/tags`, userToken),
      timeFetch(`${BASE_URL}/api/links`, userToken),
    ]);
    dashParTimes.push(Number((performance.now() - t0).toFixed(1)));
  }

  // 4. Analytics Page: Sequential Flow (Current)
  // Step 1: /api/auth/me
  // Step 2: /api/campaigns
  // Step 3: /api/analytics
  const analyticsSeqTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await timeFetch(`${BASE_URL}/api/auth/me`, userToken);
    await timeFetch(`${BASE_URL}/api/campaigns`, userToken);
    await timeFetch(`${BASE_URL}/api/analytics?period=7d`, userToken);
    analyticsSeqTimes.push(Number((performance.now() - t0).toFixed(1)));
  }

  // 5. Analytics Page: Parallel Flow (Optimized)
  const analyticsParTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await Promise.all([
      timeFetch(`${BASE_URL}/api/auth/me`, userToken),
      timeFetch(`${BASE_URL}/api/campaigns`, userToken),
      timeFetch(`${BASE_URL}/api/analytics?period=7d`, userToken),
    ]);
    analyticsParTimes.push(Number((performance.now() - t0).toFixed(1)));
  }

  // 6. Admin Page: Sequential Flow (Current)
  // Step 1: /api/auth/me
  // Step 2: /api/links?scope=all + /api/admin/blocked-domains
  const adminSeqTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await timeFetch(`${BASE_URL}/api/auth/me`, adminToken);
    await Promise.all([
      timeFetch(`${BASE_URL}/api/links?scope=all`, adminToken),
      timeFetch(`${BASE_URL}/api/admin/blocked-domains`, adminToken),
    ]);
    adminSeqTimes.push(Number((performance.now() - t0).toFixed(1)));
  }

  // 7. Admin Page: Parallel Flow (Optimized)
  const adminParTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await Promise.all([
      timeFetch(`${BASE_URL}/api/auth/me`, adminToken),
      timeFetch(`${BASE_URL}/api/links?scope=all`, adminToken),
      timeFetch(`${BASE_URL}/api/admin/blocked-domains`, adminToken),
    ]);
    adminParTimes.push(Number((performance.now() - t0).toFixed(1)));
  }

  const result = {
    endpoints: endpointTimings,
    pageFlows: {
      dashboard: {
        sequentialAvgMs: Number((dashSeqTimes.reduce((a, b) => a + b, 0) / dashSeqTimes.length).toFixed(1)),
        sequentialSamples: dashSeqTimes,
        parallelAvgMs: Number((dashParTimes.reduce((a, b) => a + b, 0) / dashParTimes.length).toFixed(1)),
        parallelSamples: dashParTimes,
        speedupRatio: Number(((dashSeqTimes[0] / dashParTimes[0])).toFixed(2)),
      },
      analytics: {
        sequentialAvgMs: Number((analyticsSeqTimes.reduce((a, b) => a + b, 0) / analyticsSeqTimes.length).toFixed(1)),
        sequentialSamples: analyticsSeqTimes,
        parallelAvgMs: Number((analyticsParTimes.reduce((a, b) => a + b, 0) / analyticsParTimes.length).toFixed(1)),
        parallelSamples: analyticsParTimes,
        speedupRatio: Number(((analyticsSeqTimes[0] / analyticsParTimes[0])).toFixed(2)),
      },
      admin: {
        sequentialAvgMs: Number((adminSeqTimes.reduce((a, b) => a + b, 0) / adminSeqTimes.length).toFixed(1)),
        sequentialSamples: adminSeqTimes,
        parallelAvgMs: Number((adminParTimes.reduce((a, b) => a + b, 0) / adminParTimes.length).toFixed(1)),
        parallelSamples: adminParTimes,
        speedupRatio: Number(((adminSeqTimes[0] / adminParTimes[0])).toFixed(2)),
      },
    },
  };

  console.log("=== REAL PRODUCTION BUILD MEASUREMENTS ===");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
