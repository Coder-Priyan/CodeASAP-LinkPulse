import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiting for CSP reports: max 30 reports per minute per IP
const MAX_CSP_REPORTS_PER_MINUTE = 30;
const CSP_WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 10 * 1024; // 10 KB max payload read
const MAX_LOG_LENGTH = 1024; // Max ~1 KB logged payload

const cspReportTimestamps = new Map<string, number[]>();

/**
 * Sanitizes log string by removing control characters, tabs, and newlines
 * to prevent log injection / log splitting attacks, and truncating to max length.
 */
function sanitizeForLog(input: string, maxLength = MAX_LOG_LENGTH): string {
  if (!input) return "";
  // Strip control characters (\x00-\x1F, \x7F-\x9F), replace \r, \n, \t with space
  const cleaned = input
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + " [truncated]" : cleaned;
}

/**
 * Reads request body stream enforcing a hard byte limit during the read itself,
 * preventing memory exhaustion even when Content-Length header is omitted or spoofed.
 */
async function readCappedBody(request: NextRequest, maxBytes: number): Promise<{ body: string; exceeded: boolean }> {
  if (!request.body) {
    try {
      const text = await request.text();
      return { body: text.slice(0, maxBytes), exceeded: text.length > maxBytes };
    } catch {
      return { body: "", exceeded: false };
    }
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          // Cancel stream early to release network socket and prevent memory growth
          await reader.cancel("Payload exceeded maximum allowed byte size.");
          return { body: "", exceeded: true };
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const concatenated = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    concatenated.set(chunk, offset);
    offset += chunk.length;
  }

  const decoded = new TextDecoder().decode(concatenated);
  return { body: decoded, exceeded: false };
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const now = Date.now();
    const windowStart = now - CSP_WINDOW_MS;

    const timestamps = (cspReportTimestamps.get(ip) || []).filter((t) => t > windowStart);
    if (timestamps.length >= MAX_CSP_REPORTS_PER_MINUTE) {
      return new NextResponse(null, { status: 429 });
    }

    // 1. Content-Length header pre-check (fast fail)
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }

    // 2. Enforce hard 10 KB cap during actual body read
    const { body: rawBody, exceeded } = await readCappedBody(request, MAX_BODY_BYTES);
    if (exceeded) {
      return new NextResponse(null, { status: 413 });
    }

    timestamps.push(now);
    cspReportTimestamps.set(ip, timestamps);

    // 3. Safely parse JSON if possible, otherwise log sanitized string
    try {
      const parsed = JSON.parse(rawBody);
      const report = parsed["csp-report"] || parsed;

      const docUri = sanitizeForLog(String(report["document-uri"] || ""), 250);
      const blockedUri = sanitizeForLog(String(report["blocked-uri"] || ""), 250);
      const directive = sanitizeForLog(String(report["violated-directive"] || ""), 150);

      console.warn(
        `[CSP-Report-Only Violation] doc="${docUri}" blocked="${blockedUri}" directive="${directive}"`
      );
    } catch {
      console.warn("[CSP-Report-Only Raw]", sanitizeForLog(rawBody, MAX_LOG_LENGTH));
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[CSP Report Route] Error processing report:", err);
    return new NextResponse(null, { status: 204 }); // Always 204 to client
  }
}
