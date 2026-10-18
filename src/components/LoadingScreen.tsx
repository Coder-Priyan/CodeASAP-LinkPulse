"use client";

import React, { useEffect, useState, useRef } from "react";
import { PulseMascot, PulseMood } from "@/components/PulseMascot";
import { RefreshCw, AlertCircle, RotateCcw } from "lucide-react";

export interface LoadingStep {
  title: string;
  subtitle: string;
}

const PAGE_PRESETS: Record<
  "dashboard" | "analytics" | "admin" | "default",
  {
    title: string;
    steps: LoadingStep[];
  }
> = {
  dashboard: {
    title: "Loading Dashboard",
    steps: [
      {
        title: "Connecting session...",
        subtitle: "Verifying your security credentials",
      },
      {
        title: "Fetching your links...",
        subtitle: "Loading shortened aliases, campaigns & tags",
      },
      {
        title: "Aggregating metrics...",
        subtitle: "Calculating visits and unique visitors",
      },
      {
        title: "Connecting to database...",
        subtitle: "Live database response in progress — almost there!",
      },
    ],
  },
  analytics: {
    title: "Crunching Analytics",
    steps: [
      {
        title: "Checking workspace...",
        subtitle: "Authenticating telemetry credentials",
      },
      {
        title: "Aggregating click events...",
        subtitle: "Processing devices, browsers & referrers",
      },
      {
        title: "Synthesizing breakdown...",
        subtitle: "Building timeline performance charts",
      },
      {
        title: "Compiling telemetry...",
        subtitle: "Aggregating multi-day visitor curves — almost there!",
      },
    ],
  },
  admin: {
    title: "Authenticating Administrator",
    steps: [
      {
        title: "Verifying privileges...",
        subtitle: "Checking system administrator permissions",
      },
      {
        title: "Syncing domain blocklist...",
        subtitle: "Loading active safety rules and subdomains",
      },
      {
        title: "Loading system registry...",
        subtitle: "Retrieving platform links and accounts",
      },
      {
        title: "Securing administrative audit...",
        subtitle: "Connecting to remote database — almost ready!",
      },
    ],
  },
  default: {
    title: "Loading LinkPulse",
    steps: [
      {
        title: "Connecting to LinkPulse...",
        subtitle: "Checking session and workspace status",
      },
      {
        title: "Loading data...",
        subtitle: "Retrieving requested resources",
      },
      {
        title: "Almost ready...",
        subtitle: "Rendering view and controls",
      },
      {
        title: "Still working on it...",
        subtitle: "Network is taking a little longer than usual",
      },
    ],
  },
};

interface LoadingScreenProps {
  pageName?: "dashboard" | "analytics" | "admin" | "default";
  headline?: string;
  steps?: LoadingStep[];
  error?: string | null;
  onRetry?: () => void;
  timeoutMs?: number; // Defaults to 12000ms
}

export function LoadingScreen({
  pageName = "default",
  headline,
  steps: customSteps,
  error: externalError,
  onRetry,
  timeoutMs = 12000,
}: LoadingScreenProps) {
  const preset = PAGE_PRESETS[pageName] || PAGE_PRESETS.default;
  const title = headline || preset.title;
  const steps = customSteps || preset.steps;

  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const retryBtnRef = useRef<HTMLButtonElement>(null);

  // Rotate through steps based on real time elapsed
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(Math.floor(elapsed));

      if (elapsed >= timeoutMs / 1000) {
        setIsTimedOut(true);
        clearInterval(interval);
      } else if (elapsed >= 3.5) {
        setStepIndex(3);
      } else if (elapsed >= 2.0) {
        setStepIndex(2);
      } else if (elapsed >= 0.8) {
        setStepIndex(1);
      } else {
        setStepIndex(0);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timeoutMs]);

  // Focus retry button if error or timeout happens
  useEffect(() => {
    if ((externalError || isTimedOut) && retryBtnRef.current) {
      retryBtnRef.current.focus();
    }
  }, [externalError, isTimedOut]);

  const hasError = Boolean(externalError) || isTimedOut;
  const errorMessage =
    externalError ||
    (isTimedOut
      ? "Connecting to the database is taking longer than expected. Please check your internet connection or retry."
      : null);

  // Mascot mood reflects state
  let mood: PulseMood = "happy";
  if (hasError) {
    mood = "sad";
  } else if (stepIndex >= 3) {
    mood = "thinking";
  } else if (stepIndex >= 2) {
    mood = "surprised";
  } else {
    mood = "happy";
  }

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const progressPercent = hasError
    ? 100
    : Math.min(95, 20 + stepIndex * 25 + Math.min(elapsedSeconds * 4, 15));

  return (
    <div
      className="loading-screen-container"
      role="status"
      aria-live="polite"
      aria-busy={!hasError}
    >
      <div className="card loading-screen-card">
        {/* Animated Mascot */}
        <div
          className={`loading-mascot-wrapper ${
            hasError ? "loading-mascot-error" : "loading-mascot-active"
          }`}
          aria-hidden="true"
        >
          <PulseMascot mood={mood} size={110} />
        </div>

        {/* Header / Title */}
        <h2 className="loading-card-title">{hasError ? "Unable to Load" : title}</h2>

        {/* Step indicator or Error message */}
        {hasError ? (
          <div className="loading-error-box">
            <div className="flex items-center justify-center gap-2" style={{ color: "var(--color-coral-dark)", fontWeight: 700, marginBottom: "0.5rem" }}>
              <AlertCircle size={18} />
              <span>Connection Notice</span>
            </div>
            <p className="loading-error-text">{errorMessage}</p>
            {onRetry && (
              <div style={{ marginTop: "1.25rem" }}>
                <button
                  ref={retryBtnRef}
                  type="button"
                  onClick={onRetry}
                  className="btn btn-primary flex items-center justify-center gap-2"
                  style={{ width: "100%" }}
                >
                  <RotateCcw size={16} />
                  <span>Retry Connection</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Active Step Text */}
            <div className="loading-step-title">{currentStep.title}</div>
            <div className="loading-step-subtitle">{currentStep.subtitle}</div>

            {/* Neo-brutalist Progress Track */}
            <div
              className="loading-progress-track"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Loading progress"
            >
              <div
                className="loading-progress-bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Long Wait Reassurance Badge */}
            {stepIndex >= 3 && (
              <div className="loading-long-wait-chip">
                <RefreshCw size={14} className="spin" />
                <span>Working on remote Neon connection...</span>
              </div>
            )}

            {/* Screen Reader Notice */}
            <div className="sr-only">
              {title}: {currentStep.title} - {currentStep.subtitle}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
