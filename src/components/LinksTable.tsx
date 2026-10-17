"use client";

import { useState } from "react";
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
} from "lucide-react";
import { EditLinkModal } from "./EditLinkModal";
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
}

export function LinksTable({ links, isAdminView = false, onRefresh }: LinksTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

  const getFullShortUrl = (code: string) => buildShortUrl(code);

  const handleCopy = (id: string, code: string) => {
    const url = getFullShortUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (link: LinkItem) => {
    setActionLoadingId(link.id);
    try {
      const newStatus = !link.isActive;
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
        alert(data.error || "Failed to update link status");
      } else {
        onRefresh();
      }
    } catch {
      alert("Error connecting to server.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link? All associated click logs will also be permanently deleted.")) {
      return;
    }

    setActionLoadingId(linkId);
    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete link.");
      } else {
        onRefresh();
      }
    } catch {
      alert("Error connecting to server.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStateBadge = (state: ComputedLinkState) => {
    switch (state) {
      case "active":
        return <span className="badge badge-active">Active</span>;
      case "expired":
        return <span className="badge badge-inactive">Expired</span>;
      case "limit_reached":
        return <span className="badge badge-inactive">Limit Reached</span>;
      case "disabled":
        return <span className="badge badge-inactive">Disabled</span>;
      default:
        return <span className="badge badge-count">Unknown</span>;
    }
  };

  if (links.length === 0) {
    return (
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "3.5rem 1.5rem",
          color: "var(--text-secondary)",
        }}
      >
        <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
          No shortened links found.
        </p>
        <p style={{ fontSize: "0.875rem" }}>
          {isAdminView
            ? "No links have been created in the system yet."
            : "Enter a URL above to create your first trackable short link!"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Short Link</th>
              <th>Original Destination</th>
              {isAdminView && <th>Creator</th>}
              <th>Visits & Uniques</th>
              <th>Active Rules</th>
              <th>State</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const shortUrl = getFullShortUrl(link.code);
              const isCopied = copiedId === link.id;
              const isLoading = actionLoadingId === link.id;

              return (
                <tr key={link.id}>
                  {/* Short link */}
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "var(--accent-secondary)",
                        }}
                      >
                        /{link.code}
                      </span>
                      <button
                        onClick={() => handleCopy(link.id, link.code)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "0.2rem 0.4rem" }}
                        title="Copy short link"
                      >
                        {isCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "0.2rem 0.4rem" }}
                        title="Open redirect"
                      >
                        <ArrowUpRight size={12} />
                      </a>
                    </div>

                    {(link.campaign || (link.tags && link.tags.length > 0)) && (
                      <div className="flex items-center gap-1" style={{ flexWrap: "wrap", marginTop: "4px" }}>
                        {link.campaign && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "4px",
                              backgroundColor: "rgba(59, 130, 246, 0.15)",
                              color: "#60a5fa",
                              fontWeight: 500,
                            }}
                          >
                            {link.campaign.name}
                          </span>
                        )}
                        {link.tags?.map((t) => (
                          <span
                            key={t.id}
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "4px",
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              color: "var(--text-muted)",
                            }}
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Original Destination */}
                  <td>
                    <div className="flex items-center gap-2 max-w-md">
                      <a
                        href={link.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate"
                        style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}
                        title={link.destinationUrl}
                      >
                        {link.destinationUrl}
                      </a>
                      <ExternalLink size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  </td>

                  {/* Creator (Admin View) */}
                  {isAdminView && (
                    <td>
                      {link.user ? (
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                            {link.user.email}
                          </div>
                          <span className="badge badge-admin" style={{ fontSize: "0.65rem", marginTop: "2px" }}>
                            {link.user.role}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Unknown</span>
                      )}
                    </td>
                  )}

                  {/* Visits & Unique Visitors */}
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-count" title="Total clicks">
                        {link.clicksCount} {link.clicksCount === 1 ? "click" : "clicks"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.775rem",
                          color: "var(--text-muted)",
                        }}
                        title="Unique privacy-safe visitors"
                      >
                        ({link.uniqueVisitorsCount} unique)
                      </span>
                    </div>
                  </td>

                  {/* Rules indicators */}
                  <td>
                    <div className="flex items-center gap-2">
                      {link.expiresAt && (
                        <span
                          title={`Expires: ${new Date(link.expiresAt).toLocaleString()}`}
                          style={{ color: "#fcd34d", display: "inline-flex" }}
                        >
                          <Clock size={15} />
                        </span>
                      )}
                      {link.clickLimit !== null && link.clickLimit !== undefined && (
                        <span
                          title={`Limit: ${link.clicksCount}/${link.clickLimit} visits`}
                          style={{ color: "#38bdf8", display: "inline-flex" }}
                        >
                          <Gauge size={15} />
                        </span>
                      )}
                      {link.hasPassword && (
                        <span
                          title="Passcode protection enabled"
                          style={{ color: "#c084fc", display: "inline-flex" }}
                        >
                          <Lock size={15} />
                        </span>
                      )}
                      {!link.expiresAt && link.clickLimit === null && !link.hasPassword && (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>None</span>
                      )}
                    </div>
                  </td>

                  {/* State badge */}
                  <td>
                    <div>
                      {renderStateBadge(link.state)}
                      {link.disabledReason && link.state === "disabled" && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          {link.disabledReason}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Created Date */}
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {new Date(link.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: "right" }}>
                    <div className="flex items-center justify-between" style={{ justifyContent: "flex-end", gap: "0.4rem" }}>
                      <button
                        onClick={() => setEditingLink(link)}
                        disabled={isLoading}
                        className="btn btn-secondary btn-sm"
                        title="Edit link rules (expiry, limit, password, url)"
                      >
                        <Sliders size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(link)}
                        disabled={isLoading}
                        className={`btn btn-sm ${link.isActive ? "btn-secondary" : "btn-primary"}`}
                        title={link.isActive ? "Deactivate link" : "Activate link"}
                      >
                        <Power size={13} />
                        <span>{link.isActive ? "Disable" : "Enable"}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={isLoading}
                        className="btn btn-danger btn-sm"
                        title="Permanently delete link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingLink && (
        <EditLinkModal
          link={editingLink}
          isOpen={true}
          onClose={() => setEditingLink(null)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
