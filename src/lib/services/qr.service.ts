import QRCode from "qrcode";
import { buildShortUrl } from "../utils/short-url";

/**
 * Builds the canonical short URL with QR scan tracking source marker.
 * e.g., https://linkpulse.io/my-code?src=qr
 */
export function getQrTargetUrl(code: string): string {
  const shortUrl = buildShortUrl(code);
  return `${shortUrl}?src=qr`;
}

/**
 * Normalizes QR size/width to a valid integer between 120 and 2048.
 * Falls back to 360 for NaN, null, undefined, empty, negative, or non-numeric values.
 */
export function normalizeQrSize(rawSize?: any): number {
  if (rawSize === undefined || rawSize === null || rawSize === "") {
    return 360;
  }
  const parsed = typeof rawSize === "number" ? rawSize : Number(String(rawSize).trim());
  if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0) {
    return 360;
  }
  return Math.min(2048, Math.max(120, Math.round(parsed)));
}

/**
 * Generates a PNG QR code buffer server-side.
 */
export async function generateQrPng(url: string, width = 360): Promise<Buffer> {
  const safeWidth = normalizeQrSize(width);
  return QRCode.toBuffer(url, {
    type: "png",
    width: safeWidth,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates an SVG QR code string server-side.
 */
export async function generateQrSvg(url: string, width = 360): Promise<string> {
  const safeWidth = normalizeQrSize(width);
  return QRCode.toString(url, {
    type: "svg",
    width: safeWidth,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
