"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Link2,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Clock,
  Gauge,
  Lock,
  Info,
  Layers,
  Tag as TagIcon,
  Plus,
} from "lucide-react";
import { buildShortUrl } from "@/lib/utils/short-url";

interface LinkCreateFormProps {
  onSuccess: () => void;
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

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "login",
  "logout",
  "register",
  "settings",
  "analytics",
  "link",
  "links",
  "static",
  "assets",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "health",
  "ping",
  "terms",
  "privacy",
  "about",
  "contact",
  "not-found",
  "404",
  "500",
  "p",
  "link-status",
]);

export function LinkCreateForm({ onSuccess }: LinkCreateFormProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [destinationUrl, setDestinationUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");

  // Step 2 fields
  const [expiresAt, setExpiresAt] = useState("");
  const [clickLimit, setClickLimit] = useState("");
  const [password, setPassword] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Inline creation for campaigns and tags
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{
    code: string;
    destinationUrl: string;
    shortUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load user campaigns & tags
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

  const handleCreateCampaignInline = async () => {
    if (!newCampaignName.trim()) return;
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.campaign) {
        setCampaigns((prev) => [data.campaign, ...prev]);
        setCampaignId(data.campaign.id);
        setNewCampaignName("");
        setShowNewCampaign(false);
      } else {
        alert(data.error || "Failed to create campaign.");
      }
    } catch {
      alert("Error creating campaign.");
    }
  };

  const handleCreateTagInline = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.tag) {
        setTags((prev) => [...prev, data.tag]);
        setSelectedTagIds((prev) => [...prev, data.tag.id]);
        setNewTagName("");
        setShowNewTag(false);
      } else {
        alert(data.error || "Failed to create tag.");
      }
    } catch {
      alert("Error creating tag.");
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Live validation for Destination URL
  const urlValidation = useMemo(() => {
    if (!destinationUrl.trim()) return null;
    try {
      const parsed = new URL(destinationUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { isValid: false, message: "URL protocol must be http:// or https://" };
      }
      if (!parsed.hostname || parsed.hostname.length < 3) {
        return { isValid: false, message: "Please include a valid domain hostname." };
      }
      return { isValid: true, message: "Valid destination URL" };
    } catch {
      return { isValid: false, message: "Invalid URL syntax. Include https:// (e.g. https://example.com)" };
    }
  }, [destinationUrl]);

  // Live validation for Custom Alias
  const aliasValidation = useMemo(() => {
    if (!customAlias.trim()) return null;
    const trimmed = customAlias.trim();
    if (trimmed.length < 3) {
      return { isValid: false, message: "Alias must be at least 3 characters." };
    }
    if (trimmed.length > 32) {
      return { isValid: false, message: "Alias cannot exceed 32 characters." };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { isValid: false, message: "Letters, numbers, hyphens (-) and underscores (_) only." };
    }
    if (RESERVED_SLUGS.has(trimmed.toLowerCase())) {
      return { isValid: false, message: `"${trimmed}" is a reserved system keyword.` };
    }
    return { isValid: true, message: `"${trimmed}" is a valid alias format` };
  }, [customAlias]);

  // Validate step 1 before proceeding
  const handleNextStep = () => {
    setError(null);
    if (!destinationUrl.trim()) {
      setError("Destination URL is required.");
      return;
    }
    if (urlValidation && !urlValidation.isValid) {
      setError(urlValidation.message);
      return;
    }
    if (aliasValidation && !aliasValidation.isValid) {
      setError(aliasValidation.message);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedLink(null);

    // Final checks
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (expDate.getTime() <= Date.now()) {
        setError("Expiration date must be in the future.");
        return;
      }
    }

    if (clickLimit) {
      const limit = parseInt(clickLimit, 10);
      if (isNaN(limit) || limit <= 0) {
        setError("Click limit must be a positive number.");
        return;
      }
    }

    if (password && password.trim().length < 4) {
      setError("Passcode must be at least 4 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: destinationUrl.trim(),
          customAlias: customAlias.trim() || undefined,
          expiresAt: expiresAt || null,
          clickLimit: clickLimit ? parseInt(clickLimit, 10) : null,
          password: password.trim() || null,
          campaignId: campaignId || null,
          tagIds: selectedTagIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create short link.");
      }

      const shortUrl = buildShortUrl(data.link.code);
      setCreatedLink({
        code: data.link.code,
        destinationUrl: data.link.destinationUrl,
        shortUrl,
      });

      // Reset form
      setDestinationUrl("");
      setCustomAlias("");
      setExpiresAt("");
      setClickLimit("");
      setPassword("");
      setCampaignId("");
      setSelectedTagIds([]);
      setStep(1);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      {/* Header and Step Indicators */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "0.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-display)" }}>
            <span className="icon-chip icon-chip-blue">
              <Sparkles size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>Create Short Link</span>
          </h2>

          <div className="stepper" style={{ margin: 0 }}>
            <div className={`step-item ${step === 1 ? "active" : "completed"}`}>
              <span className="step-circle">{step === 2 ? "✓" : "1"}</span>
              <span>1. Destination & Alias</span>
            </div>
            <div className="step-line" />
            <div className={`step-item ${step === 2 ? "active" : ""}`}>
              <span className="step-circle">2</span>
              <span>2. Rules & Tags</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {createdLink && (
        <div className="alert alert-success" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.85rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: "1.05rem" }}>
            <Check size={20} strokeWidth={2.5} />
            <span>Short link created successfully!</span>
          </div>

          <div
            className="flex items-center justify-between"
            style={{
              width: "100%",
              backgroundColor: "var(--color-paper)",
              border: "var(--border-thick)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-hard-sm)",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono-family)", fontWeight: 700, fontSize: "1.05rem", color: "var(--color-ink)", wordBreak: "break-all" }}>
              {createdLink.shortUrl}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
                aria-label="Copy short link"
              >
                {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy URL"}</span>
              </button>
              <a
                href={createdLink.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
              >
                <span>Visit</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Destination URL & Alias */}
      {step === 1 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", alignItems: "flex-start" }}>
            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label" htmlFor="destUrl">
                Destination URL <span style={{ color: "var(--color-text-danger)" }}>*</span>
              </label>
              <input
                id="destUrl"
                type="text"
                className="form-input"
                placeholder="https://example.com/your-long-path"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                autoFocus
              />
              {urlValidation && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    marginTop: "0.35rem",
                    color: urlValidation.isValid ? "var(--color-ink)" : "var(--color-text-danger)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {urlValidation.isValid ? <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-green)" }} /> : <AlertCircle size={14} />}
                  <span>{urlValidation.message}</span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label" htmlFor="customAlias">
                Custom Alias <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(Optional)</span>
              </label>
              <input
                id="customAlias"
                type="text"
                className="form-input"
                placeholder="e.g. launch-2026"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
              />
              {aliasValidation ? (
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    marginTop: "0.35rem",
                    color: aliasValidation.isValid ? "var(--color-ink)" : "var(--color-text-danger)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {aliasValidation.isValid ? <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-green)" }} /> : <AlertCircle size={14} />}
                  <span>{aliasValidation.message}</span>
                </div>
              ) : (
                <span className="form-hint">Leave blank to generate a random 6-character code</span>
              )}

              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.35rem 0.65rem",
                  backgroundColor: "var(--color-paper)",
                  border: "1.5px solid var(--color-ink)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.825rem",
                  fontFamily: "var(--font-mono-family)",
                  color: "var(--color-ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "1px 1px 0 var(--color-ink)",
                }}
              >
                <span style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans-family)", fontWeight: 700 }}>Preview:</span>
                <strong>{buildShortUrl(customAlias.trim() || "random6")}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextStep}
              disabled={!destinationUrl.trim() || (urlValidation !== null && !urlValidation.isValid)}
            >
              <span>Next: Set Rules & Tags</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Rules, Campaign, Tags & Review */}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-paper)",
                border: "var(--border-thin)",
                fontSize: "0.95rem",
                color: "var(--color-ink)",
              }}
            >
              Target: <strong style={{ wordBreak: "break-all" }}>{destinationUrl}</strong>{" "}
              {customAlias ? (
                <>
                  (alias: <code className="code-badge">/{customAlias}</code>)
                </>
              ) : (
                <span style={{ color: "var(--color-muted)" }}>(auto-generated code)</span>
              )}
            </div>
          </div>

          {/* Section: Organization (Campaign & Tags) */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-white)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-hard-sm)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.85rem" }}>
              Link Organization
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
              {/* Campaign Picker */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: "0.45rem" }}>
                  <label className="form-label" htmlFor="campSelect" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Layers size={14} />
                    <span>Assign Campaign</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCampaign(!showNewCampaign)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    aria-label={showNewCampaign ? "Cancel creating campaign" : "Create new campaign"}
                  >
                    {showNewCampaign ? "Cancel" : "+ New"}
                  </button>
                </div>

                {showNewCampaign ? (
                  <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Campaign name"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      style={{ fontSize: "0.9rem", minHeight: "44px" }}
                      aria-label="New campaign name"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCampaignInline}
                      className="btn btn-primary btn-sm"
                      style={{ minHeight: "44px", padding: "0 1rem" }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    id="campSelect"
                    className="form-input"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    style={{ fontSize: "0.9rem", minHeight: "44px" }}
                  >
                    <option value="">No Campaign (None)</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tags Picker */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: "0.45rem" }}>
                  <span className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <TagIcon size={14} />
                    <span>Assign Tags</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewTag(!showNewTag)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    aria-label={showNewTag ? "Cancel creating tag" : "Create new tag"}
                  >
                    {showNewTag ? "Cancel" : "+ New"}
                  </button>
                </div>

                {showNewTag ? (
                  <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      style={{ fontSize: "0.9rem", minHeight: "44px" }}
                      aria-label="New tag name"
                    />
                    <button
                      type="button"
                      onClick={handleCreateTagInline}
                      className="btn btn-primary btn-sm"
                      style={{ minHeight: "44px", padding: "0 1rem" }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1" style={{ flexWrap: "wrap", marginTop: "0.35rem" }}>
                    {tags.length > 0 ? (
                      tags.map((t) => {
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
                      })
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                        No tags yet. Click &quot;+ New&quot; to add tags.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Operational Rules */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {/* Expiry */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2" htmlFor="expiryInput">
                <Clock size={16} />
                <span>Expiration Date</span>
              </label>
              <input
                id="expiryInput"
                type="datetime-local"
                className="form-input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">Deactivates redirect after specified date</span>
            </div>

            {/* Click Limit */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2" htmlFor="limitInput">
                <Gauge size={16} />
                <span>Click Limit</span>
              </label>
              <input
                id="limitInput"
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 50"
                value={clickLimit}
                onChange={(e) => setClickLimit(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">Atomic cap &mdash; bot clicks are filtered</span>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2" htmlFor="passInput">
                <Lock size={16} />
                <span>Passcode</span>
              </label>
              <input
                id="passInput"
                type="password"
                className="form-input"
                placeholder="min. 4 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">Passcode protected challenge screen</span>
            </div>
          </div>

          {/* Rule Review & Warnings Box */}
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-paper)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-hard-sm)",
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--color-ink)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Rule Summary & Policy Review
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem", color: "var(--color-ink)" }}>
              {campaignId && (
                <div className="flex items-center gap-2">
                  <Layers size={16} />
                  <span>
                    <strong>Campaign:</strong> Grouped under &quot;{campaigns.find((c) => c.id === campaignId)?.name}&quot;.
                  </span>
                </div>
              )}

              {selectedTagIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <TagIcon size={16} />
                  <span>
                    <strong>Tags ({selectedTagIds.length}):</strong>{" "}
                    {tags.filter((t) => selectedTagIds.includes(t.id)).map((t) => `#${t.name}`).join(", ")}
                  </span>
                </div>
              )}

              {expiresAt && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} style={{ color: "var(--color-coral)" }} />
                  <span>
                    <strong>Expiry Rule Active:</strong> Redirect will expire on{" "}
                    {new Date(expiresAt).toLocaleString()}.
                  </span>
                </div>
              )}

              {clickLimit && parseInt(clickLimit, 10) > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} style={{ color: "var(--color-coral)" }} />
                  <span>
                    <strong>Click Limit Active:</strong> Redirect will cut off after{" "}
                    {parseInt(clickLimit, 10)} total visits.
                  </span>
                </div>
              )}

              {password && password.trim().length > 0 && (
                <div className="flex items-center gap-2">
                  <Lock size={16} />
                  <span>
                    <strong>Passcode Protection:</strong> Visitors must enter this passcode to access destination.
                  </span>
                </div>
              )}

              {!expiresAt && !clickLimit && !password && !campaignId && selectedTagIds.length === 0 && (
                <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
                  <Info size={16} />
                  <span>Standard open link: No expiration date, unlimited visits, no passcode required.</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between" style={{ marginTop: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <ArrowLeft size={16} />
              <span>Back to Step 1</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: "180px" }}
            >
              {loading ? (
                <span>Publishing Link...</span>
              ) : (
                <>
                  <Link2 size={18} strokeWidth={2.5} />
                  <span>Publish Short Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
