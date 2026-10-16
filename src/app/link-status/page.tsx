import Link from "next/link";
import { AlertCircle, Clock, SearchX, ArrowLeft, Zap, Gauge } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    code?: string;
    status?: string;
    reason?: string;
  }>;
}

export default async function LinkStatusPage({ searchParams }: PageProps) {
  const { code, status, reason } = await searchParams;

  const isExpired = status === "EXPIRED";
  const isInactive = status === "INACTIVE" || status === "DISABLED";
  const isLimitReached = status === "LIMIT_REACHED";

  let title = "Link Not Found";
  let description =
    reason || `We could not find an active link matching short code "${code || "unknown"}".`;
  let IconComponent = SearchX;
  let iconColor = "var(--danger)";
  let iconBg = "var(--danger-bg)";

  if (isLimitReached) {
    title = "Click Limit Reached";
    description =
      reason ||
      `The short link "/${code}" has reached its maximum visit capacity set by its owner.`;
    IconComponent = Gauge;
    iconColor = "var(--warning)";
    iconBg = "var(--warning-bg)";
  } else if (isExpired) {
    title = "Link Has Expired";
    description =
      reason || `The shortened link "/${code}" was configured with an expiration date and is no longer available.`;
    IconComponent = Clock;
    iconColor = "var(--warning)";
    iconBg = "var(--warning-bg)";
  } else if (isInactive) {
    title = "Link Currently Deactivated";
    description =
      reason || `The link "/${code}" has been temporarily deactivated by its owner or an administrator.`;
    IconComponent = AlertCircle;
    iconColor = "var(--warning)";
    iconBg = "var(--warning-bg)";
  }

  return (
    <div className="container" style={{ maxWidth: "560px", paddingTop: "5rem", textAlign: "center" }}>
      <div className="card">
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: iconBg,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        >
          <IconComponent size={32} color={iconColor} />
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          {title}
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.975rem",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          {description}
        </p>

        {code && (
          <div
            style={{
              display: "inline-block",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-color)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontFamily: "monospace",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              marginBottom: "2rem",
            }}
          >
            Target Code: <strong>/{code}</strong>
          </div>
        )}

        <div className="flex gap-3" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>Go to Homepage</span>
          </Link>

          <Link href="/dashboard" className="btn btn-primary flex items-center gap-2">
            <Zap size={16} />
            <span>Create New Link</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
