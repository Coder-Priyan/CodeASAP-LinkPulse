import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PAGE_PRESETS,
  computeLoadingState,
  computeAntiFlashDelay,
  LONG_WAIT_THRESHOLD_MS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MIN_DISPLAY_TIME_MS,
} from "@/lib/utils/loading-state";

describe("Loading Screen State Transitions and Copy Integrity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. Copy & Infrastructure Jargon Audit", () => {
    it("ensures zero user-facing infrastructure jargon exists in preset copy", () => {
      const forbiddenJargon = [
        "neon",
        "remote neon",
        "cold start",
        "tcp",
        "tls",
        "postgresql",
        "prisma",
        "singapore",
        "cluster",
        "remote database",
      ];

      for (const [pageName, preset] of Object.entries(PAGE_PRESETS)) {
        const textToAudit = [
          preset.title,
          preset.longWaitBadge,
          ...preset.ambientMessages.map((m) => `${m.title} ${m.subtitle}`),
        ]
          .join(" ")
          .toLowerCase();

        for (const word of forbiddenJargon) {
          expect(
            textToAudit.includes(word),
            `Found forbidden jargon "${word}" in LoadingScreen preset for page "${pageName}": "${textToAudit}"`
          ).toBe(false);
        }
      }
    });

    it("verifies all preset ambient messages have friendly, non-misleading copy", () => {
      for (const [pageName, preset] of Object.entries(PAGE_PRESETS)) {
        expect(preset.title.length).toBeGreaterThan(0);
        expect(preset.longWaitBadge.length).toBeGreaterThan(0);
        expect(preset.ambientMessages.length).toBeGreaterThanOrEqual(3);
        for (const msg of preset.ambientMessages) {
          expect(msg.title.length).toBeGreaterThan(0);
          expect(msg.subtitle.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("2. Smart Anti-Flash Minimum Display Time", () => {
    it("calculates positive delay when network request finishes faster than minimum display threshold", () => {
      const startTime = 1000;
      const now = 1100; // 100ms elapsed
      const delay = computeAntiFlashDelay(startTime, now, DEFAULT_MIN_DISPLAY_TIME_MS);
      expect(delay).toBe(220); // 320 - 100 = 220ms
    });

    it("returns zero delay when network request exceeds the minimum display threshold", () => {
      const startTime = 1000;
      const now = 1500; // 500ms elapsed (> 320ms)
      const delay = computeAntiFlashDelay(startTime, now, DEFAULT_MIN_DISPLAY_TIME_MS);
      expect(delay).toBe(0);
    });
  });

  describe("3. Fake Timer Driven State Progression", () => {
    it("begins in initial happy state at 0ms", () => {
      const state = computeLoadingState({
        elapsedMs: 0,
        timeoutMs: 12000,
        longWaitMs: 3500,
      });

      expect(state.isLongWait).toBe(false);
      expect(state.isTimedOut).toBe(false);
      expect(state.hasError).toBe(false);
      expect(state.mood).toBe("happy");
      expect(state.messageIndex).toBe(0);
      expect(state.progressPercent).toBeGreaterThanOrEqual(25);
    });

    it("advances to secondary ambient message around 1500ms with happy mood", () => {
      const state = computeLoadingState({
        elapsedMs: 1600,
        timeoutMs: 12000,
        longWaitMs: 3500,
      });

      expect(state.isLongWait).toBe(false);
      expect(state.messageIndex).toBe(1);
      expect(state.mood).toBe("happy");
    });

    it("transitions precisely at 3500ms long-wait threshold to thinking mascot and reassurance copy", () => {
      // Just before threshold
      const beforeThreshold = computeLoadingState({
        elapsedMs: LONG_WAIT_THRESHOLD_MS - 1,
        timeoutMs: 12000,
        longWaitMs: LONG_WAIT_THRESHOLD_MS,
      });
      expect(beforeThreshold.isLongWait).toBe(false);
      expect(beforeThreshold.mood).toBe("happy");

      // Exactly at threshold
      const atThreshold = computeLoadingState({
        elapsedMs: LONG_WAIT_THRESHOLD_MS,
        timeoutMs: 12000,
        longWaitMs: LONG_WAIT_THRESHOLD_MS,
      });
      expect(atThreshold.isLongWait).toBe(true);
      expect(atThreshold.isTimedOut).toBe(false);
      expect(atThreshold.hasError).toBe(false);
      expect(atThreshold.mood).toBe("thinking");
      expect(atThreshold.messageIndex).toBe(2);
      expect(atThreshold.progressPercent).toBeGreaterThanOrEqual(85);
    });

    it("transitions to timeout error state at 12000ms with sad mascot and 100% progress", () => {
      // Just before timeout
      const beforeTimeout = computeLoadingState({
        elapsedMs: DEFAULT_TIMEOUT_MS - 1,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        longWaitMs: LONG_WAIT_THRESHOLD_MS,
      });
      expect(beforeTimeout.hasError).toBe(false);
      expect(beforeTimeout.mood).toBe("thinking");

      // Exactly at timeout
      const atTimeout = computeLoadingState({
        elapsedMs: DEFAULT_TIMEOUT_MS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        longWaitMs: LONG_WAIT_THRESHOLD_MS,
      });
      expect(atTimeout.isLongWait).toBe(false);
      expect(atTimeout.isTimedOut).toBe(true);
      expect(atTimeout.hasError).toBe(true);
      expect(atTimeout.mood).toBe("sad");
      expect(atTimeout.progressPercent).toBe(100);
    });

    it("immediately switches to error state with sad mascot on external network rejection", () => {
      const state = computeLoadingState({
        elapsedMs: 200,
        hasExternalError: true,
      });

      expect(state.hasError).toBe(true);
      expect(state.mood).toBe("sad");
      expect(state.progressPercent).toBe(100);
    });
  });

  describe("4. End-to-End Fake Timer Simulation", () => {
    it("simulates advancing fake timers step-by-step through entire lifecycle", () => {
      let simulatedTime = 0;
      const getSimulatedState = () =>
        computeLoadingState({
          elapsedMs: simulatedTime,
          timeoutMs: 10000,
          longWaitMs: 3000,
        });

      // Tick 0ms
      expect(getSimulatedState().mood).toBe("happy");
      expect(getSimulatedState().isLongWait).toBe(false);

      // Advance by 1800ms
      simulatedTime += 1800;
      expect(getSimulatedState().messageIndex).toBe(1);
      expect(getSimulatedState().isLongWait).toBe(false);

      // Advance past long-wait threshold (3000ms)
      simulatedTime += 1400; // 3200ms
      expect(getSimulatedState().isLongWait).toBe(true);
      expect(getSimulatedState().mood).toBe("thinking");

      // Advance past timeout (10000ms)
      simulatedTime += 7000; // 10200ms
      expect(getSimulatedState().isTimedOut).toBe(true);
      expect(getSimulatedState().hasError).toBe(true);
      expect(getSimulatedState().mood).toBe("sad");
    });
  });

  describe("5. Abandoned Navigation Stale Timestamp Safety", () => {
    it("expires stale loading start timestamps when user returns after abandoning a previous visit", async () => {
      const { markLoadingStarted, clearLoadingStarted, STALE_NAVIGATION_TTL_MS } = await import(
        "@/lib/utils/loading-state"
      );

      // 1. Initial navigation started at t = 1,000,000
      const initialTime = 1_000_000;
      clearLoadingStarted("dashboard");
      const t1 = markLoadingStarted("dashboard", initialTime);
      expect(t1).toBe(initialTime);

      // 2. Continuous visit within valid TTL keeps original start timestamp
      const withinTtl = initialTime + 500;
      const t2 = markLoadingStarted("dashboard", withinTtl);
      expect(t2).toBe(initialTime);

      // 3. User abandoned navigation and returns 30 seconds later (> STALE_NAVIGATION_TTL_MS)
      const abandonedReturnTime = initialTime + STALE_NAVIGATION_TTL_MS + 20_000;
      const t3 = markLoadingStarted("dashboard", abandonedReturnTime);
      // Must NOT return t1 (initialTime), because doing so would immediately poison the screen with 30s elapsed!
      expect(t3).toBe(abandonedReturnTime);
      expect(t3).not.toBe(initialTime);

      // 4. clearLoadingStarted removes entry completely
      clearLoadingStarted("dashboard");
      const freshTime = 2_000_000;
      const t4 = markLoadingStarted("dashboard", freshTime);
      expect(t4).toBe(freshTime);

      // Cleanup
      clearLoadingStarted("dashboard");
    });
  });
});

