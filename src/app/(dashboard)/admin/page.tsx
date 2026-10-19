"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LinksTable, LinkItem } from "@/components/LinksTable";
import { LoadingScreen, clearLoadingStarted } from "@/components/LoadingScreen";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
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
  AlertCircle,
  CheckCircle,
  Search,
  X,
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pagination state for global link directory
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRegistryLinks, setTotalRegistryLinks] = useState(0);

  // New blocked domain form state
  const [newDomain, setNewDomain] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [domainSearchQuery, setDomainSearchQuery] = useState("");
  const [unblockConfirmItem, setUnblockConfirmItem] = useState<BlockedDomainItem | null>(null);

  useEffect(() => {
    document.title = "Admin Console | LinkPulse";
  }, []);

  const fetchAdminData = useCallback(
    async (isInitial = false, pageToFetch = currentPage) => {
      const startTime = Date.now();
      try {
        setFetchError(null);
        const offset = (pageToFetch - 1) * pageSize;
        // Parallelize all admin resources concurrently
        const [meRes, linksRes, blockedRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/links?scope=all&limit=${pageSize}&offset=${offset}`),
          fetch("/api/admin/blocked-domains"),
        ]);

        // Check for unauthenticated state first
        if (meRes.status === 401 || linksRes.status === 401 || blockedRes.status === 401) {
          router.push("/login");
          return;
        }

        const [meData, linksData, blockedData] = await Promise.all([
          meRes.json(),
          linksRes.json(),
          blockedRes.json(),
        ]);

        if (!meData.user) {
          router.push("/login");
          return;
        }

        if (meData.user.role !== "ADMIN") {
          setForbidden(true);
          clearLoadingStarted("admin");
          setInitialLoading(false);
          return;
        }

        if (!linksRes.ok || !blockedRes.ok) {
          throw new Error("Failed to load admin resources.");
        }

        // Smooth anti-flash minimum display time for initial load (320ms)
        if (isInitial) {
          const elapsed = Date.now() - startTime;
          if (elapsed < 320) {
            await new Promise((resolve) => setTimeout(resolve, 320 - elapsed));
          }
        }

        setUser(meData.user);
        setLinks(linksData.links || []);
        setTotalRegistryLinks(linksData.total !== undefined ? linksData.total : linksData.links?.length || 0);
        const domainList = blockedData.blockedDomains || blockedData.domains || [];
        setBlockedDomains(domainList);
        clearLoadingStarted("admin");
        setInitialLoading(false);
      } catch (err) {
        console.error("Admin fetch error:", err);
        if (isInitial) {
          setFetchError("Unable to authenticate administrator or load registry. Please retry.");
        }
      } finally {
        setRefreshing(false);
      }
    },
    [router, currentPage, pageSize]
  );

  useEffect(() => {
    fetchAdminData(true, currentPage);
  }, [fetchAdminData, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAdminData(false, currentPage);
  };

  const handleAddBlockedDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError(null);
    setDomainSuccess(null);

    if (!newDomain.trim()) {
      setDomainError("Please enter a domain to block (e.g. malicious-site.com).");
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
        const addedItem = data.blockedDomain;
        setDomainSuccess(`Domain "${addedItem.domain}" has been added to the blocklist.`);
        setNewDomain("");
        setNewReason("");
        // Directly update local state from mutation response without expensive full-registry refetch
        setBlockedDomains((prev) => [addedItem, ...prev.filter((d) => d.id !== addedItem.id)]);

        // Keep admin links table state accurate: reflect blocked domain on affected links
        const blockedHost = addedItem.domain.toLowerCase();
        setLinks((prev) =>
          prev.map((l) => {
            try {
              const url = new URL(l.destinationUrl);
              const host = url.hostname.toLowerCase();
              if (host === blockedHost || host.endsWith("." + blockedHost)) {
                return {
                  ...l,
                  state: "disabled" as const,
                  disabledReason: `Blocked domain: ${addedItem.domain}`,
                };
              }
            } catch {}
            return l;
          })
        );
      }
    } catch {
      setDomainError("Network error while adding blocked domain.");
    } finally {
      setAddingDomain(false);
    }
  };

  const promptRemoveBlockedDomain = (item: BlockedDomainItem) => {
    setUnblockConfirmItem(item);
  };

  const executeRemoveBlockedDomain = async (itemToDelete: BlockedDomainItem) => {
    const { id, domain } = itemToDelete;

    // Optimistic immediate removal from list (0ms perceived latency)
    setBlockedDomains((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(id);

    // Re-activate links that were disabled specifically due to this blocked domain
    setLinks((prev) =>
      prev.map((l) => {
        if (l.disabledReason === `Blocked domain: ${domain}`) {
          return {
            ...l,
            state: "active" as const,
            disabledReason: null,
          };
        }
        return l;
      })
    );

    try {
      const res = await fetch(`/api/admin/blocked-domains/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Rollback on failure
        setBlockedDomains((prev) => [itemToDelete, ...prev]);
        const data = await res.json();
        toast.error(data.error || "Failed to remove domain from blocklist.");
      } else {
        toast.success(`Domain "${domain}" unblocked.`);
      }
    } catch {
      // Rollback on network error
      setBlockedDomains((prev) => [itemToDelete, ...prev]);
      toast.error("Network error while removing blocked domain.");
    } finally {
      setDeletingId(null);
    }
  };

  if (initialLoading) {
    return (
      <LoadingScreen
        pageName="admin"
        error={fetchError}
        onRetry={() => {
          setFetchError(null);
          setInitialLoading(true);
          fetchAdminData(true);
        }}
      />
    );
  }

  if (forbidden) {
    return (
      <div className="container container-wide" style={{ maxWidth: "560px", paddingTop: "5rem", textAlign: "center" }}>
        <div className="card">
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "var(--color-coral-light)",
              border: "2px solid var(--color-ink)",
              boxShadow: "var(--shadow-hard-sm)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <ShieldAlert size={28} style={{ color: "var(--color-ink)" }} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
            Access Restricted
          </h1>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            This page is reserved for LinkPulse system administrators. Standard user accounts cannot
            inspect all links or manage the platform blocklist.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Return to Personal Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalLinks = totalRegistryLinks || links.length;
  const totalClicks = links.reduce((sum, l) => sum + l.clicksCount, 0);
  const activeLinks = links.filter((l) => l.state === "active").length;
  const inactiveOrRestricted = totalLinks - activeLinks;

  return (
    <div className="container container-wide" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Top Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: "0.4rem" }}>
            <span className="badge badge-admin">ADMIN</span>
            <span style={{ color: "var(--color-ink-muted)", fontSize: "0.875rem", fontWeight: 600 }}>({user?.email})</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.02em", fontFamily: "var(--font-display)", marginBottom: "0.2rem" }}>
            Admin
          </h1>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
            Manage links and blocked domains across all accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px" }}>
            &larr; Personal Dashboard
          </Link>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn btn-secondary btn-sm flex items-center gap-2"
            disabled={refreshing}
            style={{ minHeight: "44px" }}
            aria-label="Refresh admin data"
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-card-teal">
          <div className="flex items-center justify-between">
            <span className="stat-title">System Links</span>
            <div className="icon-chip icon-chip-blue">
              <Globe size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{totalLinks}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Across all accounts
          </span>
        </div>

        <div className="stat-card stat-card-butter">
          <div className="flex items-center justify-between">
            <span className="stat-title">System Visits</span>
            <div className="icon-chip icon-chip-coral">
              <MousePointerClick size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{totalClicks.toLocaleString()}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Total platform redirects
          </span>
        </div>

        <div className="stat-card stat-card-coral">
          <div className="flex items-center justify-between">
            <span className="stat-title">Blocked Domains</span>
            <div className="icon-chip icon-chip-paper">
              <Ban size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
          </div>
          <div className="stat-value">{blockedDomains.length}</div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            Active security filters
          </span>
        </div>

        <div className={`stat-card ${inactiveOrRestricted > 0 ? "stat-card-coral" : "stat-card-sage"}`}>
          <div className="flex items-center justify-between">
            <span className="stat-title">Active vs Restricted</span>
            <div className={`icon-chip ${inactiveOrRestricted > 0 ? "icon-chip-yellow" : "icon-chip-green"}`}>
              {inactiveOrRestricted > 0 ? (
                <AlertTriangle size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
              ) : (
                <ShieldCheck size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
              )}
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: "1.75rem", marginTop: "0.4rem" }}>
            <span>{activeLinks} Active</span>
          </div>
          <span style={{ fontSize: "0.825rem", color: "var(--color-ink-muted)", marginTop: "0.35rem", display: "block", fontWeight: 600 }}>
            {inactiveOrRestricted > 0 ? `${inactiveOrRestricted} off or restricted` : "All operational"}
          </span>
        </div>
      </div>

      {/* Admin Domain Blocklist Management Section */}
      <div className="card" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: "0.35rem" }} className="flex items-center gap-2">
            <span className="icon-chip icon-chip-coral">
              <Ban size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>Domain Blocklist</span>
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--color-ink-muted)", margin: 0 }}>
            Domains added here are blocked across the entire platform. Subdomains are automatically blocked
            (e.g., blocking <code className="code-badge">example.com</code> also blocks <code className="code-badge">sub.example.com</code>). Enforced at link creation,
            editing, bulk import, and immediately on redirects.
          </p>
        </div>

        {/* Add Domain Form */}
        <form onSubmit={handleAddBlockedDomain} style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="domainInput">
                Domain Name <span style={{ color: "var(--color-text-danger)" }}>*</span>
              </label>
              <input
                id="domainInput"
                type="text"
                className="form-input"
                placeholder="malicious-site.com or https://evil.com"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  if (domainError) setDomainError(null);
                }}
                disabled={addingDomain}
                style={{ minHeight: "44px" }}
                aria-describedby="domainHint domainErrorText"
                aria-invalid={Boolean(domainError)}
              />
              <span id="domainHint" className="form-hint">
                Enter a domain or hostname (e.g. malicious-site.com). Subdomains are automatically covered.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="reasonInput">
                Optional Reason <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(Policy note)</span>
              </label>
              <input
                id="reasonInput"
                type="text"
                className="form-input"
                placeholder="Phishing, spam, or malware site"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                disabled={addingDomain}
                style={{ minHeight: "44px" }}
              />
              <span className="form-hint">Visible to other administrators in the registry</span>
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary flex items-center justify-center gap-2"
                disabled={addingDomain}
                aria-busy={addingDomain}
                style={{ width: "100%", minHeight: "44px" }}
              >
                {addingDomain ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Adding to Blocklist...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Add Blocked Domain</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {domainError && (
            <div id="domainErrorText" className="alert alert-error" role="alert" style={{ marginTop: "1rem" }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{domainError}</span>
            </div>
          )}

          {domainSuccess && (
            <div className="alert alert-success" role="status" style={{ marginTop: "1rem" }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{domainSuccess}</span>
            </div>
          )}
        </form>

        {/* Blocked Domains Table with Live Search Filter */}
        {blockedDomains.length > 0 ? (
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ position: "relative", minWidth: "240px", maxWidth: "340px", flex: "1 1 auto" }}>
                <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Filter blocked domains..."
                  value={domainSearchQuery}
                  onChange={(e) => setDomainSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "2.35rem", paddingRight: "2rem", minHeight: "38px", fontSize: "0.85rem" }}
                  aria-label="Filter blocked domains"
                />
                {domainSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDomainSearchQuery("")}
                    style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}
                    aria-label="Clear filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <span style={{ fontSize: "0.825rem", color: "var(--color-muted)", fontWeight: 700 }}>
                Showing {blockedDomains.filter((d) => !domainSearchQuery.trim() || d.domain.toLowerCase().includes(domainSearchQuery.toLowerCase()) || (d.reason && d.reason.toLowerCase().includes(domainSearchQuery.toLowerCase()))).length} of {blockedDomains.length} blocked domains
              </span>
            </div>

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
                  {blockedDomains
                    .filter((d) => !domainSearchQuery.trim() || d.domain.toLowerCase().includes(domainSearchQuery.toLowerCase()) || (d.reason && d.reason.toLowerCase().includes(domainSearchQuery.toLowerCase())))
                    .map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, fontFamily: "var(--font-mono-family)" }}>
                          <code className="code-badge">{item.domain}</code>
                        </td>
                        <td>
                          <span className="badge badge-expired" style={{ fontSize: "0.75rem" }}>
                            Blocks *.{item.domain}
                          </span>
                        </td>
                        <td style={{ color: "var(--color-ink)", fontSize: "0.9rem", fontWeight: 500 }}>
                          {item.reason || "—"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--color-ink-muted)", fontWeight: 600 }}>
                          {item.createdBy?.email || "Admin"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--color-ink-muted)", fontWeight: 600 }}>
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => promptRemoveBlockedDomain(item)}
                            disabled={deletingId === item.id}
                            className="btn btn-danger btn-sm"
                            title="Remove domain from blocklist"
                            aria-label={`Unblock domain ${item.domain}`}
                          >
                            <Trash2 size={13} strokeWidth={2.5} />
                            <span>Unblock</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem", margin: 0, fontStyle: "italic" }}>
            No domains currently blocked. LinkPulse will allow redirects to any valid HTTP/HTTPS domain.
          </p>
        )}
      </div>

      {/* Admin Table of All Links */}
      <div style={{ marginTop: "2.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>
            Global Link Directory
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--color-ink-muted)" }}>
            Admins can edit rules, disable links, or check visit stats across all accounts.
            Click history remains preserved.
          </p>
        </div>

        <LinksTable
          links={links}
          isAdminView={true}
          onRefresh={() => fetchAdminData(false, currentPage)}
          loading={refreshing}
          pagination={{
            page: currentPage,
            pageSize,
            total: totalRegistryLinks,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {unblockConfirmItem && (
        <ConfirmDialog
          isOpen={true}
          title="Unblock Domain"
          message={`Are you sure you want to unblock "${unblockConfirmItem.domain}"? Links targeting this domain will resume redirecting.`}
          confirmLabel="Unblock domain"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={async () => {
            const item = unblockConfirmItem;
            setUnblockConfirmItem(null);
            await executeRemoveBlockedDomain(item);
          }}
          onCancel={() => setUnblockConfirmItem(null)}
        />
      )}
    </div>
  );
}
