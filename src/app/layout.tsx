import type { Metadata } from "next";
import { Lilita_One, Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const fontDisplay = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontSans = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LinkPulse — Short links, clear numbers",
    template: "%s | LinkPulse",
  },
  description:
    "A friendly, rule-driven URL shortener with clear analytics, QR codes, and privacy-safe visitor tracking.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
      <body>
        <Navbar />
        <main id="main-content" style={{ minHeight: "calc(100vh - 160px)" }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
