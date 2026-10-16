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

  const fetchUserData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meData.user) {
        router.push("/login");
        return;
      }

      setUser(meData.user);

      // Fetch user campaigns & tags for filter dropdowns
      const [campRes, tagRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/tags"),
      ]);
      const [campData, tagData] = await Promise.all([
        campRes.json(),
        tagRes.json(),
      ]);
      setCampaigns(campData.campaigns || []);
      setTags(tagData.tags || []);

      // Fetch filtered user links
      const params = new URLSearchParams();
      if (filterCampaignId) params.set("campaignId", filterCampaignId);
      if (filterTagId) params.set("tagId", filterTagId);

      const linksRes = await fetch(`/api/links?${params.toString()}`);
      const linksData = await linksRes.json();
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

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "5rem", textAlign: "center" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Loading your LinkPulse dashboard...
        </div>
      </div>
    );
  }

  const totalLinks = links.length;
  const totalClicks = links.reduce((acc, l) => acc + (l.clicksCount || 0), 0);
  const totalUniqueVisitors = links.reduce((acc, l) => acc + (l.uniqueVisitorsCount || 0), 0);
  const activeLinks = links.filter((l) => l.state === "active").length;
  const attentionLinks = links.filter((l) => l.state !== "active").length;

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Workspace Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", marginTop: "0.25rem" }}>
            Manage shortened links, custom aliases, redirect rules, and bot-filtered analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/analytics" className="btn btn-secondary btn-sm flex items-center gap-2">
            <BarChart3 size={15} color="var(--accent-secondary)" />
            <span>Open Analytics Dashboard</span>
          </Link>

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

      {/* Admin Notice Banner if Admin */}
      {user?.role === "ADMIN" && (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            background: "rgba(168, 85, 247, 0.08)",
            borderColor: "rgba(168, 85, 247, 0.25)",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} color="#c084fc" />
            <div>
              <strong style={{ color: "#e9d5ff", fontSize: "0.95rem" }}>Administrator Access</strong>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                You have system administrator permissions. Switch to the Admin Console to view all user links.
              </p>
            </div>
          </div>
          <Link href="/admin" className="btn btn-secondary btn-sm" style={{ borderColor: "#c084fc" }}>
            Open Admin Console &rarr;
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">My Links</span>
            <Link2 size={18} color="var(--accent-primary)" />
          </div>
          <div className="stat-value">{totalLinks}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Total Visits</span>
            <MousePointerClick size={18} color="var(--accent-secondary)" />
          </div>
          <div className="stat-value">{totalClicks}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Unique Visitors</span>
            <Users size={18} color="#a78bfa" />
          </div>
          <div className="stat-value">{totalUniqueVisitors}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">Active vs Restricted</span>
            {attentionLinks > 0 ? (
              <AlertTriangle size={18} color="var(--warning)" />
            ) : (
              <CheckCircle size={18} color="var(--success)" />
            )}
          </div>
          <div className="stat-value" style={{ fontSize: "1.5rem", marginTop: "0.6rem" }}>
            <span style={{ color: "var(--success)" }}>{activeLinks} Active</span>
            {attentionLinks > 0 && (
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                ({attentionLinks} off/limited)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two-Step Shorten Form */}
      <LinkCreateForm onSuccess={fetchUserData} />

      {/* Links List with Filters */}
      <div style={{ marginTop: "2rem" }}>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>My Shortened Links</h2>

          {/* Filter Bar: Campaigns & Tags */}
          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            <div className="flex items-center gap-1">
              <Layers size={14} color="var(--text-muted)" />
              <select
                value={filterCampaignId}
                onChange={(e) => setFilterCampaignId(e.target.value)}
                className="form-input"
                style={{ width: "auto", padding: "0.35rem 0.65rem", fontSize: "0.825rem" }}
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
              <TagIcon size={14} color="var(--text-muted)" />
              <select
                value={filterTagId}
                onChange={(e) => setFilterTagId(e.target.value)}
                className="form-input"
                style={{ width: "auto", padding: "0.35rem 0.65rem", fontSize: "0.825rem" }}
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
                onClick={clearFilters}
                className="btn btn-secondary btn-sm flex items-center gap-1"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                title="Clear filters"
              >
                <X size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <LinksTable links={links} onRefresh={fetchUserData} />
      </div>
    </div>
  );
}
