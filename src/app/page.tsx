import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { PulseMascot } from "@/components/PulseMascot";
import { buildShortUrl } from "@/lib/utils/short-url";
import {
  Link2,
  Share2,
  BarChart2,
  ShieldCheck,
  QrCode,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  const sampleShortUrl = buildShortUrl("q3-metrics");

  return (
    <div className="page-container" style={{ paddingTop: "1rem", paddingBottom: "5rem" }}>
      {/* Playful & Mature Hero Section */}
      <section className="hero-neo">
        <div className="hero-companion-deck">
          <PulseMascot mood="happy" size={120} />
          <div className="mascot-speech-bubble">
            Fast redirects. Clear click numbers.
          </div>
        </div>

        <h1 className="hero-title">
          Short links, clear numbers.
        </h1>

        <p className="hero-desc">
          Create short links with custom aliases, granular redirect rules, and instant click analytics &mdash; recording visits, referrers, and devices without third-party ad networks or cookie banners.
        </p>

        <div className="hero-actions">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg flex items-center gap-2">
              <span>Open Dashboard</span>
              <ArrowRight size={20} strokeWidth={2.5} />
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary btn-lg flex items-center gap-2">
                <span>Start Shortening Free</span>
                <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Desktop Product Simulator Showcase - Labeled Demo */}
        <div className="hero-simulator-card" aria-label="Interactive LinkPulse Preview (Sample Data)">
          <div className="simulator-header">
            <div className="simulator-window-dots">
              <span className="simulator-dot simulator-dot-coral" />
              <span className="simulator-dot simulator-dot-yellow" />
              <span className="simulator-dot simulator-dot-green" />
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-paper flex items-center gap-1" style={{ fontSize: "0.75rem", backgroundColor: "var(--color-yellow-light)" }}>
                <Sparkles size={12} strokeWidth={2.5} />
                <span>Interactive Demo (Sample Data)</span>
              </span>
              <span className="badge badge-active flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                <CheckCircle2 size={13} strokeWidth={2.5} />
                <span>Demo Preview</span>
              </span>
            </div>
          </div>

          <div className="simulator-link-row">
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                Sample Short Link
              </div>
              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <code className="code-badge" style={{ fontSize: "1.05rem" }}>
                  {sampleShortUrl}
                </code>
                <span className="badge badge-active flex items-center gap-1">
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                  <span>Active</span>
                </span>
                <span className="badge badge-paper flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                  <Lock size={12} strokeWidth={2.5} />
                  <span>Passcode Protected</span>
                </span>
                <span className="badge badge-paper flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                  <Clock size={12} strokeWidth={2.5} />
                  <span>Expires in 14d</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="btn btn-secondary btn-sm"
                style={{ pointerEvents: "none", cursor: "default" }}
              >
                <Copy size={14} />
                <span>Copy</span>
              </span>
              <span
                className="btn btn-secondary btn-sm"
                style={{ pointerEvents: "none", cursor: "default" }}
              >
                <ExternalLink size={14} />
              </span>
            </div>
          </div>

          <div className="simulator-stats-strip">
            <div className="simulator-stat-item">
              <div className="sim-num">1,482</div>
              <div className="sim-lbl">Total Visits</div>
            </div>
            <div className="simulator-stat-item">
              <div className="sim-num">1,120</div>
              <div className="sim-lbl">Unique Visitors</div>
            </div>
            <div className="simulator-stat-item">
              <div className="sim-num">362</div>
              <div className="sim-lbl">QR Scans</div>
            </div>
            <div className="simulator-stat-item">
              <div className="sim-num" style={{ color: "var(--color-blue)" }}>1,120</div>
              <div className="sim-lbl">Direct Clicks</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step "How it works" Strip */}
      <section className="how-it-works-section" aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className="how-it-works-title">
          How LinkPulse works
        </h2>

        <div className="how-it-works-grid">
          <div className="card step-card">
            <div className="step-icon-badge" style={{ background: "var(--color-blue-light)" }}>
              <Link2 size={24} strokeWidth={2.5} />
            </div>
            <div className="step-badge">Step 1</div>
            <h3 className="step-title">Paste & Shorten</h3>
            <p className="step-desc">
              Paste any long URL and choose a memorable custom alias or generate a clean 6-character code instantly.
            </p>
          </div>

          <div className="card step-card">
            <div className="step-icon-badge" style={{ background: "var(--color-yellow)" }}>
              <Share2 size={24} strokeWidth={2.5} />
            </div>
            <div className="step-badge">Step 2</div>
            <h3 className="step-title">Set Guardrails</h3>
            <p className="step-desc">
              Optionally configure an expiration date, a maximum visit limit, or a secure passcode before redirecting.
            </p>
          </div>

          <div className="card step-card">
            <div className="step-icon-badge" style={{ background: "var(--color-green)" }}>
              <BarChart2 size={24} strokeWidth={2.5} />
            </div>
            <div className="step-badge">Step 3</div>
            <h3 className="step-title">Inspect Clicks</h3>
            <p className="step-desc">
              Observe real-time click volume, unique visitors, browser types, and QR scan attribution in a clean analytics dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Mature Feature Pillars */}
      <section style={{ marginTop: "4rem" }} aria-labelledby="features-heading">
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h2 id="features-heading" style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>
            Built for reliability and control
          </h2>
          <p style={{ color: "var(--color-muted)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto", fontWeight: 600 }}>
            Every link is guarded by server-side rules, privacy-safe analytics, and automated safety filters.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          <div className="card">
            <div className="icon-chip icon-chip-blue" style={{ width: "44px", height: "44px", marginBottom: "1.25rem" }}>
              <ShieldCheck size={22} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Granular Operational Rules</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
              Set precise expiration dates, click limits, and passcodes. Links that reach their threshold display a friendly explanation page instead of dropping visitors into broken redirects.
            </p>
          </div>

          <div className="card">
            <div className="icon-chip icon-chip-yellow" style={{ width: "44px", height: "44px", marginBottom: "1.25rem" }}>
              <QrCode size={22} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Tactile QR Engine</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
              Download crisp, high-contrast QR codes in SVG or PNG formats. Each QR code is automatically tagged to isolate physical print scans from browser clicks in your analytics dashboard.
            </p>
          </div>

          <div className="card">
            <div className="icon-chip icon-chip-coral" style={{ width: "44px", height: "44px", marginBottom: "1.25rem" }}>
              <ShieldAlert size={22} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Subdomain Safety Shield</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
              Centralized platform domain blocklist automatically blocks malicious destinations and all associated subdomains across link creation, bulk CSV import, and instant redirect evaluation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
