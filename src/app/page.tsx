import Link from "next/link";
import { Zap, ShieldCheck, BarChart3, Bot, ArrowRight, Gauge, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guard";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-pill">
          <Zap size={14} color="#38bdf8" />
          <span>Engineered for sub-10ms redirects</span>
        </div>

        <h1 className="hero-title">
          Intelligent Short Links. <br />
          <span>Real-Time Pulse Analytics.</span>
        </h1>

        <p className="hero-desc">
          LinkPulse delivers instant URL shortening with automated crawler and bot
          filtering, multi-tenant role-based security, and production-grade PostgreSQL telemetry.
        </p>

        <div className="flex items-center justify-between" style={{ justifyContent: "center", gap: "1rem" }}>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: "0.8rem 1.75rem", fontSize: "1rem" }}>
              <span>Open Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary" style={{ padding: "0.8rem 1.75rem", fontSize: "1rem" }}>
                <span>Get Started Free</span>
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn btn-secondary" style={{ padding: "0.8rem 1.75rem", fontSize: "1rem" }}>
                <span>Demo Sign In</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ marginTop: "2rem", marginBottom: "4rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                background: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Gauge size={22} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Decoupled Fast Redirects
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              HTTP 307 temporary redirects dispatch immediately using indexed lookups while
              logging runs asynchronously without holding the visitor response.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                background: "rgba(6, 182, 212, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Bot size={22} color="var(--accent-secondary)" />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Automated Bot Filtering
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Search spiders, preview unfurlers, and CLI scrapers are filtered out in the
              application layer so click counts only measure genuine humans.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                background: "rgba(168, 85, 247, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <ShieldCheck size={22} color="#c084fc" />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Multi-Tenant Role Auth
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Strict role isolation between <code>USER</code> and <code>ADMIN</code>. Regular
              users exclusively see their own links while admins can oversee and moderate the full registry.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <BarChart3 size={22} color="var(--success)" />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Preserved Analytics History
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Deactivated or expired links keep their entire historical click logs and referrers
              intact for audits, reports, and future re-activations.
            </p>
          </div>
        </div>
      </section>

      {/* Production Quality Highlights */}
      <section className="card" style={{ padding: "2.5rem", marginBottom: "3rem" }}>
        <div style={{ maxWidth: "700px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            Production-Ready Architecture
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="flex items-center gap-2" style={{ fontSize: "0.925rem" }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Layered business logic architecture</span>
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: "0.925rem" }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Reserved slug & collision defense</span>
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: "0.925rem" }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Full PostgreSQL schema with future fields</span>
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: "0.925rem" }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Vercel + Hosted DB ready</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
