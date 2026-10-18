"use client";

import { useEffect, useRef, useState } from "react";
import { LinkItem } from "./LinksTable";
import { X, Download, QrCode as QrIcon, ExternalLink, Copy, Check } from "lucide-react";
import { buildShortUrl } from "@/lib/utils/short-url";

interface QrModalProps {
  link: LinkItem;
  isOpen: boolean;
  onClose: () => void;
}

export function QrModal({ link, isOpen, onClose }: QrModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      const firstBtn = modalRef.current?.querySelector<HTMLElement>("button, a");
      firstBtn?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plainShortUrl = buildShortUrl(link.code);
  const qrTargetUrl = `${plainShortUrl}?src=qr`;
  const pngUrl = `/api/links/${link.id}/qr?format=png`;
  const pngDownloadUrl = `/api/links/${link.id}/qr?format=png&download=true&size=1024`;
  const svgDownloadUrl = `/api/links/${link.id}/qr?format=svg&download=true`;

  const handleCopyTarget = () => {
    navigator.clipboard.writeText(plainShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="modal-backdrop"
    >
      <div
        ref={modalRef}
        className="modal"
        style={{
          maxWidth: "480px",
          textAlign: "center",
        }}
      >
        <div className="modal-header" style={{ textAlign: "left" }}>
          <div>
            <h2 id="qr-modal-title" className="modal-title flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <span className="icon-chip icon-chip-blue">
                <QrIcon size={16} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
              </span>
              <span>Tactile QR Code</span>
            </h2>
            <div style={{ marginTop: "0.25rem" }}>
              <code className="code-badge">/{link.code}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close QR modal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* QR Code Image Preview */}
        <div
          style={{
            display: "inline-block",
            padding: "1.25rem",
            backgroundColor: "var(--color-white)",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-hard)",
            marginBottom: "1.25rem",
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pngUrl}
            alt={`QR code for ${link.code}`}
            width={200}
            height={200}
            style={{ display: "block" }}
          />
        </div>

        {/* Encoded URL Details */}
        <div
          style={{
            backgroundColor: "var(--color-paper)",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "var(--border-thin)",
            boxShadow: "var(--shadow-hard-sm)",
            marginBottom: "1.25rem",
            fontSize: "0.875rem",
            textAlign: "left",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "0.35rem" }}>
            <span style={{ color: "var(--color-muted)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Encoded Short Link
            </span>
            <button
              type="button"
              onClick={handleCopyTarget}
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.15rem 0.45rem", fontSize: "0.75rem", minHeight: "auto" }}
            >
              {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div style={{ fontFamily: "var(--font-mono-family)", fontWeight: 700, wordBreak: "break-all", color: "var(--color-ink)" }}>
            {buildShortUrl(link.code)}
          </div>
        </div>

        {/* Download Buttons with Format & Resolution Badges */}
        <div className="flex items-center gap-3" style={{ justifyContent: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <a
            href={svgDownloadUrl}
            download={`${link.code}-qr.svg`}
            className="btn btn-primary flex items-center gap-2"
            title="Download crisp vector SVG for print flyers, signage and high-DPI displays"
          >
            <Download size={16} />
            <span>Download Vector SVG</span>
          </a>

          <a
            href={pngDownloadUrl}
            download={`${link.code}-qr.png`}
            className="btn btn-secondary flex items-center gap-2"
            title="Download PNG raster image for social cards and web"
          >
            <Download size={16} />
            <span>Download PNG</span>
          </a>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", margin: 0, fontWeight: 600 }}>
          Physical print scans are automatically distinguished from browser visits in your analytics.
        </p>
      </div>
    </div>
  );
}
