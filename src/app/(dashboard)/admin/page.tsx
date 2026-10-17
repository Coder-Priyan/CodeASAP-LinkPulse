"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LinksTable, LinkItem } from "@/components/LinksTable";
import {
  Shield,
  Globe,
  MousePointerClick,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Users,
  Ban,
  Trash2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

interface UserInfo {
  userId: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

interface BlockedDomainItem {
  id: string;
  domain: string;
  reason: string | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New blocked domain form state
  const [newDomain, setNewDomain] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      // Fetch all system links and blocked domains concurrently
      const [linksRes, blockedRes] = await Promise.all([
        fetch("/api/links?scope=all"),
        fetch("/api/admin/blocked-domains"),
      ]);

      const [linksData, blockedData] = await Promise.all([
        linksRes.json(),
        blockedRes.json(),
      ]);

      setLinks(linksData.links || []);
      const domainList = blockedData.blockedDomains || blockedData.domains || [];
      setBlockedDomains(domainList);
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

  const handleAddBlockedDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError(null);
    setDomainSuccess(null);

    if (!newDomain.trim()) {
      setDomainError("Please enter a domain to block.");
      return;
    }

    setAddingDomain(true);
    try {
      const res = await fetch("/api/admin/blocked-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newDomain.trim(),
          reason: newReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Failed to block domain.");
      } else {
        setDomainSuccess(`Domain "${data.blockedDomain.domain}" has been added to the blocklist.`);
        setNewDomain("");
        setNewReason("");
        await fetchAdminData();
      }
    } catch {
      setDomainError("Network error while adding blocked domain.");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleRemoveBlockedDomain = async (id: string, domain: string) => {
    if (!confirm(`Are you sure you want to unblock "${domain}"? Links targeting this domain will resume redirecting.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blocked-domains/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to remove domain from blocklist.");
      } else {
        await fetchAdminData();
      }
    } catch {
      alert("Network error while removing blocked domain.");
    } finally {
      setDeletingId(null);
    }
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
            inspect multi-tenant data or manage the blocklist.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Return to Personal Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, l) => sum + l.clicksCount, 0);
  const totalUniqueVisitors = links.reduce((sum, l) => sum + l.uniqueVisitorsCount, 0);
  const activeLinks = links.filter((l) => l.state === "active").length;
  const inactiveOrRestricted = totalLinks - activeLinks;

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Top Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: "0.4rem" }}>
            <span className="badge badge-admin">SYSTEM ADMINISTRATOR</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>({user?.email})</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Admin Security & Governance
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Global link administration, domain safety blocklist, and tenant governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            &larr; Personal Dashboard
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
            <span className="stat-title">Blocked Domains</span>
            <Ban size={18} color="var(--danger)" />
          </div>
          <div className="stat-value">{blockedDomains.length}</div>
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

      {/* Admin Domain Blocklist Management Section */}
      <div className="card" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }} className="flex items-center gap-2">
            <Ban size={20} color="var(--danger)" />
            <span>Domain Blocklist</span>
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Domains added here are blocked across the entire platform. Subdomains are automatically blocked
            (e.g., blocking <code>example.com</code> blocks <code>sub.example.com</code>). Enforced at link creation,
            editing, bulk import, and immediately on existing link redirects.
          </p>
        </div>

        {/* Add Domain Form */}
        <form onSubmit={handleAddBlockedDomain} style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="domainInput">
                Domain Name (e.g. malicious-site.com)
              </label>
              <input
                id="domainInput"
                type="text"
                className="form-input"
                placeholder="malicious-site.com or https://evil.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                disabled={addingDomain}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="reasonInput">
                Optional Reason
              </label>
              <input
                id="reasonInput"
                type="text"
                className="form-input"
                placeholder="Phishing, spam, or malware site"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                disabled={addingDomain}
              />
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary flex items-center gap-2"
                disabled={addingDomain}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Plus size={16} />
                <span>{addingDomain ? "Adding..." : "Add Blocked Domain"}</span>
              </button>
            </div>
          </div>

          {domainError && (
            <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
              {domainError}
            </div>
          )}

          {domainSuccess && (
            <div style={{ color: "var(--success)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
              {domainSuccess}
            </div>
          )}
        </form>

        {/* Blocked Domains Table */}
        {blockedDomains.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Subdomain Rule</th>
                  <th>Reason</th>
                  <th>Added By</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {blockedDomains.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, fontFamily: "monospace" }}>
                      {item.domain}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: "0.75rem" }}>
                        Blocks *.{item.domain}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {item.reason || "—"}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {item.createdBy?.email || "Admin"}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleRemoveBlockedDomain(item.id, item.domain)}
                        disabled={deletingId === item.id}
                        className="btn btn-danger btn-sm"
                        title="Remove domain from blocklist"
                      >
                        <Trash2 size={13} />
                        <span>Unblock</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            No domains currently blocked. LinkPulse will allow redirects to any valid HTTP/HTTPS domain.
          </p>
        )}
      </div>

      {/* Admin Table of All Links */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Global Link Directory</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Admins can edit rules, disable suspicious links, or inspect QR scan telemetry across all tenants.
            Click history remains preserved.
          </p>
        </div>

        <LinksTable links={links} isAdminView={true} onRefresh={fetchAdminData} />
      </div>
    </div>
  );
}
