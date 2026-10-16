"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, Shield } from "lucide-react";
import Link from "next/link";

export default function PasswordChallengePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string) || "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Please enter the password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/links/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Incorrect password.");
      }

      if (data.destinationUrl) {
        window.location.href = data.destinationUrl;
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to verify password.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "480px", paddingTop: "5rem" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "var(--radius-md)",
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <Lock size={26} color="var(--accent-primary)" />
        </div>

        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Password Protected Link
        </h1>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          The link <code style={{ color: "var(--accent-secondary)", fontWeight: 600 }}>/{code}</code> requires
          a password before redirecting to its destination.
        </p>

        {error && (
          <div className="alert alert-error" style={{ textAlign: "left" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label" htmlFor="linkPassword">
              Enter Passcode
            </label>
            <input
              id="linkPassword"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
            disabled={loading}
          >
            {loading ? (
              <span>Verifying Passcode...</span>
            ) : (
              <>
                <span>Access Destination</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
          }}
        >
          <Shield size={14} />
          <span>Passcodes are salted & hashed using bcrypt</span>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <Link href="/" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            &larr; Return to LinkPulse Home
          </Link>
        </div>
      </div>
    </div>
  );
}
