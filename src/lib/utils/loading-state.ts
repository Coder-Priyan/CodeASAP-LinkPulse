export type PulseMood = "happy" | "thinking" | "sad" | "surprised";

export interface LoadingCopy {
  title: string;
  subtitle: string;
}

export const PAGE_PRESETS: Record<
  "dashboard" | "analytics" | "admin" | "default",
  {
    title: string;
    ambientMessages: LoadingCopy[];
    longWaitBadge: string;
  }
> = {
  dashboard: {
    title: "Loading Dashboard",
    ambientMessages: [
      {
        title: "Opening your dashboard...",
        subtitle: "Preparing your workspace and links",
      },
      {
        title: "Gathering recent stats...",
        subtitle: "Organizing your shortened links and campaigns",
      },
      {
        title: "Still working...",
        subtitle: "Taking a little longer than usual, hang tight!",
      },
    ],
    longWaitBadge: "Still working on loading your links...",
  },
  analytics: {
    title: "Crunching Analytics",
    ambientMessages: [
      {
        title: "Opening analytics...",
        subtitle: "Compiling your workspace metrics",
      },
      {
        title: "Crunching recent visits...",
        subtitle: "Organizing devices, referrers, and charts",
      },
      {
        title: "Still working...",
        subtitle: "Processing visit history, hang tight!",
      },
    ],
    longWaitBadge: "Still working on compiling your charts...",
  },
  admin: {
    title: "Authenticating Administrator",
    ambientMessages: [
      {
        title: "Verifying administrator access...",
        subtitle: "Checking credentials and security policies",
      },
      {
        title: "Opening admin console...",
        subtitle: "Preparing system links and domain safety filters",
      },
      {
        title: "Still working...",
        subtitle: "Loading platform records, hang tight!",
      },
    ],
    longWaitBadge: "Still working on loading admin records...",
  },
  default: {
    title: "Loading LinkPulse",
    ambientMessages: [
      {
        title: "Connecting to LinkPulse...",
        subtitle: "Preparing your workspace",
      },
      {
        title: "Loading your data...",
        subtitle: "Almost ready",
      },
      {
        title: "Still working...",
        subtitle: "Taking a little longer than usual, hang tight!",
      },
    ],
    longWaitBadge: "Still working on connecting, hang tight!",
  },
};

export const LONG_WAIT_THRESHOLD_MS = 3500;
export const DEFAULT_TIMEOUT_MS = 12000;
export const DEFAULT_MIN_DISPLAY_TIME_MS = 320;

export interface LoadingCalculationResult {
  isLongWait: boolean;
  isTimedOut: boolean;
  hasError: boolean;
  mood: PulseMood;
  messageIndex: number;
  progressPercent: number;
}

/**
 * Pure calculation of loading state based on elapsed time.
 */
export function computeLoadingState({
  elapsedMs,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  longWaitMs = LONG_WAIT_THRESHOLD_MS,
  hasExternalError = false,
}: {
  elapsedMs: number;
  timeoutMs?: number;
  longWaitMs?: number;
  hasExternalError?: boolean;
}): LoadingCalculationResult {
  const isTimedOut = elapsedMs >= timeoutMs;
  const hasError = hasExternalError || isTimedOut;
  const isLongWait = !hasError && elapsedMs >= longWaitMs;

  let mood: PulseMood = "happy";
  if (hasError) {
    mood = "sad";
  } else if (isLongWait) {
    mood = "thinking";
  } else if (elapsedMs >= 1500) {
    mood = "happy";
  }

  let messageIndex = 0;
  if (isLongWait) {
    messageIndex = 2;
  } else if (elapsedMs >= 1500) {
    messageIndex = 1;
  } else {
    messageIndex = 0;
  }

  let progressPercent = 100;
  if (!hasError) {
    if (elapsedMs < longWaitMs) {
      progressPercent = Math.min(85, Math.floor(25 + (elapsedMs / longWaitMs) * 55));
    } else {
      progressPercent = Math.min(
        95,
        Math.floor(85 + ((elapsedMs - longWaitMs) / (timeoutMs - longWaitMs)) * 10)
      );
    }
  }

  return {
    isLongWait,
    isTimedOut,
    hasError,
    mood,
    messageIndex,
    progressPercent,
  };
}

/**
 * Calculates smooth anti-flash remaining time
 */
export function computeAntiFlashDelay(
  startTimeMs: number,
  nowMs = Date.now(),
  minDisplayMs = DEFAULT_MIN_DISPLAY_TIME_MS
): number {
  const elapsed = nowMs - startTimeMs;
  return elapsed < minDisplayMs ? minDisplayMs - elapsed : 0;
}
