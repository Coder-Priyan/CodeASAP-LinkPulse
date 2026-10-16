import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: "520px", paddingTop: "5rem", textAlign: "center" }}>
      <div className="card">
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        >
          <SearchX size={32} color="var(--accent-primary)" />
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>404</h1>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Page or Link Not Found
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", marginBottom: "2rem" }}>
          The page or short link you are looking for doesn&apos;t exist or may have been removed.
        </p>

        <Link href="/" className="btn btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
