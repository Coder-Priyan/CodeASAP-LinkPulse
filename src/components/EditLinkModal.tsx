"use client";

import { useState, useEffect, useRef } from "react";
import { LinkItem } from "./LinksTable";
import { X, Save, Clock, Gauge, Lock, AlertCircle, Globe, Layers, Tag as TagIcon, Sliders, Copy, Check } from "lucide-react";
import { buildShortUrl } from "@/lib/utils/short-url";

interface EditLinkModalProps {
  link: LinkItem;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
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

export function EditLinkModal({ link, isOpen, onClose, onSaved }: EditLinkModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [destinationUrl, setDestinationUrl] = useState(link.destinationUrl);
  const [isActive, setIsActive] = useState(link.isActive);
  const [disabledReason, setDisabledReason] = useState(link.disabledReason || "");
  const [expiresAt, setExpiresAt] = useState(
    link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : ""
  );
  const [clickLimit, setClickLimit] = useState(
    link.clickLimit !== null && link.clickLimit !== undefined ? String(link.clickLimit) : ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [campaignId, setCampaignId] = useState(link.campaignId || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    link.tags ? link.tags.map((t) => t.id) : []
  );

  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {});

    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<HTMLElement>("input, button");
      firstInput?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortUrl = buildShortUrl(link.code);

  const handleCopyShortUrl = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: destinationUrl.trim(),
          isActive,
          disabledReason: isActive ? null : disabledReason.trim() || "Disabled by user",
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          clickLimit: clickLimit ? parseInt(clickLimit, 10) : null,
          password: newPassword.trim() ? newPassword.trim() : undefined,
          removePassword,
          campaignId: campaignId ? campaignId : null,
          tagIds: selectedTagIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update link rules.");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred while saving link rules.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-link-title"
      className="modal-backdrop"
    >
      <div ref={modalRef} className="modal" style={{ maxWidth: "580px", textAlign: "left" }}>
        <div className="modal-header">
          <div>
            <h2 id="edit-link-title" className="modal-title flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <span className="icon-chip icon-chip-blue">
                <Sliders size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
              </span>
              <span>Edit Link Rules</span>
            </h2>
            <div className="flex items-center gap-2" style={{ marginTop: "0.35rem" }}>
              <code className="code-badge">/{link.code}</code>
              <button
                type="button"
                onClick={handleCopyShortUrl}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.15rem 0.45rem", fontSize: "0.75rem", minHeight: "auto" }}
                title="Copy short link"
              >
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close edit modal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Destination URL */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editDest">
              <Globe size={16} />
              <span>Destination URL</span>
            </label>
            <input
              id="editDest"
              type="text"
              className="form-input"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              required
            />
          </div>

          {/* Active Status Tactile Toggle Switch */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-paper)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-hard-sm)",
              marginBottom: "1.25rem",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Redirect Status</div>
              <div style={{ fontSize: "0.825rem", color: "var(--color-muted)", fontWeight: 600 }}>
                {isActive ? "Link actively redirects visitors" : "Link is temporarily deactivated"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`btn btn-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.825rem", minHeight: "36px" }}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`btn btn-sm ${!isActive ? "btn-danger" : "btn-secondary"}`}
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.825rem", minHeight: "36px" }}
              >
                Disabled
              </button>
            </div>
          </div>

          {!isActive && (
            <div className="form-group">
              <label className="form-label" htmlFor="editReason">
                Deactivation Reason (Optional)
              </label>
              <input
                id="editReason"
                type="text"
                className="form-input"
                placeholder="e.g. Campaign concluded"
                value={disabledReason}
                onChange={(e) => setDisabledReason(e.target.value)}
              />
            </div>
          )}

          {/* Campaign Selection */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editCamp">
              <Layers size={16} />
              <span>Assigned Campaign</span>
            </label>
            <select
              id="editCamp"
              className="form-input"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">No Campaign (None)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Selection */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <TagIcon size={16} />
              <span>Assigned Tags</span>
            </label>
            <div className="flex gap-1.5" style={{ flexWrap: "wrap", marginTop: "0.35rem" }}>
              {tags.map((t) => {
                const isSelected = selectedTagIds.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    className={`tag-pill ${isSelected ? "selected" : ""}`}
                  >
                    {isSelected ? `✓ #${t.name}` : `#${t.name}`}
                  </button>
                );
              })}
              {tags.length === 0 && (
                <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>No tags created yet.</span>
              )}
            </div>
          </div>

          {/* Expiration Date */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editExpiry">
              <Clock size={16} />
              <span>Expiration Date (Leave blank to remove)</span>
            </label>
            <input
              id="editExpiry"
              type="datetime-local"
              className="form-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {/* Click Limit */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editLimit">
              <Gauge size={16} />
              <span>Click Limit (Leave blank for unlimited)</span>
            </label>
            <input
              id="editLimit"
              type="number"
              min="1"
              className="form-input"
              placeholder="e.g. 500"
              value={clickLimit}
              onChange={(e) => setClickLimit(e.target.value)}
            />
            <span className="form-hint">Recorded visits so far: {link.clicksCount}</span>
          </div>

          {/* Password Protection */}
          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <label className="form-label flex items-center gap-2" htmlFor="editPass">
              <Lock size={16} />
              <span>Passcode Protection</span>
            </label>
            {link.hasPassword && (
              <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="removePassCheck"
                  className="form-checkbox"
                  checked={removePassword}
                  onChange={(e) => setRemovePassword(e.target.checked)}
                />
                <label htmlFor="removePassCheck" style={{ fontSize: "0.85rem", color: "var(--color-text-danger)", fontWeight: 700 }}>
                  Remove current passcode requirement
                </label>
              </div>
            )}
            <input
              id="editPass"
              type="password"
              className="form-input"
              placeholder={link.hasPassword ? "Enter new passcode to overwrite" : "Set passcode (min. 4 chars)"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (e.target.value) setRemovePassword(false);
              }}
              disabled={removePassword}
            />
          </div>

          <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={loading}>
              <Save size={16} />
              <span>{loading ? "Saving Rules..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
