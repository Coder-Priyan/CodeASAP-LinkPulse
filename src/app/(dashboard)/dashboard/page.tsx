"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LinkCreateForm } from "@/components/LinkCreateForm";
import { LinksTable, LinkItem } from "@/components/LinksTable";
import {
  Link2,
  MousePointerClick,
  CheckCircle,
  ShieldAlert,
  RefreshCw,
  Users,
  AlertTriangle,
  Layers,
  Tag as TagIcon,
  X,
  BarChart3,
  Upload,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface UserInfo {
  userId: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

interface CampaignOption {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [filterCampaignId, setFilterCampaignId] = useState<string>("");
  const [filterTagId, setFilterTagId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = "Dashboard | LinkPulse";
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCampaignId) params.set("campaignId", filterCampaignId);
      if (filterTagId) params.set("tagId", filterTagId);

      // Fetch user profile, campaigns, tags, and links concurrently in a single parallel network round
      const [meRes, campRes, tagRes, linksRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/campaigns"),
        fetch("/api/tags"),
        fetch(`/api/links?${params.toString()}`),
      ]);

      if (meRes.status === 401) {
        router.push("/login");
        return;
      }

      const [meData, campData, tagData, linksData] = await Promise.all([
        meRes.json(),
        campRes.json(),
        tagRes.json(),
        linksRes.json(),
      ]);

      if (!meData.user) {
        router.push("/login");
        return;
      }

      setUser(meData.user);
      setCampaigns(campData.campaigns || []);
      setTags(tagData.tags || []);
      setLinks(linksData.links || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, filterCampaignId, filterTagId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const clearFilters = () => {
    setFilterCampaignId("");
    setFilterTagId("");
  };

  const totalLinks = links.length;
  const totalClicks = links.reduce((acc, l) => acc + (l.clicksCount || 0), 0);
  const totalUniqueVisitors = links.reduce((acc, l) => acc + (l.uniqueVisitorsCount || 0), 0);
  const activeLinks = links.filter((l) => l.state === "active").length;
  const attentionLinks = links.filter((l) => l.state !== "active").length;

  return (
    <div className="container-wide" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      {loading && <div className="sr-only" aria-live="polite">Loading dashboard links and metrics...</div>}
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", letterSpacing: "0.01em" }}>
            Dashboard
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.975rem", marginTop: "0.25rem", fontWeight: 600 }}>
            Manage shortened links, custom aliases, redirect rules, and clean analytics.
          </p>
        </div>

        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <Link href="/import" className="btn btn-secondary btn-sm flex items-center gap-2">
            <Upload size={16} />
            <span>Bulk Import (CSV)</span>
          </Link>

          <Link href="/analytics" className="btn btn-secondary btn-sm flex items-center gap-2">
            <BarChart3 size={16} />
            <span>Analytics</span>
          </Link>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn btn-secondary btn-sm flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Admin Notice Banner if Admin */}
      {user?.role === "ADMIN" && (
        <div
          className="card card-yellow"
          style={{
            marginBottom: "1.75rem",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="icon-chip icon-chip-paper">
              <ShieldAlert size={18} strokeWidth={2.5} />
            </div>
            <div>
              <strong style={{ fontSize: "1rem" }}>Administrator Account</strong>
              <p style={{ color: "var(--color-ink)", fontSize: "0.9rem", marginTop: "0.15rem" }}>
                You have system administrator permissions. Switch to the Admin Console to view all user links.
              </p>
            </div>
          </div>
          <Link href="/admin" className="btn btn-secondary btn-sm">
            <span>Admin Console &rarr;</span>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card stat-card-teal">
          <div className="flex items-center justify-between">
            <span className="stat-title">My Links</span>
            <div className="icon-chip icon-chip-blue">
              <Link2 size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="stat-value">{loading ? <div className="skeleton-stat-num" /> : totalLinks}</div>
        </div>

        <div className="stat-card stat-card-butter">
          <div className="flex items-center justify-between">
            <span className="stat-title">Total Visits</span>
            <div className="icon-chip icon-chip-paper">
              <MousePointerClick size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="stat-value">{loading ? <div className="skeleton-stat-num" /> : totalClicks.toLocaleString()}</div>
        </div>

        <div className="stat-card stat-card-sage">
          <div className="flex items-center justify-between">
            <span className="stat-title">Unique Visitors</span>
            <div className="icon-chip icon-chip-yellow">
              <Users size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="stat-value">{loading ? <div className="skeleton-stat-num" /> : totalUniqueVisitors.toLocaleString()}</div>
        </div>

        <div className={`stat-card ${attentionLinks > 0 ? "stat-card-coral" : "stat-card-sage"}`}>
          <div className="flex items-center justify-between">
            <span className="stat-title">Active Status</span>
            {attentionLinks > 0 ? (
              <div className="icon-chip icon-chip-coral">
                <AlertTriangle size={16} strokeWidth={2.5} />
              </div>
            ) : (
              <div className="icon-chip icon-chip-green">
                <CheckCircle size={16} strokeWidth={2.5} />
              </div>
            )}
          </div>
          <div className="stat-value" style={{ fontSize: "1.65rem", marginTop: "0.5rem" }}>
            {loading ? (
              <div className="skeleton-stat-num" />
            ) : (
              <>
                <span>{activeLinks} Active</span>
                {attentionLinks > 0 && (
                  <span style={{ fontSize: "0.95rem", color: "var(--color-muted)", marginLeft: "0.5rem", fontFamily: "var(--font-sans-family)", fontWeight: 700 }}>
                    ({attentionLinks} off/limited)
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-Step Shorten Form */}
      <LinkCreateForm onSuccess={fetchUserData} />

      {/* Desktop Keyboard Pro-Tip */}
      {totalLinks > 0 && (
        <div className="desktop-pro-tip">
          <Sparkles size={16} style={{ color: "var(--color-blue)", flexShrink: 0 }} />
          <span>
            <strong>Desktop shortcut:</strong> Press <kbd className="kbd-shortcut">Ctrl+K</kbd> or <kbd className="kbd-shortcut">/</kbd> anywhere to search and filter links instantly by code, destination, or tag.
          </span>
        </div>
      )}

      {/* Links List with Filters */}
      <div style={{ marginTop: "1rem" }}>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}
        >
          <h2 style={{ fontSize: "1.5rem" }}>My Shortened Links</h2>

          {/* Filter Bar: Campaigns & Tags */}
          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            <div className="flex items-center gap-1">
              <Layers size={16} />
              <select
                value={filterCampaignId}
                onChange={(e) => setFilterCampaignId(e.target.value)}
                className="form-input"
                style={{ width: "auto", minHeight: "44px", padding: "0.4rem 0.85rem", fontSize: "0.9rem" }}
                aria-label="Filter by Campaign"
              >
                <option value="">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <TagIcon size={16} />
              <select
                value={filterTagId}
                onChange={(e) => setFilterTagId(e.target.value)}
                className="form-input"
                style={{ width: "auto", minHeight: "44px", padding: "0.4rem 0.85rem", fontSize: "0.9rem" }}
                aria-label="Filter by Tag"
              >
                <option value="">All Tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.name}
                  </option>
                ))}
              </select>
            </div>

            {(filterCampaignId || filterTagId) && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-secondary btn-sm flex items-center gap-1"
                title="Clear filters"
              >
                <X size={15} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <LinksTable links={links} onRefresh={fetchUserData} loading={loading} />
      </div>
    </div>
  );
}
