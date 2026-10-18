import { signSession } from "../src/lib/auth/session";
import { Role } from "@prisma/client";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function median(arr: number[]): number {
  return percentile(arr, 50);
}

async function measureRoute(url: string, cookie: string, runs = 10): Promise<{ samples: number[]; median: number; p95: number }> {
  const samples: number[] = [];
  const headers: Record<string, string> = cookie ? { Cookie: `linkpulse_session=${cookie}` } : {};

  // Warmup run
  const warm = await fetch(url, { headers });
  await warm.text();

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const res = await fetch(url, { headers });
    await res.text();
    const duration = performance.now() - start;
    samples.push(Number(duration.toFixed(1)));
  }

  return {
    samples,
    median: median(samples),
    p95: percentile(samples, 95),
  };
}

async function run() {
  console.log(`Running 10-Iteration Real Benchmark on ${BASE_URL}...`);

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

  const routes = [
    { name: "/api/auth/me", url: `${BASE_URL}/api/auth/me`, token: userToken },
    { name: "/api/campaigns", url: `${BASE_URL}/api/campaigns`, token: userToken },
    { name: "/api/tags", url: `${BASE_URL}/api/tags`, token: userToken },
    { name: "/api/links", url: `${BASE_URL}/api/links`, token: userToken },
    { name: "/api/analytics?period=7d", url: `${BASE_URL}/api/analytics?period=7d`, token: userToken },
    { name: "/api/admin/blocked-domains", url: `${BASE_URL}/api/admin/blocked-domains`, token: adminToken },
    { name: "/docs (Redirect)", url: `${BASE_URL}/docs`, token: "" },
  ];

  const results: Record<string, any> = {};

  for (const r of routes) {
    console.log(`Measuring ${r.name} (10 real runs)...`);
    results[r.name] = await measureRoute(r.url, r.token, 10);
  }

  console.log("\n=== 10-ITERATION BENCHMARK RESULTS (MEDIAN & P95) ===");
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
