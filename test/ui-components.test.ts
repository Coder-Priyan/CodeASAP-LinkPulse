import { describe, it, expect, vi, afterEach } from "vitest";
import { copyToClipboard } from "@/lib/utils/clipboard";

describe("UI Components & Utilities (DB-Free Unit Tests)", () => {
  describe("copyToClipboard", () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    });

    it("returns false when empty text is provided", async () => {
      const result = await copyToClipboard("");
      expect(result).toBe(false);
    });

    it("calls navigator.clipboard.writeText when available and returns true", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, "navigator", {
        value: {
          clipboard: {
            writeText: writeTextMock,
          },
        },
        configurable: true,
        writable: true,
      });

      const result = await copyToClipboard("https://link.pulse/abc");
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith("https://link.pulse/abc");
    });

    it("handles clipboard rejection gracefully without throwing", async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
      Object.defineProperty(globalThis, "navigator", {
        value: {
          clipboard: {
            writeText: writeTextMock,
          },
        },
        configurable: true,
        writable: true,
      });

      const result = await copyToClipboard("https://link.pulse/restricted");
      expect(result).toBe(false);
      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
