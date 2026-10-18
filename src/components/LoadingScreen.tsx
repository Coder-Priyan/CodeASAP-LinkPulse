"use client";

import React, { useEffect, useState, useRef } from "react";
import { PulseMascot } from "@/components/PulseMascot";
import { RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import {
  PAGE_PRESETS,
  DEFAULT_TIMEOUT_MS,
  LONG_WAIT_THRESHOLD_MS,
  computeLoadingState,
  LoadingCopy,
} from "@/lib/utils/loading-state";

export { PAGE_PRESETS, LONG_WAIT_THRESHOLD_MS, DEFAULT_TIMEOUT_MS, computeLoadingState };
export type { LoadingCopy };

export interface LoadingScreenProps {
  pageName?: "dashboard" | "analytics" | "admin" | "default";
  headline?: string;
  error?: string | null;
  onRetry?: () => void;
  timeoutMs?: number;
  longWaitMs?: number;
  clock?: () => number;
}

export function LoadingScreen({
  pageName = "default",
  headline,
  error: externalError,
  onRetry,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  longWaitMs = LONG_WAIT_THRESHOLD_MS,
  clock = Date.now,
}: LoadingScreenProps) {
  const preset = PAGE_PRESETS[pageName] || PAGE_PRESETS.default;
  const title = headline || preset.title;
  const ambientMessages = preset.ambientMessages;

  const [elapsedMs, setElapsedMs] = useState(0);
  const retryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const startTime = clock();
    const interval = setInterval(() => {
      const now = clock();
      const currentElapsed = now - startTime;
      setElapsedMs(currentElapsed);

      if (currentElapsed >= timeoutMs) {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [clock, timeoutMs]);

  const state = computeLoadingState({
    elapsedMs,
    timeoutMs,
    longWaitMs,
    hasExternalError: Boolean(externalError),
  });

  // Focus retry button automatically when error state is reached
  useEffect(() => {
    if (state.hasError && retryBtnRef.current) {
      retryBtnRef.current.focus();
    }
  }, [state.hasError]);

  const errorMessage =
    externalError ||
    (state.isTimedOut
      ? "Taking longer than expected to load your data. Please check your internet connection and retry."
      : null);

  const activeMessage = ambientMessages[Math.min(state.messageIndex, ambientMessages.length - 1)];

  return (
    <div
      className="loading-screen-container"
      role="status"
      aria-live="polite"
      aria-busy={!state.hasError}
    >
      <div className="card loading-screen-card">
        {/* Animated Mascot */}
        <div
          className={`loading-mascot-wrapper ${
            state.hasError ? "loading-mascot-error" : "loading-mascot-active"
          }`}
          aria-hidden="true"
        >
          <PulseMascot mood={state.mood} size={110} />
        </div>

        {/* Title */}
        <h2 className="loading-card-title">{state.hasError ? "Unable to Load" : title}</h2>

        {state.hasError ? (
          <div className="loading-error-box">
            <div
              className="flex items-center justify-center gap-2"
              style={{ color: "var(--color-coral-dark)", fontWeight: 700, marginBottom: "0.5rem" }}
            >
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
            {/* Ambient Rotating Copy */}
            <div className="loading-step-title">{activeMessage.title}</div>
            <div className="loading-step-subtitle">{activeMessage.subtitle}</div>

            {/* Neo-brutalist Progress Track */}
            <div
              className="loading-progress-track"
              role="progressbar"
              aria-valuenow={state.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Loading progress"
            >
              <div
                className="loading-progress-bar"
                style={{ width: `${state.progressPercent}%` }}
              />
            </div>

            {/* Plain Friendly Long-Wait Reassurance Chip */}
            {state.isLongWait && (
              <div className="loading-long-wait-chip">
                <RefreshCw size={14} className="spin" />
                <span>{preset.longWaitBadge}</span>
              </div>
            )}

            {/* Screen Reader Announcement */}
            <div className="sr-only">
              {title}: {activeMessage.title} — {activeMessage.subtitle}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
