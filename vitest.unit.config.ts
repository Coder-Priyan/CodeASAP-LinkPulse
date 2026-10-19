import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for DB-free unit tests.
 * Runs completely in-memory without invoking the database safety guard.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 10000,
    include: [
      "test/global-setup.test.ts",
      "test/loading-screen.test.ts",
      "test/register-rate-limiter.test.ts",
      "test/session.test.ts",
      "test/short-url.test.ts",
      "test/ui-components.test.ts",
      "test/unit-redirect-fallback-and-atomicity.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
