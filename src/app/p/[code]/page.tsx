"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function PasswordChallengeContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = (params.code as string) || "";
  const src = searchParams.get("src") || undefined;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Protected Link | LinkPulse";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Please enter the passcode.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/links/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password, src }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "BLOCKED" || data.status === "DISABLED" || data.status === "EXPIRED" || data.status === "LIMIT_REACHED") {
          router.push(`/link-status?code=${encodeURIComponent(code)}&status=${data.status}`);
          return;
        }
        throw new Error(data.error || "Incorrect passcode.");
      }

      if (data.destinationUrl) {
        location.href = data.destinationUrl;
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to verify passcode.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "480px", paddingTop: "4.5rem", paddingBottom: "3rem" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "var(--color-yellow)",
            border: "2px solid var(--color-ink)",
            boxShadow: "var(--shadow-hard-sm)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <Lock size={26} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem", fontFamily: "var(--font-display)" }}>
          Passcode Protected Link
        </h1>

        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          The link <code className="code-badge">/{code}</code> requires
          a passcode before redirecting to its destination.
        </p>

        {error && (
          <div className="alert alert-error" style={{ textAlign: "left", marginBottom: "1.25rem" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label" htmlFor="linkPassword">
              Enter Passcode
            </label>
            <div className="input-password-wrapper">
              <input
                id="linkPassword"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                title={showPassword ? "Hide passcode" : "Show passcode"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", minHeight: "44px" }}
            disabled={loading}
          >
            {loading ? (
              <span>Verifying Passcode...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Access Destination</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </span>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1.5px solid var(--color-ink-faint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            color: "var(--color-ink-muted)",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <Shield size={16} style={{ color: "var(--color-ink)" }} />
          <span>Passcodes are securely protected</span>
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", minHeight: "44px" }}>
            &larr; Return to LinkPulse Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PasswordChallengePage() {
  return (
    <Suspense fallback={<div className="container" style={{ maxWidth: "480px", paddingTop: "5rem", textAlign: "center" }}>Loading...</div>}>
      <PasswordChallengeContent />
    </Suspense>
  );
}
