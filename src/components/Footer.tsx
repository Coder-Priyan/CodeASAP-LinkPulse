import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-color)",
        padding: "2.5rem 0",
        marginTop: "4rem",
        color: "var(--text-muted)",
        fontSize: "0.85rem",
      }}
    >
      <div className="container flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div className="flex items-center gap-2">
          <Activity size={16} color="var(--accent-secondary)" />
          <span>
            <strong>LinkPulse</strong> &mdash; Production-grade URL shortener & analytics engine.
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>Next.js App Router</span>
          <span>&bull;</span>
          <span>TypeScript</span>
          <span>&bull;</span>
          <span>Prisma & PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
}
