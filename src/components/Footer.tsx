import Link from "next/link";
import { Activity } from "lucide-react";
import pkg from "../../package.json";

export function Footer() {
  return (
    <footer className="footer-neo" role="contentinfo">
      <div className="container footer-neo-inner">
        <div className="footer-brand-deck">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--color-blue)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--on-primary)",
                border: "1.5px solid var(--color-ink)",
                boxShadow: "1px 1px 0 var(--color-ink)",
              }}
            >
              <Activity size={16} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "var(--font-display-family)", fontSize: "1.2rem", color: "var(--color-ink)" }}>
              LinkPulse
            </span>
            <span
              className="badge badge-paper"
              style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", marginLeft: "0.35rem" }}
            >
              v{pkg.version}
            </span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginTop: "0.35rem", fontWeight: 600 }}>
            Rule-driven short links, print-ready QR codes, and clear first-party visit telemetry.
          </p>
        </div>

        <div className="footer-links-deck">
          <div className="flex items-center gap-4" style={{ flexWrap: "wrap", fontSize: "0.875rem", fontWeight: 700 }}>
            <Link href="/dashboard" className="footer-nav-link">
              Dashboard
            </Link>
            <Link href="/analytics" className="footer-nav-link">
              Analytics
            </Link>
            <Link href="/import" className="footer-nav-link">
              CSV Import
            </Link>
            <Link href="/login" className="footer-nav-link">
              Sign In
            </Link>
          </div>

          <div
            className="flex items-center gap-2"
            style={{
              marginTop: "0.65rem",
              flexWrap: "wrap",
              fontSize: "0.8rem",
              color: "var(--color-muted)",
              fontWeight: 600,
            }}
          >
            <span>Next.js App Router</span>
            <span aria-hidden="true">&bull;</span>
            <span>TypeScript</span>
            <span aria-hidden="true">&bull;</span>
            <span>Prisma &amp; PostgreSQL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
