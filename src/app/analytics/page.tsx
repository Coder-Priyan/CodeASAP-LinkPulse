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
  Sliders,
} from "lucide-react";
import { AnalyticsReport, AnalyticsPeriod, LinkAlert } from "@/lib/services/analytics.service";
import Link from "next/link";

const ALERT_LABELS: Record<LinkAlert["type"], string> = {
  EXPIRED: "Expired",
  DISABLED: "Disabled",
  EXPIRING_SOON: "Expiring Soon",
  NEAR_LIMIT: "Near Limit",
  LIMIT_REACHED: "Limit Reached",
};

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      // 1. Auth check
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.user) {
        router.push("/login");
        return;
      }
      setUser(meData.user);

      // 2. Fetch available campaigns for dropdown filter
      const campRes = await fetch("/api/campaigns");
      const campData = await campRes.json();
      setCampaigns(campData.campaigns || []);

      // 3. Fetch analytics report
      const params = new URLSearchParams();
      params.set("period", period);
      if (campaignId) params.set("campaignId", campaignId);
      if (scope === "all" && meData.user.role === "ADMIN") {
        params.set("scope", "all");
      }

      const analyticsRes = await fetch(`/api/analytics?${params.toString()}`);
      const analyticsData = await analyticsRes.json();
      setReport(analyticsData.report || null);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, campaignId, scope, router]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "5rem", textAlign: "center" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Aggregating telemetry & performance metrics...
        </div>
      </div>
    );
  }

  const maxClickInSeries = report?.clicksOverTime?.reduce(
    (max, item) => Math.max(max, item.clicks),
    0
  ) || 1;

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      {/* Page Header & Controls */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-md)",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(6, 182, 212, 0.3)",
            }}
          >
            <BarChart3 size={24} color="var(--accent-secondary)" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Analytics & Telemetry
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem" }}>
              Live, bot-filtered performance metrics across links, campaigns, and referrers.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          {/* Admin Scope Toggle */}
          {user?.role === "ADMIN" && (
            <div className="flex" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "var(--radius-md)", padding: "2px" }}>
              <button
                onClick={() => setScope("me")}
                className={`btn btn-sm ${scope === "me" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.75rem", border: "none" }}
              >
                My Links
              </button>
              <button
                onClick={() => setScope("all")}
                className={`btn btn-sm ${scope === "all" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.75rem", border: "none" }}
              >
                Platform Wide
              </button>
            </div>
          )}

          {/* Campaign Selector */}
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="form-input"
            style={{ width: "auto", padding: "0.45rem 0.85rem", fontSize: "0.875rem" }}
          >
            <option value="">All Campaigns</option>
            {campaigns.map((camp) => (
              <option key={camp.id} value={camp.id}>
                Campaign: {camp.name}
              </option>
            ))}
          </select>

          {/* Period Selector */}
          <div className="flex" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "var(--radius-md)", padding: "2px" }}>
            <button
              onClick={() => setPeriod("7d")}
              className={`btn btn-sm ${period === "7d" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.35rem 0.75rem", border: "none" }}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod("30d")}
              className={`btn btn-sm ${period === "30d" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.35rem 0.75rem", border: "none" }}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`btn btn-sm ${period === "all" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.35rem 0.75rem", border: "none" }}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            className="btn btn-secondary btn-sm flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Link Alerts Banner Section */}
      {report && report.alerts.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
            Operational Link Alerts ({report.alerts.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {report.alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="card"
                style={{
                  padding: "0.85rem 1.15rem",
                  borderColor:
                    alert.type === "EXPIRING_SOON" || alert.type === "NEAR_LIMIT"
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(239, 68, 68, 0.3)",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: "0.3rem" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--accent-secondary)", fontSize: "0.9rem" }}>
                    /{alert.code}
                  </span>
                  <span
                    className={`badge ${
                      alert.type === "EXPIRING_SOON" || alert.type === "NEAR_LIMIT"
                        ? "badge-inactive"
                        : "badge-inactive"
                    }`}
                    style={{ fontSize: "0.7rem" }}
                  >
                    {ALERT_LABELS[alert.type] || alert.type}
                  </span>
                </div>
                <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Key Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Period Clicks</span>
            <MousePointerClick size={18} color="var(--accent-secondary)" />
          </div>
          <div className="stat-value">{report?.metrics.totalClicks ?? 0}</div>
          <span style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
            Human visits ({period.toUpperCase()})
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Unique Visitors</span>
            <Users size={18} color="#a78bfa" />
          </div>
          <div className="stat-value">{report?.metrics.uniqueVisitors ?? 0}</div>
          <span style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
            Distinct salted hashes
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Active Links</span>
            <CheckCircle size={18} color="var(--success)" />
          </div>
          <div className="stat-value">{report?.metrics.activeLinks ?? 0}</div>
          <span style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
            Out of {report?.metrics.totalLinks ?? 0} total links
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Campaign Groups</span>
            <Layers size={18} color="var(--accent-primary)" />
          </div>
          <div className="stat-value">{report?.campaignPerformance.length ?? 0}</div>
          <span style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
            Configured campaigns
          </span>
        </div>
      </div>

      {/* Clicks Over Time Visualizer (Vanilla CSS Bar Chart) */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Clicks Over Time</h2>
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              Daily visit traffic across the selected period ({period}).
            </p>
          </div>
        </div>

        {report && report.clicksOverTime.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "0.5rem",
                height: "180px",
                paddingTop: "20px",
                borderBottom: "1px solid var(--border-color)",
                minWidth: report.clicksOverTime.length > 14 ? "600px" : "auto",
              }}
            >
              {report.clicksOverTime.map((item) => {
                const heightPct = Math.max(6, Math.round((item.clicks / maxClickInSeries) * 100));
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
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                      {item.clicks > 0 ? item.clicks : ""}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "32px",
                        height: `${heightPct}%`,
                        backgroundColor: item.clicks > 0 ? "var(--accent-primary)" : "rgba(255, 255, 255, 0.05)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.2s ease",
                      }}
                      title={`${item.date}: ${item.clicks} clicks`}
                    />
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        marginTop: "8px",
                        whiteSpace: "nowrap",
                        transform: report.clicksOverTime.length > 14 ? "rotate(-45deg)" : "none",
                        transformOrigin: "top left",
                      }}
                    >
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No visit data available for this range.</p>
        )}
      </div>

      {/* Breakdowns Grid (Devices, Browsers, Referrers) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Device Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Laptop size={16} color="var(--accent-primary)" />
            <span>Device Categories</span>
          </h3>

          {report && report.deviceBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {report.deviceBreakdown.map((dev) => (
                <div key={dev.name}>
                  <div className="flex justify-between" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span style={{ textTransform: "capitalize" }}>{dev.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {dev.count} ({dev.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${dev.percentage}%`, height: "100%", background: "var(--accent-gradient)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No device telemetry recorded yet.</p>
          )}
        </div>

        {/* Browser Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Monitor size={16} color="var(--accent-secondary)" />
            <span>Browser Families</span>
          </h3>

          {report && report.browserBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {report.browserBreakdown.map((b) => (
                <div key={b.name}>
                  <div className="flex justify-between" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span>{b.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {b.count} ({b.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${b.percentage}%`, height: "100%", backgroundColor: "var(--accent-secondary)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No browser telemetry recorded yet.</p>
          )}
        </div>

        {/* Top Referrers */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe size={16} color="#a78bfa" />
            <span>Top Traffic Sources</span>
          </h3>

          {report && report.referrerBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {report.referrerBreakdown.map((ref) => (
                <div key={ref.name}>
                  <div className="flex justify-between" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span className="truncate max-w-xs" title={ref.name}>{ref.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {ref.count} ({ref.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${ref.percentage}%`, height: "100%", backgroundColor: "#a78bfa" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No referrer telemetry recorded yet.</p>
          )}
        </div>
      </div>

      {/* Campaign Performance & Top Links Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
        {/* Campaign Performance */}
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
            Campaign Performance
          </h3>

          {report && report.campaignPerformance.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Links</th>
                    <th>Clicks</th>
                    <th>Top Link</th>
                  </tr>
                </thead>
                <tbody>
                  {report.campaignPerformance.map((camp) => (
                    <tr key={camp.id}>
                      <td style={{ fontWeight: 600 }}>{camp.name}</td>
                      <td>{camp.totalLinks}</td>
                      <td>
                        <span className="badge badge-count">{camp.totalClicks}</span>
                      </td>
                      <td>
                        {camp.topLink ? (
                          <span style={{ fontFamily: "monospace", color: "var(--accent-secondary)", fontSize: "0.85rem" }}>
                            /{camp.topLink.code} ({camp.topLink.clicks})
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No campaigns created yet. Create campaigns in the Dashboard to group your links.
            </p>
          )}
        </div>

        {/* Top Performing Links */}
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
            Top Performing Links
          </h3>

          {report && report.topLinks.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Short Code</th>
                    <th>Destination</th>
                    <th>Clicks</th>
                    <th>Uniques</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topLinks.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--accent-secondary)" }}>
                        /{l.code}
                      </td>
                      <td className="truncate max-w-xs" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {l.destinationUrl}
                      </td>
                      <td>
                        <span className="badge badge-count">{l.clicks}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {l.uniques}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No active links with traffic recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
