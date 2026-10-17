import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { PulseMascot, MascotMood } from "@/components/PulseMascot";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link Status",
};

interface PageProps {
  searchParams: Promise<{
    code?: string;
    status?: string;
  }>;
}

export default async function LinkStatusPage({ searchParams }: PageProps) {
  const { code, status } = await searchParams;

  const normalizedStatus = (status || "").toUpperCase();
  const isExpired = normalizedStatus === "EXPIRED";
  const isInactive = normalizedStatus === "INACTIVE" || normalizedStatus === "DISABLED";
  const isLimitReached = normalizedStatus === "LIMIT_REACHED";
  const isBlocked = normalizedStatus === "BLOCKED";
  const isPassword = normalizedStatus === "PASSWORD" || normalizedStatus === "PASSWORD_REQUIRED";

  const isValidCode = typeof code === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(code);
  const safeCode = isValidCode ? code : null;

  let title = "Link Not Found";
  let description = "We could not find an active link matching this short code.";
  let mood: MascotMood = "sad";

  if (isLimitReached) {
    title = "Click Limit Reached";
    description = "This short link has reached its maximum visit limit set by its creator.";
    mood = "surprised";
  } else if (isExpired) {
    title = "Link Has Expired";
    description = "This shortened link was configured with an expiration date and is no longer active.";
    mood = "sad";
  } else if (isInactive) {
    title = "Link Currently Disabled";
    description = "This short link has been temporarily disabled by its owner or an administrator.";
    mood = "thinking";
  } else if (isBlocked) {
    title = "Destination Domain Blocked";
    description = "The destination domain for this link has been blocked by administrators for safety and policy compliance.";
    mood = "sad";
  } else if (isPassword) {
    title = "Passcode Protected";
    description = "This short link is protected with a passcode before redirecting.";
    mood = "thinking";
  }

  return (
    <div className="container" style={{ maxWidth: "560px", paddingTop: "4.5rem", paddingBottom: "4rem", textAlign: "center" }}>
      <div className="card">
        <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <PulseMascot mood={mood} size={110} />
        </div>

        <h1 style={{ fontSize: "1.85rem", marginBottom: "0.5rem" }}>
          {title}
        </h1>

        <p
          style={{
            color: "var(--color-muted)",
            fontSize: "0.975rem",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}
        >
          {description}
        </p>

        {safeCode && (
          <div
            style={{
              display: "inline-block",
              backgroundColor: "var(--color-paper)",
              border: "var(--border-thick)",
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono-family)",
              color: "var(--color-ink)",
              fontSize: "0.9rem",
              fontWeight: 700,
              boxShadow: "var(--shadow-hard-sm)",
              marginBottom: "1.75rem",
            }}
          >
            Target Code: <span>/{safeCode}</span>
          </div>
        )}

        <div className="flex gap-3" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span>Go to Homepage</span>
          </Link>

          <Link href="/dashboard" className="btn btn-primary flex items-center gap-2">
            <Zap size={18} strokeWidth={2.5} />
            <span>Create New Link</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
