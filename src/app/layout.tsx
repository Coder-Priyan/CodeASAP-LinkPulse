import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "LinkPulse — Production URL Shortener & Analytics",
  description:
    "Fast, reliable URL shortener with real-time analytics, automated bot detection, and multi-tenant role-based access control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans)" }}>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 180px)" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
