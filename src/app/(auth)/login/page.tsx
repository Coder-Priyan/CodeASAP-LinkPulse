"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, AlertCircle, KeyRound, Shield, User, Eye, EyeOff, ShieldCheck, Lock, BarChart2 } from "lucide-react";
import { PulseMascot } from "@/components/PulseMascot";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Login | LinkPulse";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Please check your email and password and try again.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to sign in. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="container" style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
      <div className="auth-split-layout">
        {/* Left Desktop Brand Panel */}
        <div className="auth-brand-panel">
          <div>
            <div className="auth-brand-header">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-yellow)",
                  border: "var(--border-thick)",
                  boxShadow: "var(--shadow-hard-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-ink)",
                  flexShrink: 0,
                }}
              >
                <KeyRound size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.35rem", margin: 0 }}>LinkPulse Console</h2>
                <span style={{ fontSize: "0.85rem", color: "var(--color-ink-muted)", fontWeight: 700 }}>
                  Safe, private short link telemetry
                </span>
              </div>
            </div>

            <div className="auth-brand-mascot" style={{ textAlign: "center", margin: "1.25rem 0" }}>
              <PulseMascot mood="happy" size={130} />
            </div>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <ShieldCheck size={20} strokeWidth={2.5} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>First-Party Click Telemetry</strong>
                  <p>First-party visit and referrer telemetry recorded directly to your database.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <Lock size={20} strokeWidth={2.5} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Granular Link Guardrails</strong>
                  <p>Enforce passcodes, hard visit caps, and time expirations with friendly intercept notices.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <BarChart2 size={20} strokeWidth={2.5} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Actionable Telemetry Cockpit</strong>
                  <p>Inspect visit volume, unique human visitors, referrer sources, and offline QR scans.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.75rem", fontSize: "0.85rem", color: "var(--color-ink-muted)", fontWeight: 700 }}>
            LinkPulse &bull; Built for precision, speed, and character.
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-yellow)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-hard-sm)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
              color: "var(--color-ink)",
            }}
          >
            <KeyRound size={26} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Welcome Back</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
            Sign in to manage your short links and view stats
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate={false}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", fontSize: "1rem" }}
            disabled={loading}
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <LogIn size={20} strokeWidth={2.5} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials (development only, eliminated from production bundle) */}
        {process.env.NODE_ENV !== "production" && (
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "var(--border-thick)",
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-muted)",
                marginBottom: "0.75rem",
                fontWeight: 800,
              }}
            >
              Demo Credentials (Pre-seeded)
            </p>

            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: "1 1 140px" }}
                onClick={() => fillCredentials("admin@linkpulse.io", "Password123!")}
              >
                <Shield size={16} />
                <span>Admin Demo</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: "1 1 140px" }}
                onClick={() => fillCredentials("alex@techcorp.dev", "Password123!")}
              >
                <User size={16} />
                <span>User Demo</span>
              </button>
            </div>
          </div>
        )}

        <p
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            fontSize: "0.95rem",
            color: "var(--color-muted)",
          }}
        >
          Don&apos;t have an account yet?{" "}
          <Link
            href="/register"
            style={{
              color: "var(--color-ink)",
              fontWeight: 800,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  </div>
  );
}
