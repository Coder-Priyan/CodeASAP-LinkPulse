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
 * Generates a PNG QR code buffer server-side.
 */
export async function generateQrPng(url: string, width = 360): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width,
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
  return QRCode.toString(url, {
    type: "svg",
    width,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
