"use client";

import { useState, useEffect } from "react";
import { LinkItem } from "./LinksTable";
import { X, Save, Clock, Gauge, Lock, AlertCircle, Globe, Layers, Tag as TagIcon } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {});

    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

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
        setError("Error saving link rules.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Edit Link Rules & Organization</h2>
            <span style={{ fontSize: "0.85rem", color: "var(--accent-secondary)", fontFamily: "monospace" }}>
              /{link.code}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.25rem 0.5rem" }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Destination URL */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editDest">
              <Globe size={14} />
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

          {/* Campaign Selection */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editCamp">
              <Layers size={14} />
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
              <TagIcon size={14} />
              <span>Assigned Tags</span>
            </label>
            <div className="flex gap-1" style={{ flexWrap: "wrap", marginTop: "0.25rem" }}>
              {tags.map((t) => {
                const isSelected = selectedTagIds.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      border: isSelected ? "1px solid var(--accent-secondary)" : "1px solid var(--border-color)",
                      backgroundColor: isSelected ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: isSelected ? "#67e8f9" : "var(--text-secondary)",
                    }}
                  >
                    {isSelected ? `✓ ${t.name}` : t.name}
                  </button>
                );
              })}
              {tags.length === 0 && (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No tags available.</span>
              )}
            </div>
          </div>

          {/* Active Status Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Active Status</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {isActive ? "Link actively accepts and redirects visitors" : "Link is disabled and blocked from redirecting"}
              </div>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: "1.2rem", height: "1.2rem", cursor: "pointer" }}
            />
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
                placeholder="e.g. Campaign ended"
                value={disabledReason}
                onChange={(e) => setDisabledReason(e.target.value)}
              />
            </div>
          )}

          {/* Expiration Date */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2" htmlFor="editExpiry">
              <Clock size={14} />
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
              <Gauge size={14} />
              <span>Click Limit (Leave blank for unlimited)</span>
            </label>
            <input
              id="editLimit"
              type="number"
              min="1"
              className="form-input"
              placeholder="e.g. 100"
              value={clickLimit}
              onChange={(e) => setClickLimit(e.target.value)}
            />
            <span className="form-hint">Current clicks recorded: {link.clicksCount}</span>
          </div>

          {/* Password Protection */}
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label flex items-center gap-2" htmlFor="editPass">
              <Lock size={14} />
              <span>Passcode Protection</span>
            </label>
            {link.hasPassword && (
              <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="removePassCheck"
                  checked={removePassword}
                  onChange={(e) => setRemovePassword(e.target.checked)}
                />
                <label htmlFor="removePassCheck" style={{ fontSize: "0.85rem", color: "var(--danger)" }}>
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

          <div className="flex items-center justify-between">
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
