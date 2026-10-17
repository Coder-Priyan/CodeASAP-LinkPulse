"use client";

import { LinkItem } from "./LinksTable";
import { X, Download, QrCode as QrIcon, ExternalLink } from "lucide-react";
import { buildShortUrl } from "@/lib/utils/short-url";

interface QrModalProps {
  link: LinkItem;
  isOpen: boolean;
  onClose: () => void;
}

export function QrModal({ link, isOpen, onClose }: QrModalProps) {
  if (!isOpen) return null;

  const qrTargetUrl = `${buildShortUrl(link.code)}?src=qr`;
  const pngUrl = `/api/links/${link.id}/qr?format=png`;
  const pngDownloadUrl = `/api/links/${link.id}/qr?format=png&download=true`;
  const svgDownloadUrl = `/api/links/${link.id}/qr?format=svg&download=true`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          textAlign: "center",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem", textAlign: "left" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }} className="flex items-center gap-2">
              <QrIcon size={20} color="var(--accent-primary)" />
              <span>QR Code</span>
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--accent-secondary)", fontFamily: "monospace" }}>
              /{link.code}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.35rem" }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* QR Code Image Preview */}
        <div
          style={{
            display: "inline-block",
            padding: "1rem",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginBottom: "1.25rem",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pngUrl}
            alt={`QR code for ${link.code}`}
            width={220}
            height={220}
            style={{ display: "block" }}
          />
        </div>

        {/* Encoded URL Details */}
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            marginBottom: "1.25rem",
            fontSize: "0.85rem",
            textAlign: "left",
            wordBreak: "break-all",
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
            Encoded Target URL
          </div>
          <a
            href={qrTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <span>{qrTargetUrl}</span>
            <ExternalLink size={12} style={{ flexShrink: 0 }} />
          </a>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-3" style={{ justifyContent: "center", marginBottom: "1rem" }}>
          <a
            href={pngDownloadUrl}
            download={`${link.code}-qr.png`}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={14} />
            <span>Download PNG</span>
          </a>

          <a
            href={svgDownloadUrl}
            download={`${link.code}-qr.svg`}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={14} />
            <span>Download SVG</span>
          </a>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
          Scans encode <code style={{ color: "var(--accent-secondary)" }}>?src=qr</code> to count QR visits separately in analytics.
        </p>
      </div>
    </div>
  );
}
