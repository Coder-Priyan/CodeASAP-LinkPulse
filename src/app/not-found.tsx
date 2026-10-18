import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PulseMascot } from "@/components/PulseMascot";

export const metadata: Metadata = {
  title: "Page Not Found | LinkPulse",
};

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: "520px", paddingTop: "4.5rem", paddingBottom: "4rem", textAlign: "center" }}>
      <div className="card">
        <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <PulseMascot mood="sad" size={120} />
        </div>

        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>404</h1>
        <h2 style={{ fontSize: "1.35rem", marginBottom: "0.75rem" }}>
          Page or Link Not Found
        </h2>
        <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
          The page or short link you are looking for doesn&apos;t exist, was deactivated, or may have expired.
        </p>

        <div className="flex gap-3" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span>Return Home</span>
          </Link>
          <Link href="/dashboard" className="btn btn-primary inline-flex items-center gap-2">
            <span>Go to Dashboard &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
