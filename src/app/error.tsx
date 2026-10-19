"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { PulseMascot } from "@/components/PulseMascot";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log sanitized error telemetry internally without exposing to user UI
    console.error("LinkPulse application error:", error);
  }, [error]);

  return (
    <div
      className="container"
      style={{
        maxWidth: "520px",
        paddingTop: "4.5rem",
        paddingBottom: "4rem",
        textAlign: "center",
      }}
    >
      <div className="card">
        <div
          style={{
            display: "inline-flex",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <PulseMascot mood="thinking" size={120} />
        </div>

        <h1
          style={{
            fontSize: "2.25rem",
            marginBottom: "0.25rem",
            fontFamily: "var(--font-display-family)",
          }}
        >
          Something Went Wrong
        </h1>

        <h2
          style={{
            fontSize: "1.15rem",
            marginBottom: "0.75rem",
            color: "var(--color-ink)",
            fontWeight: 700,
          }}
        >
          Temporary Application Notice
        </h2>

        <p
          style={{
            color: "var(--color-muted)",
            fontSize: "0.95rem",
            marginBottom: "2rem",
            lineHeight: 1.55,
          }}
        >
          An unexpected issue interrupted this page request. You can try reloading
          the view or return to the LinkPulse homepage.
        </p>

        <div
          className="flex gap-3"
          style={{ justifyContent: "center", flexWrap: "wrap" }}
        >
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw size={18} strokeWidth={2.5} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
