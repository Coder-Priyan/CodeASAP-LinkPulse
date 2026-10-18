"use client";

import { useState, useRef, useEffect } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Power,
  Trash2,
  ArrowUpRight,
  Sliders,
  Clock,
  Gauge,
  Lock,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart2,
  X,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { EditLinkModal } from "./EditLinkModal";
import { QrModal } from "./QrModal";
import { PulseMascot } from "./PulseMascot";
import { buildShortUrl } from "@/lib/utils/short-url";

export type ComputedLinkState = "active" | "expired" | "limit_reached" | "disabled";

export interface LinkItem {
  id: string;
  code: string;
  destinationUrl: string;
  title?: string | null;
  isActive: boolean;
  disabledReason?: string | null;
  expiresAt?: string | null;
  clickLimit?: number | null;
  hasPassword?: boolean;
  state: ComputedLinkState;
  createdAt: string;
  clicksCount: number;
  qrScansCount?: number;
  uniqueVisitorsCount: number;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  tags?: { id: string; name: string; color: string | null }[];
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: "USER" | "ADMIN";
  };
}

interface LinksTableProps {
  links: LinkItem[];
  isAdminView?: boolean;
  onRefresh: () => void;
  loading?: boolean;
}

export function LinksTable({ links, isAdminView = false, onRefresh, loading = false }: LinksTableProps) {
  const [displayLinks, setDisplayLinks] = useState<LinkItem[]>(links);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes into displayLinks while preserving optimistic updates
  useEffect(() => {
    setDisplayLinks(links);
  }, [links]);

  // Keyboard shortcut listener: press Ctrl+K / Cmd+K or '/' to focus search, Esc to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey;

      if (isCtrlK) {
        e.preventDefault();
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const targetEl = e.target as HTMLElement | null;
      const el = activeEl || targetEl;

      const isEditable = Boolean(
        el && (
          ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
          el.isContentEditable ||
          el.getAttribute("contenteditable") === "true" ||
          el.closest("[contenteditable='true']") !== null ||
          el.closest("[role='dialog']") !== null
        )
      );

      if (isEditable) {
        // Do not steal focus from form fields, editors, or open modals
        return;
      }

      if (isCtrlK || isSlash) {
        if (isSlash) e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2400);
  };

  const getFullShortUrl = (code: string) => buildShortUrl(code);

  const handleCopy = (id: string, code: string) => {
    const url = getFullShortUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast(`Copied short link to clipboard: ${url}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const handleToggleStatus = async (link: LinkItem) => {
    const originalStatus = link.isActive;
    const newStatus = !originalStatus;
    const originalState = link.state;
    const newState = newStatus ? "active" : "disabled";

    // 1. Optimistic immediate update (0ms perceived latency)
    setDisplayLinks((prev) =>
      prev.map((l) =>
        l.id === link.id ? { ...l, isActive: newStatus, state: newState } : l
      )
    );
    setActionLoadingId(link.id);

    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: newStatus,
          reason: newStatus ? null : "Manually deactivated via dashboard",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Rollback on failure
        setDisplayLinks((prev) =>
          prev.map((l) =>
            l.id === link.id ? { ...l, isActive: originalStatus, state: originalState } : l
          )
        );
        alert(data.error || "Failed to update link status");
      } else {
        showToast(`Route /${link.code} is now ${newStatus ? "active" : "disabled"}.`);
      }
    } catch {
      // Rollback on network error
      setDisplayLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, isActive: originalStatus, state: originalState } : l
        )
      );
      alert("Error connecting to server.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link? All associated click logs will also be permanently deleted.")) {
      return;
    }

    const itemToDelete = displayLinks.find((l) => l.id === linkId);
    if (!itemToDelete) return;

    // 1. Optimistic immediate removal (0ms perceived latency)
    setDisplayLinks((prev) => prev.filter((l) => l.id !== linkId));
    setActionLoadingId(linkId);

    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        // Rollback on failure
        setDisplayLinks((prev) => [itemToDelete, ...prev]);
        alert(data.error || "Failed to delete link.");
      } else {
        showToast("Link successfully deleted.");
      }
    } catch {
      // Rollback on network error
      setDisplayLinks((prev) => [itemToDelete, ...prev]);
      alert("Error connecting to server.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStateBadge = (state: ComputedLinkState) => {
    switch (state) {
      case "active":
        return (
          <span className="badge badge-active flex items-center gap-1">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            <span>Active</span>
          </span>
        );
      case "expired":
        return (
          <span className="badge badge-expired flex items-center gap-1">
            <Clock size={13} strokeWidth={2.5} />
            <span>Expired</span>
          </span>
        );
      case "limit_reached":
        return (
          <span className="badge badge-limit-reached flex items-center gap-1">
            <Gauge size={13} strokeWidth={2.5} />
            <span>Limit Reached</span>
          </span>
        );
      case "disabled":
        return (
          <span className="badge badge-disabled flex items-center gap-1">
            <Power size={13} strokeWidth={2.5} />
            <span>Disabled</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-paper flex items-center gap-1">
            <span>Unknown</span>
          </span>
        );
    }
  };

  // Filter links client-side for instant keyboard search using displayLinks (reflects optimistic updates)
  const filteredLinks = displayLinks.filter((link) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchCode = link.code.toLowerCase().includes(q);
    const matchDest = link.destinationUrl.toLowerCase().includes(q);
    const matchTitle = link.title ? link.title.toLowerCase().includes(q) : false;
    const matchTag = link.tags ? link.tags.some((t) => t.name.toLowerCase().includes(q)) : false;
    const matchCampaign = link.campaign ? link.campaign.name.toLowerCase().includes(q) : false;
    return matchCode || matchDest || matchTitle || matchTag || matchCampaign;
  });

  if (loading) {
    return (
      <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center", backgroundColor: "var(--color-white)" }}>
        <div className="sr-only" aria-live="polite">Loading links...</div>
        <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.75rem", color: "var(--color-blue)" }} />
        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem", fontWeight: 600 }}>
          Loading link list...
        </p>
      </div>
    );
  }

  if (displayLinks.length === 0) {
    return (
      <div className="card" style={{ padding: "3rem 2rem", textAlign: "center", backgroundColor: "var(--color-white)" }}>
        <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <PulseMascot mood="happy" size={130} />
        </div>
        <h3 style={{ fontSize: "1.75rem", fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>
          {isAdminView ? "System Link Directory is Empty" : "Welcome to your Link Cockpit"}
        </h3>
        <p style={{ color: "var(--color-muted)", fontSize: "1.05rem", maxWidth: "540px", margin: "0 auto 1.75rem", fontWeight: 600 }}>
          {isAdminView
            ? "No links have been registered by any user in the database yet."
            : "Shorten long URLs with custom aliases, track real visitor clicks, and generate print-ready QR codes."}
        </p>

        {!isAdminView && (
          <div className="onboarding-grid" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "left" }}>
            <div className="onboarding-item">
              <div className="flex items-center gap-2">
                <span className="onboarding-num">1</span>
                <strong style={{ fontSize: "0.95rem" }}>Paste & Shorten</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: 0 }}>
                Use the form above to turn any long destination link into a clean slug or memorable alias.
              </p>
            </div>
            <div className="onboarding-item">
              <div className="flex items-center gap-2">
                <span className="onboarding-num">2</span>
                <strong style={{ fontSize: "0.95rem" }}>Grab QR Code</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: 0 }}>
                Download vector SVG or PNG QR codes with automatic physical scan attribution tags.
              </p>
            </div>
            <div className="onboarding-item">
              <div className="flex items-center gap-2">
                <span className="onboarding-num">3</span>
                <strong style={{ fontSize: "0.95rem" }}>Numbers &amp; Stats</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: 0 }}>
                Track visits, unique guests, browsers, devices, and referrers in real time.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Accessible Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        {toastMessage}
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-notification" role="status">
          <CheckCircle2 size={18} strokeWidth={2.5} style={{ color: "var(--color-blue)" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop Quick-Search Toolbar */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}
      >
        <div
          className="flex items-center"
          style={{ position: "relative", minWidth: "260px", maxWidth: "420px", flex: "1 1 auto" }}
        >
          <Search
            size={16}
            style={{ position: "absolute", left: "0.85rem", color: "var(--color-muted)", pointerEvents: "none" }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search links (Ctrl+K or /)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: "2.35rem",
              paddingRight: "5rem",
              minHeight: "42px",
              fontSize: "0.875rem",
              width: "100%",
            }}
            aria-label="Filter links by keyword"
          />
          <div style={{ position: "absolute", right: "0.6rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.15rem 0.45rem", fontSize: "0.75rem", minHeight: "auto" }}
                aria-label="Clear search query"
              >
                <X size={12} />
              </button>
            ) : (
              <>
                <kbd className="kbd-shortcut" title="Press Ctrl+K to search">
                  Ctrl+K
                </kbd>
                <kbd className="kbd-shortcut" title="Or press / to search">
                  /
                </kbd>
              </>
            )}
          </div>
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", fontWeight: 700 }}>
          Showing {filteredLinks.length} of {links.length} {links.length === 1 ? "link" : "links"}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
            >
              Reset Search
            </button>
          )}
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center", backgroundColor: "var(--color-white)" }}>
          <h4 style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>No matching links found</h4>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            No links matched your search &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="btn btn-secondary btn-sm"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "42px" }} aria-label="Expand row details" />
                <th>Short Link</th>
                <th>Destination URL</th>
                {isAdminView && <th>Creator</th>}
                <th>Visits & Uniques</th>
                <th>Rules</th>
                <th>State</th>
                <th className="col-sticky-actions" style={{ textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.map((link) => {
                const shortUrl = getFullShortUrl(link.code);
                const isCopied = copiedId === link.id;
                const isLoading = actionLoadingId === link.id;
                const isExpanded = expandedRowId === link.id;

                // Telemetry metrics
                const totalClicks = link.clicksCount || 0;
                const qrScans = link.qrScansCount || 0;
                const directClicks = Math.max(0, totalClicks - qrScans);
                const qrScansPct = totalClicks > 0 ? Math.round((qrScans / totalClicks) * 100) : 0;
                const directClicksPct = totalClicks > 0 ? 100 - qrScansPct : 100;

                return (
                  <tr key={link.id} className={isExpanded ? "row-expanded" : undefined}>
                    {/* Expand/Collapse Chevron */}
                    <td style={{ textAlign: "center", paddingRight: 0 }}>
                      <button
                        type="button"
                        onClick={() => toggleRowExpand(link.id)}
                        className="btn btn-secondary btn-sm table-icon-btn"
                        title={isExpanded ? "Collapse visit breakdown" : "Expand visit breakdown"}
                        aria-label={isExpanded ? `Collapse details for ${link.code}` : `Expand details for ${link.code}`}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>

                    {/* Short link + Created Date */}
                    <td>
                      <div className="flex items-center gap-2">
                        <code className="code-badge">/{link.code}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(link.id, link.code)}
                          className="btn btn-secondary btn-sm table-icon-btn"
                          title="Copy short link to clipboard"
                          aria-label="Copy short link"
                        >
                          {isCopied ? (
                            <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-green)" }} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm table-icon-btn"
                          title="Open short link"
                          aria-label="Open short link in new tab"
                        >
                          <ArrowUpRight size={14} />
                        </a>
                      </div>

                      {(link.campaign || (link.tags && link.tags.length > 0)) && (
                        <div className="flex items-center gap-1" style={{ flexWrap: "wrap", marginTop: "6px" }}>
                          {link.campaign && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--color-blue-light)",
                                border: "1.5px solid var(--color-ink)",
                                color: "var(--color-ink)",
                                fontWeight: 700,
                              }}
                            >
                              {link.campaign.name}
                            </span>
                          )}
                          {link.tags?.map((t) => (
                            <span
                              key={t.id}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--color-paper)",
                                border: "1.5px solid var(--color-ink)",
                                color: "var(--color-ink)",
                                fontWeight: 700,
                              }}
                            >
                              #{t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-muted)",
                          marginTop: "6px",
                          fontWeight: 600,
                        }}
                      >
                        Created{" "}
                        {new Date(link.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    {/* Original Destination */}
                    <td>
                      <div className="flex items-center gap-1.5" style={{ maxWidth: "200px" }}>
                        <a
                          href={link.destinationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate"
                          style={{
                            color: "var(--color-ink)",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            maxWidth: "180px",
                            display: "inline-block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={link.destinationUrl}
                        >
                          <span className="sr-only">Destination URL: {link.destinationUrl}</span>
                          <span aria-hidden="true">{link.destinationUrl}</span>
                        </a>
                        <ExternalLink size={14} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                      </div>
                    </td>

                    {/* Creator (Admin View) */}
                    {isAdminView && (
                      <td>
                        {link.user ? (
                          <div style={{ maxWidth: "180px" }}>
                            <div
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "var(--color-ink)",
                              }}
                              title={`Creator: ${link.user.email} (${link.user.role})`}
                            >
                              <span className="sr-only">Creator email: {link.user.email}</span>
                              <span aria-hidden="true">{link.user.email}</span>
                            </div>
                            <div style={{ marginTop: "3px" }}>
                              {link.user.role === "ADMIN" ? (
                                <span
                                  className="badge badge-admin"
                                  style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem" }}
                                >
                                  Admin
                                </span>
                              ) : (
                                <span
                                  className="badge badge-user"
                                  style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem" }}
                                >
                                  User
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-ink-muted)", fontSize: "0.85rem" }}>Unknown</span>
                        )}
                      </td>
                    )}

                    {/* Visits & Unique Visitors */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            color: "var(--color-ink)",
                          }}
                        >
                          {link.clicksCount} {link.clicksCount === 1 ? "visit" : "visits"}
                        </div>
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            color: "var(--color-muted)",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          {link.uniqueVisitorsCount} unique
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-ink-muted)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {link.qrScansCount || 0} QR · {Math.max(0, link.clicksCount - (link.qrScansCount || 0))} direct
                        </div>
                      </div>
                    </td>

                    {/* Rules indicators */}
                    <td>
                      <div className="flex items-center gap-2">
                        {link.expiresAt && (
                          <span
                            className="tooltip-trigger"
                            tabIndex={0}
                            title={`Expires: ${new Date(link.expiresAt).toLocaleString()}`}
                            aria-label={`Expires: ${new Date(link.expiresAt).toLocaleString()}`}
                            style={{ color: "var(--color-ink)", display: "inline-flex" }}
                          >
                            <Clock size={16} strokeWidth={2.5} />
                            <span className="tooltip">Expires: {new Date(link.expiresAt).toLocaleDateString()}</span>
                          </span>
                        )}
                        {link.clickLimit !== null && link.clickLimit !== undefined && (
                          <span
                            className="tooltip-trigger"
                            tabIndex={0}
                            title={`Limit: ${link.clicksCount}/${link.clickLimit} visits`}
                            aria-label={`Limit: ${link.clicksCount}/${link.clickLimit} visits`}
                            style={{ color: "var(--color-ink)", display: "inline-flex" }}
                          >
                            <Gauge size={16} strokeWidth={2.5} />
                            <span className="tooltip">
                              Limit: {link.clicksCount}/{link.clickLimit} visits
                            </span>
                          </span>
                        )}
                        {link.hasPassword && (
                          <span
                            className="tooltip-trigger"
                            tabIndex={0}
                            title="Passcode protection enabled"
                            aria-label="Passcode protection enabled"
                            style={{ color: "var(--color-ink)", display: "inline-flex" }}
                          >
                            <Lock size={16} strokeWidth={2.5} />
                            <span className="tooltip">Passcode protected</span>
                          </span>
                        )}
                        {!link.expiresAt && link.clickLimit === null && !link.hasPassword && (
                          <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>None</span>
                        )}
                      </div>
                    </td>

                    {/* State badge */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div>
                        {renderStateBadge(link.state)}
                        {link.disabledReason && link.state === "disabled" && (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.2rem", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }} title={link.disabledReason}>
                            {link.disabledReason}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions (Sticky Right) */}
                    <td className="col-sticky-actions" style={{ textAlign: "right" }}>
                      <div
                        className="flex items-center justify-end"
                        style={{ justifyContent: "flex-end", gap: "0.35rem" }}
                      >
                        <button
                          type="button"
                          onClick={() => setQrModalLink(link)}
                          disabled={isLoading}
                          className="btn btn-secondary btn-sm table-action-btn"
                          title="View and download QR code"
                          aria-label={`View QR code for /${link.code}`}
                        >
                          <QrCode size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingLink(link)}
                          disabled={isLoading}
                          className="btn btn-secondary btn-sm table-action-btn"
                          title="Edit link rules"
                          aria-label={`Edit rules for /${link.code}`}
                        >
                          <Sliders size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(link)}
                          disabled={isLoading}
                          className={`btn btn-sm table-action-btn ${link.isActive ? "btn-secondary" : "btn-primary"}`}
                          title={link.isActive ? "Deactivate link" : "Activate link"}
                          aria-label={link.isActive ? `Deactivate /${link.code}` : `Activate /${link.code}`}
                        >
                          <Power size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(link.id)}
                          disabled={isLoading}
                          className="btn btn-danger btn-sm table-action-btn"
                          title="Permanently delete link"
                          aria-label={`Delete /${link.code}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded Row Inspector Portal (outside table structure to ensure strict HTML validity or inline) */}
      {expandedRowId && (
        <div style={{ marginTop: "1rem" }}>
          {(() => {
            const expLink = links.find((l) => l.id === expandedRowId);
            if (!expLink) return null;
            const expTotalClicks = expLink.clicksCount || 0;
            const expQrScans = expLink.qrScansCount || 0;
            const expDirectClicks = Math.max(0, expTotalClicks - expQrScans);
            const expQrScansPct = expTotalClicks > 0 ? Math.round((expQrScans / expTotalClicks) * 100) : 0;
            const expDirectClicksPct = expTotalClicks > 0 ? 100 - expQrScansPct : 100;

            return (
              <div
                className="card"
                style={{
                  backgroundColor: "var(--color-paper)",
                  border: "var(--border-thick)",
                  padding: "1.25rem 1.5rem",
                  boxShadow: "var(--shadow-hard)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="badge badge-paper">
                      Inspector: <strong>/{expLink.code}</strong>
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--color-muted)", fontWeight: 700 }}>
                      Visit details and link rules
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedRowId(null)}
                    className="btn btn-secondary btn-sm"
                    aria-label="Close inspector"
                  >
                    <X size={14} />
                    <span>Close Inspector</span>
                  </button>
                </div>

                <div className="table-inspector-deck">
                  {/* Card 1: Destination Details */}
                  <div className="table-inspector-card">
                    <div className="table-inspector-label">
                      <ExternalLink size={13} />
                      <span>Full Destination Target</span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono-family)",
                        fontSize: "0.85rem",
                        wordBreak: "break-all",
                        color: "var(--color-ink)",
                        marginBottom: "0.85rem",
                        maxHeight: "65px",
                        overflowY: "auto",
                      }}
                    >
                      {expLink.destinationUrl}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(expLink.destinationUrl);
                          showToast("Copied destination target URL to clipboard!");
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Copy size={13} />
                        <span>Copy Target</span>
                      </button>
                      <a
                        href={expLink.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        <ExternalLink size={13} />
                        <span>Visit</span>
                      </a>
                    </div>
                  </div>

                  {/* Card 2: Telemetry Breakdown Bar */}
                  <div className="table-inspector-card">
                    <div className="table-inspector-label">
                      <BarChart2 size={13} />
                      <span>Attribution Ratio</span>
                    </div>
                    <div
                      className="breakdown-bar-track"
                      role="progressbar"
                      aria-valuenow={expDirectClicksPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Attribution ratio"
                    >
                      <div
                        className="breakdown-bar-segment-direct"
                        style={{ width: `${expDirectClicksPct}%` }}
                        title={`Direct/Web Visits: ${expDirectClicks} (${expDirectClicksPct}%)`}
                      />
                      <div
                        className="breakdown-bar-segment-qr"
                        style={{ width: `${expQrScansPct}%` }}
                        title={`QR Code Scans: ${expQrScans} (${expQrScansPct}%)`}
                      />
                    </div>
                    <div
                      className="flex items-center justify-between"
                      style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: "0.45rem" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            borderRadius: "2px",
                            backgroundColor: "var(--color-blue)",
                          }}
                        />
                        <span>
                          Direct: {expDirectClicks} ({expDirectClicksPct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            borderRadius: "2px",
                            backgroundColor: "var(--color-yellow)",
                          }}
                        />
                        <span>
                          QR Scans: {expQrScans} ({expQrScansPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Active Rule Parameters */}
                  <div className="table-inspector-card">
                    <div className="table-inspector-label">
                      <Sliders size={13} />
                      <span>Active Guardrails</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
                      <div className="flex items-center justify-between">
                        <span style={{ color: "var(--color-muted)", fontWeight: 600 }}>Expiration:</span>
                        <strong>
                          {expLink.expiresAt ? new Date(expLink.expiresAt).toLocaleDateString() : "No Expiration"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: "var(--color-muted)", fontWeight: 600 }}>Click Limit:</span>
                        <strong>
                          {expLink.clickLimit !== null && expLink.clickLimit !== undefined
                            ? `${expLink.clicksCount} / ${expLink.clickLimit} max`
                            : "Unlimited"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: "var(--color-muted)", fontWeight: 600 }}>Passcode Protection:</span>
                        <strong>{expLink.hasPassword ? "Enforced" : "None"}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: "var(--color-muted)", fontWeight: 600 }}>Unique Visitors:</span>
                        <strong>{expLink.uniqueVisitorsCount} sessions</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {editingLink && (
        <EditLinkModal
          link={editingLink}
          isOpen={true}
          onClose={() => setEditingLink(null)}
          onSaved={(updatedLink) => {
            if (updatedLink) {
              setDisplayLinks((prev) =>
                prev.map((l) => (l.id === updatedLink.id ? updatedLink : l))
              );
              showToast(`Link rules updated for /${updatedLink.code}.`);
            } else {
              onRefresh();
            }
          }}
          onError={(errorMessage, rollbackLink) => {
            setDisplayLinks((prev) =>
              prev.map((l) => (l.id === rollbackLink.id ? rollbackLink : l))
            );
            showToast(`Update failed: ${errorMessage} (Reverted)`);
          }}
        />
      )}

      {qrModalLink && (
        <QrModal
          link={qrModalLink}
          isOpen={true}
          onClose={() => setQrModalLink(null)}
        />
      )}
    </>
  );
}
