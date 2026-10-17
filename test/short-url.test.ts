import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getShortUrlBase, buildShortUrl } from "@/lib/utils/short-url";

describe("Short URL Helper", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it("prefers NEXT_PUBLIC_APP_URL when defined and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://link-pulse-coral.vercel.app/";
    expect(getShortUrlBase()).toBe("https://link-pulse-coral.vercel.app");
    expect(buildShortUrl("my-alias")).toBe("https://link-pulse-coral.vercel.app/my-alias");
  });

  it("handles code with leading slashes cleanly", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://link-pulse-coral.vercel.app";
    expect(buildShortUrl("/lead-slash")).toBe("https://link-pulse-coral.vercel.app/lead-slash");
  });

  it("falls back to window.location.origin when NEXT_PUBLIC_APP_URL is empty", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    // Mock window
    const originalWindow = global.window;
    // @ts-expect-error test mock
    global.window = {
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
    delete process.env.NEXT_PUBLIC_APP_URL;
    const originalWindow = global.window;
    // @ts-expect-error test mock
    delete global.window;

    try {
      expect(getShortUrlBase()).toBe("");
      expect(buildShortUrl("code123")).toBe("/code123");
    } finally {
      global.window = originalWindow;
    }
  });
});
