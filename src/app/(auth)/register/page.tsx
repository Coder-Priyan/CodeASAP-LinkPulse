"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, AlertCircle, Eye, EyeOff, ShieldCheck, QrCode, Sparkles } from "lucide-react";
import { PulseMascot } from "@/components/PulseMascot";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Register | LinkPulse";
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "transparent" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: "Weak (needs 8+ chars)", color: "var(--color-coral)" };
    if (score === 2) return { score: 2, label: "Fair (add digits or symbols)", color: "var(--color-yellow)" };
    if (score === 3) return { score: 3, label: "Good", color: "var(--color-green)" };
    return { score: 4, label: "Strong", color: "var(--color-blue)" };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter them carefully.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to create your account. Please try again.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to register right now. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
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
                <Sparkles size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.35rem", margin: 0 }}>Join LinkPulse</h2>
                <span style={{ fontSize: "0.85rem", color: "var(--color-ink-muted)", fontWeight: 700 }}>
                  Take control of your redirects & clicks
                </span>
              </div>
            </div>

            <div className="auth-brand-mascot" style={{ textAlign: "center", margin: "1.25rem 0" }}>
              <PulseMascot mood="happy" size={130} />
            </div>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <Sparkles size={20} strokeWidth={2.5} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Instant Short Codes</strong>
                  <p>Pick memorable custom aliases or auto-generate clean slugs in milliseconds.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <QrCode size={20} strokeWidth={2.5} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Print-Ready QR Codes</strong>
                  <p>Automatic SVG & PNG QR code export with isolated physical scan tracking.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <ShieldCheck size={20} strokeWidth={2.5} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Complete Safety Filters</strong>
                  <p>Automated domain blocklist protection guarding against malicious destinations.</p>
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
              backgroundColor: "var(--color-blue)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-hard-sm)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
              color: "var(--on-primary)",
            }}
          >
            <UserPlus size={26} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Create Account</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
            Start shortening links and tracking clean stats in seconds
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
            <label className="form-label" htmlFor="name">
              Full Name <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(Optional)</span>
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
            />
          </div>

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

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(at least 8 characters)</span>
            </label>
            <div className="input-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
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

            {password.length > 0 && (
              <div style={{ marginTop: "0.5rem" }} aria-live="polite">
                <div style={{ display: "flex", gap: "5px", height: "6px", marginBottom: "0.35rem" }}>
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      style={{
                        flex: 1,
                        backgroundColor: seg <= strength.score ? strength.color : "var(--color-paper)",
                        border: "1.5px solid var(--color-ink)",
                        borderRadius: "2px",
                        transition: "background-color 0.2s ease",
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                  <span style={{ color: "var(--color-ink-muted)" }}>
                    Strength: <strong style={{ color: "var(--color-ink)" }}>{strength.label}</strong>
                  </span>
                  <span style={{ color: "var(--color-ink-muted)" }}>{password.length}/128 chars</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="input-password-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="form-input"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                title={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              <span>Creating your account...</span>
            ) : (
              <>
                <UserPlus size={20} strokeWidth={2.5} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            fontSize: "0.95rem",
            color: "var(--color-muted)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--color-ink)",
              fontWeight: 800,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  </div>
  );
}
