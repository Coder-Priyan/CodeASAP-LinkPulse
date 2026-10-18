"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  MousePointerClick,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Globe,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  ExternalLink,
  RefreshCw,
  QrCode,
  Power,
  Gauge,
  ShieldAlert,
} from "lucide-react";
import { AnalyticsReport, AnalyticsPeriod, LinkAlert } from "@/lib/services/analytics.service";
import Link from "next/link";
import { PulseMascot } from "@/components/PulseMascot";
import { LoadingScreen } from "@/components/LoadingScreen";

interface UserInfo {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

interface CampaignOption {
  id: string;
  name: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [campaignId, setCampaignId] = useState<string>("");
  const [scope, setScope] = useState<"me" | "all">("me");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Analytics | LinkPulse";
  }, []);

  const fetchAnalytics = useCallback(
    async (isInitial = false) => {
      const startTime = Date.now();
      try {
        setFetchError(null);
        const params = new URLSearchParams();
        params.set("period", period);
        if (campaignId) params.set("campaignId", campaignId);
        if (scope === "all") params.set("scope", "all");

        // Concurrent fetch across auth session, campaigns, and analytics in a single network round
        const [meRes, campRes, analyticsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/campaigns"),
          fetch(`/api/analytics?${params.toString()}`),
        ]);

        if (meRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!meRes.ok || !campRes.ok || !analyticsRes.ok) {
          throw new Error("One or more analytics requests failed.");
        }

        const [meData, campData, analyticsData] = await Promise.all([
          meRes.json(),
          campRes.json(),
          analyticsRes.json(),
        ]);

        if (!meData.user) {
          router.push("/login");
          return;
        }

        // Smooth anti-flash minimum display time for initial load (320ms)
        if (isInitial) {
          const elapsed = Date.now() - startTime;
          if (elapsed < 320) {
            await new Promise((resolve) => setTimeout(resolve, 320 - elapsed));
          }
        }

        setUser(meData.user);
        setCampaigns(campData.campaigns || []);
        setReport(analyticsData.report || null);
        setInitialLoading(false);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        if (isInitial) {
          setFetchError("Unable to compile live analytics. Please check your network and retry.");
        }
      } finally {
        setRefreshing(false);
      }
    },
    [period, campaignId, scope, router]
  );

  useEffect(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(false);
  };

  const renderAlertBadge = (type: LinkAlert["type"]) => {
    switch (type) {
      case "EXPIRED":
        return (
          <span className="badge badge-expired flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
            <Clock size={13} strokeWidth={2.5} />
            <span>Expired</span>
          </span>
        );
      case "DISABLED":
        return (
          <span className="badge badge-disabled flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
            <Power size={13} strokeWidth={2.5} />
            <span>Disabled</span>
          </span>
        );
      case "LIMIT_REACHED":
        return (
          <span className="badge badge-limit-reached flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
            <Gauge size={13} strokeWidth={2.5} />
            <span>Limit Reached</span>
          </span>
        );
      case "NEAR_LIMIT":
        return (
          <span className="badge badge-inactive flex items-center gap-1" style={{ fontSize: "0.75rem", backgroundColor: "var(--color-yellow)" }}>
            <AlertTriangle size={13} strokeWidth={2.5} />
            <span>Near Limit</span>
          </span>
        );
      case "EXPIRING_SOON":
        return (
          <span className="badge badge-inactive flex items-center gap-1" style={{ fontSize: "0.75rem", backgroundColor: "var(--color-yellow)" }}>
            <Clock size={13} strokeWidth={2.5} />
            <span>Expiring Soon</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-paper flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
            <AlertTriangle size={13} strokeWidth={2.5} />
            <span>Notice</span>
          </span>
        );
    }
  };

  const maxClickInSeries = report?.clicksOverTime?.reduce(
    (max, item) => Math.max(max, item.clicks),
    0
  ) || 1;

  if (initialLoading) {
    return (
      <LoadingScreen
        pageName="analytics"
        error={fetchError}
        onRetry={() => {
          setFetchError(null);
          setInitialLoading(true);
          fetchAnalytics(true);
        }}
      />
    );
  }

  const hasAnyData = (report?.metrics.totalClicks ?? 0) > 0 || (report?.metrics.totalLinks ?? 0) > 0;

  return (
    <div className="container container-wide" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      {/* Page Header & Controls */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="icon-chip icon-chip-teal"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-hard-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BarChart3 size={24} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.02em", fontFamily: "var(--font-display)", marginBottom: "0.2rem" }}>
              Analytics
            </h1>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
              Visits, visitors and sources for your links
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          {/* Admin Scope Toggle */}
          {user?.role === "ADMIN" && (
            <div className="tabs" role="tablist" aria-label="Analytics scope" style={{ marginBottom: 0 }}>
              <button
                type="button"
                role="tab"
                aria-selected={scope === "me"}
                onClick={() => setScope("me")}
                className={`tab ${scope === "me" ? "active" : ""}`}
              >
                My Links
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === "all"}
                onClick={() => setScope("all")}
                className={`tab ${scope === "all" ? "active" : ""}`}
              >
                Platform Wide
              </button>
            </div>
          )}

          {/* Campaign Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="analyticsCampaign" className="sr-only">
              Filter by Campaign
            </label>
            <select
              id="analyticsCampaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="form-select"
              style={{ width: "auto", minHeight: "44px", fontSize: "0.9rem" }}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  Campaign: {camp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector Tabs */}
          <div className="tabs" role="tablist" aria-label="Time period selector" style={{ marginBottom: 0 }}>
            <button
              type="button"
              role="tab"
              aria-selected={period === "7d"}
              onClick={() => setPeriod("7d")}
              className={`tab ${period === "7d" ? "active" : ""}`}
            >
              7 Days
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === "30d"}
              onClick={() => setPeriod("30d")}
              className={`tab ${period === "30d" ? "active" : ""}`}
            >
              30 Days
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === "all"}
              onClick={() => setPeriod("all")}
              className={`tab ${period === "all" ? "active" : ""}`}
            >
              All Time
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn btn-secondary btn-sm flex items-center gap-2"
            disabled={refreshing}
            style={{ minHeight: "44px" }}
            aria-label="Refresh analytics data"
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Empty State check */}
      {!hasAnyData && (
        <div className="empty-state" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "1rem" }}>
            <PulseMascot mood="thinking" size={120} />
          </div>
          <h2 className="empty-state-title">No analytics recorded yet</h2>
          <p className="empty-state-desc">
            No shortened links or human clicks have been recorded for the selected scope ({period}).
            Create a link in your dashboard and share it to begin gathering metrics.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Go to Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* Operational Link Alerts Section */}
      {report && report.alerts.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            Operational Link Alerts ({report.alerts.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {report.alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="card"
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid var(--color-ink)",
                  boxShadow: "var(--shadow-hard-sm)",
                  backgroundColor: alert.type === "EXPIRED" || alert.type === "LIMIT_REACHED" ? "var(--color-coral-light)" : "var(--color-white)",
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: "0.5rem" }}>
                  <code className="code-badge" style={{ fontSize: "0.85rem" }}>
                    /{alert.code}
                  </code>
                  {renderAlertBadge(alert.type)}
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--color-ink)", fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Key Metrics Grid */}
      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card stat-card-teal">
          <div className="flex items-center justify-between">
            <span className="stat-title">Period Clicks</span>
            <div className="icon-chip icon-chip-blue">
              <MousePointerClick size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{(report?.metrics.totalClicks ?? 0).toLocaleString()}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Human visits ({period.toUpperCase()})
          </span>
        </div>

        <div className="stat-card stat-card-butter">
          <div className="flex items-center justify-between">
            <span className="stat-title">Unique Visitors</span>
            <div className="icon-chip icon-chip-paper">
              <Users size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{(report?.metrics.uniqueVisitors ?? 0).toLocaleString()}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Different visitors
          </span>
        </div>

        <div className="stat-card stat-card-sage">
          <div className="flex items-center justify-between">
            <span className="stat-title">Active Links</span>
            <div className="icon-chip icon-chip-green">
              <CheckCircle size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{report?.metrics.activeLinks ?? 0}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Out of {report?.metrics.totalLinks ?? 0} total links
          </span>
        </div>

        <div className="stat-card stat-card-coral">
          <div className="flex items-center justify-between">
            <span className="stat-title">QR Scans</span>
            <div className="icon-chip icon-chip-coral">
              <QrCode size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{report?.metrics.qrScans ?? 0}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            {report?.metrics.qrScans ?? 0} QR · {report?.metrics.directClicks ?? 0} direct
          </span>
        </div>

        <div className="stat-card stat-card-butter">
          <div className="flex items-center justify-between">
            <span className="stat-title">Campaign Groups</span>
            <div className="icon-chip icon-chip-yellow">
              <Layers size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{report?.campaignPerformance.length ?? 0}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Configured campaigns
          </span>
        </div>
      </div>

      {/* Clicks Over Time Visualizer (Flat Neo-Brutalist Bar Chart) */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>
              Clicks Over Time
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--color-ink-muted)" }}>
              Daily visit traffic across the selected period ({period}). Values visible directly above bars.
            </p>
          </div>
          {report && report.clicksOverTime.length > 0 && maxClickInSeries > 0 && (
            <span className="badge badge-primary flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
              Peak: {maxClickInSeries} visits
            </span>
          )}
        </div>

        {report && report.clicksOverTime.length > 0 ? (
          <div>
            {/* Accessible screen reader data table */}
            <div className="sr-only">
              <h3>Clicks over time data table</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {report.clicksOverTime.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual chart */}
            <div
              style={{ overflowX: "auto", paddingBottom: "0.5rem" }}
              aria-label={`Bar chart showing clicks over time: total ${report.metrics.totalClicks} clicks across ${report.clicksOverTime.length} days.`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "0.6rem",
                  height: "200px",
                  paddingTop: "24px",
                  paddingBottom: "8px",
                  borderBottom: "2px solid var(--color-ink)",
                  minWidth: report.clicksOverTime.length > 14 ? "650px" : "auto",
                }}
              >
                {report.clicksOverTime.map((item) => {
                  const heightPct = Math.max(8, Math.round((item.clicks / maxClickInSeries) * 100));
                  const hasClicks = item.clicks > 0;
                  return (
                    <div
                      key={item.date}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Direct numeric value label */}
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: hasClicks ? "var(--color-ink)" : "var(--color-ink-muted)",
                          marginBottom: "4px",
                        }}
                      >
                        {item.clicks}
                      </span>

                      {/* Bar with flat color and solid border */}
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "36px",
                          height: `${heightPct}%`,
                          backgroundColor: hasClicks ? "var(--color-blue)" : "var(--color-paper)",
                          border: "1.5px solid var(--color-ink)",
                          borderRadius: "4px 4px 0 0",
                          boxShadow: hasClicks ? "1px 1px 0 var(--color-ink)" : "none",
                        }}
                        title={`${item.date}: ${item.clicks} clicks`}
                      />

                      {/* Date label: at least 12px, body sans, readable */}
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--color-ink-muted)",
                          marginTop: "8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>No visit data available for this range.</p>
        )}
      </div>

      {/* Breakdowns 2x2 Grid (Devices, Browsers, Referrers, Sources) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Device Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-display)" }}>
            <span className="icon-chip icon-chip-blue">
              <Laptop size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>Device Categories</span>
          </h3>

          {report && report.deviceBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {report.deviceBreakdown.map((dev) => (
                <div key={dev.name}>
                  <div className="flex justify-between items-center" style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.3rem", gap: "0.75rem" }}>
                    <span style={{ textTransform: "capitalize", color: "var(--color-ink)", minWidth: 0, flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dev.name}>
                      {dev.name}
                    </span>
                    <span style={{ color: "var(--color-ink-muted)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
                      {dev.count} ({dev.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "var(--color-paper)", border: "1.5px solid var(--color-ink)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                    <div style={{ width: `${dev.percentage}%`, height: "100%", backgroundColor: "var(--color-blue)", borderRight: dev.percentage > 0 && dev.percentage < 100 ? "1.5px solid var(--color-ink)" : "none" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>No device data recorded yet.</p>
          )}
        </div>

        {/* Browser Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-display)" }}>
            <span className="icon-chip icon-chip-yellow">
              <Monitor size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>Browser Families</span>
          </h3>

          {report && report.browserBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {report.browserBreakdown.map((b) => (
                <div key={b.name}>
                  <div className="flex justify-between items-center" style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.3rem", gap: "0.75rem" }}>
                    <span style={{ color: "var(--color-ink)", minWidth: 0, flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.name}>
                      {b.name}
                    </span>
                    <span style={{ color: "var(--color-ink-muted)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
                      {b.count} ({b.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "var(--color-paper)", border: "1.5px solid var(--color-ink)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                    <div style={{ width: `${b.percentage}%`, height: "100%", backgroundColor: "var(--color-yellow)", borderRight: b.percentage > 0 && b.percentage < 100 ? "1.5px solid var(--color-ink)" : "none" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>No browser data recorded yet.</p>
          )}
        </div>

        {/* Top Referrers */}
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-display)" }}>
            <span className="icon-chip icon-chip-coral">
              <Globe size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>Top Traffic Sources</span>
          </h3>

          {report && report.referrerBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {report.referrerBreakdown.map((ref) => (
                <div key={ref.name}>
                  <div className="flex justify-between items-center" style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.3rem", gap: "0.75rem" }}>
                    <span
                      title={ref.name}
                      style={{
                        color: "var(--color-ink)",
                        minWidth: 0,
                        flex: "1 1 auto",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ref.name}
                    </span>
                    <span style={{ color: "var(--color-ink-muted)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
                      {ref.count} ({ref.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "var(--color-paper)", border: "1.5px solid var(--color-ink)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                    <div style={{ width: `${ref.percentage}%`, height: "100%", backgroundColor: "var(--color-coral)", borderRight: ref.percentage > 0 && ref.percentage < 100 ? "1.5px solid var(--color-ink)" : "none" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>No referrer data recorded yet.</p>
          )}
        </div>

        {/* Visit Sources (QR vs Direct) */}
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-display)" }}>
            <span className="icon-chip icon-chip-green">
              <QrCode size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>Visit Sources (QR vs Direct)</span>
          </h3>

          {report && (report.metrics.totalClicks > 0) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {report.sourceBreakdown.map((src) => {
                const isQr = src.name.toLowerCase().includes("qr");
                return (
                  <div key={src.name}>
                    <div className="flex justify-between items-center" style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.3rem", gap: "0.75rem" }}>
                      <span style={{ color: "var(--color-ink)", minWidth: 0, flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={src.name}>
                        {src.name}
                      </span>
                      <span style={{ color: "var(--color-ink-muted)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
                        {src.count} ({src.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "10px", backgroundColor: "var(--color-paper)", border: "1.5px solid var(--color-ink)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${src.percentage}%`,
                          height: "100%",
                          backgroundColor: isQr ? "var(--color-green)" : "var(--color-blue)",
                          borderRight: src.percentage > 0 && src.percentage < 100 ? "1.5px solid var(--color-ink)" : "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)", marginTop: "0.5rem", marginBottom: 0, fontWeight: 500 }}>
                * QR attribution is recorded when visitors scan your generated QR code.
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>No source data recorded yet.</p>
          )}
        </div>
      </div>

      {/* Top Performing Links - Full Width Row */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem", fontFamily: "var(--font-display)" }}>
          Top Performing Links
        </h3>

        {report && report.topLinks.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "160px" }}>Short Code</th>
                  <th>Destination</th>
                  <th style={{ width: "120px" }}>Clicks</th>
                  <th style={{ width: "120px" }}>Uniques</th>
                </tr>
              </thead>
              <tbody>
                {report.topLinks.map((l, index) => {
                  const rankClass = index === 0 ? "rank-badge-1" : index === 1 ? "rank-badge-2" : index === 2 ? "rank-badge-3" : "rank-badge-other";
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="flex items-center">
                          <span className={`rank-badge ${rankClass}`}>{index + 1}</span>
                          <code className="code-badge" style={{ fontSize: "0.85rem" }}>
                            /{l.code}
                          </code>
                        </div>
                      </td>
                    <td>
                      <div
                        title={l.destinationUrl}
                        style={{
                          maxWidth: "480px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.9rem",
                          color: "var(--color-ink)",
                          fontWeight: 500,
                        }}
                      >
                        {l.destinationUrl}
                        <span className="sr-only">{l.destinationUrl}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-count">{l.clicks}</span>
                    </td>
                    <td style={{ color: "var(--color-ink)", fontSize: "0.9rem", fontWeight: 600 }}>
                      {l.uniques}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>No active links with traffic recorded.</p>
        )}
      </div>

      {/* Campaign Performance - Full Width Row */}
      <div className="card">
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem", fontFamily: "var(--font-display)" }}>
          Campaign Performance
        </h3>

        {report && report.campaignPerformance.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th style={{ width: "120px" }}>Links</th>
                  <th style={{ width: "120px" }}>Clicks</th>
                  <th>Top Link</th>
                </tr>
              </thead>
              <tbody>
                {report.campaignPerformance.map((camp) => (
                  <tr key={camp.id}>
                    <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>{camp.name}</td>
                    <td style={{ color: "var(--color-ink)", fontWeight: 600 }}>{camp.totalLinks}</td>
                    <td>
                      <span className="badge badge-count">{camp.totalClicks}</span>
                    </td>
                    <td>
                      {camp.topLink ? (
                        <code className="code-badge" style={{ fontSize: "0.85rem" }}>
                          /{camp.topLink.code} ({camp.topLink.clicks})
                        </code>
                      ) : (
                        <span style={{ color: "var(--color-ink-muted)", fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>
            No campaigns created yet. Group links into campaigns via the Dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
