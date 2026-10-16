"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LinksTable, LinkItem } from "@/components/LinksTable";
import { Shield, Globe, MousePointerClick, ShieldCheck, RefreshCw, AlertTriangle, Users } from "lucide-react";
import Link from "next/link";

interface UserInfo {
  userId: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meData.user) {
        router.push("/login");
        return;
      }

      if (meData.user.role !== "ADMIN") {
        setForbidden(true);
        setLoading(false);
        return;
      }

      setUser(meData.user);

      // Fetch all system links
      const linksRes = await fetch("/api/links?scope=all");
      const linksData = await linksRes.json();
      setLinks(linksData.links || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "5rem", textAlign: "center" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Authenticating administrator privileges...
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container" style={{ maxWidth: "560px", paddingTop: "5rem", textAlign: "center" }}>
        <div className="card">
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--danger-bg)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <AlertTriangle size={28} color="var(--danger)" />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Access Restricted
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", marginBottom: "1.5rem" }}>
            This page is reserved for LinkPulse system administrators. Standard user accounts cannot
            inspect multi-tenant data.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Return to Personal Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalLinks = links.length;
  const totalClicks = links.reduce((acc, l) => acc + (l.clicksCount || 0), 0);
  const totalUniqueVisitors = links.reduce((acc, l) => acc + (l.uniqueVisitorsCount || 0), 0);
  const activeLinks = links.filter((l) => l.state === "active").length;
  const inactiveOrRestricted = links.filter((l) => l.state !== "active").length;

  return (
    <div className="container" style={{ paddingTop: "2.5rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-md)",
              background: "rgba(168, 85, 247, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(168, 85, 247, 0.3)",
            }}
          >
            <Shield size={24} color="#c084fc" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Administrator Console
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem" }}>
              Global oversight across all registered users, link moderation, and system telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            &larr; Back to My Links
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

      {/* Global Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">System Links</span>
            <Globe size={18} color="var(--accent-primary)" />
          </div>
          <div className="stat-value">{totalLinks}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-title">System Visits</span>
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
            {inactiveOrRestricted > 0 ? (
              <AlertTriangle size={18} color="var(--warning)" />
            ) : (
              <ShieldCheck size={18} color="var(--success)" />
            )}
          </div>
          <div className="stat-value" style={{ fontSize: "1.5rem", marginTop: "0.6rem" }}>
            <span style={{ color: "var(--success)" }}>{activeLinks} Active</span>
            {inactiveOrRestricted > 0 && (
              <span style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                ({inactiveOrRestricted} off/limited)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Admin Table of All Links */}
      <div style={{ marginTop: "1rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Global Link Directory</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Admins can edit rules, disable suspicious links, or restore inactive links at any time.
            Click history remains preserved.
          </p>
        </div>

        <LinksTable links={links} isAdminView={true} onRefresh={fetchAdminData} />
      </div>
    </div>
  );
}
