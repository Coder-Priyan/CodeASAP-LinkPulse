import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getShortUrlBase, buildShortUrl } from "@/lib/utils/short-url";

describe("Short URL Helper", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  });

  it("in production prefers NEXT_PUBLIC_APP_URL when defined and strips trailing slashes", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://link-pulse-coral.vercel.app/";
    expect(getShortUrlBase()).toBe("https://link-pulse-coral.vercel.app");
    expect(buildShortUrl("my-alias")).toBe("https://link-pulse-coral.vercel.app/my-alias");
  });

  it("handles code with leading slashes cleanly", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://link-pulse-coral.vercel.app";
    expect(buildShortUrl("/lead-slash")).toBe("https://link-pulse-coral.vercel.app/lead-slash");
  });

  it("outside production prefers window.location.origin to match dynamic localhost dev server port", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"; // Stale env var port
    const originalWindow = global.window;
    (global as any).window = {
      location: {
        origin: "http://localhost:61614/", // Actual dynamic dev server port
      },
    };

    try {
      expect(getShortUrlBase()).toBe("http://localhost:61614");
      expect(buildShortUrl("dev-code")).toBe("http://localhost:61614/dev-code");
    } finally {
      global.window = originalWindow;
    }
  });

  it("falls back to window.location.origin in production when NEXT_PUBLIC_APP_URL is empty", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    const originalWindow = global.window;
    (global as any).window = {
      location: {
        origin: "http://localhost:3000/",
      },
    };

    try {
      expect(getShortUrlBase()).toBe("http://localhost:3000");
      expect(buildShortUrl("local-code")).toBe("http://localhost:3000/local-code");
    } finally {
      global.window = originalWindow;
    }
  });

  it("returns root relative path when neither env var nor window is available", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    const originalWindow = global.window;
    delete (global as any).window;

    try {
      expect(getShortUrlBase()).toBe("");
      expect(buildShortUrl("code123")).toBe("/code123");
    } finally {
      global.window = originalWindow;
    }
  });
});
