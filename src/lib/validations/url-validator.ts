export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Validates and normalizes destination URLs.
 * Ensures the protocol is http or https and guards against XSS schemes.
 */
export function validateUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "Destination URL is required." };
  }

  // Reject CRLF and control characters to guard against header injection & HTTP response splitting
  if (/[\r\n\x00-\x1F]/.test(rawUrl)) {
    return { isValid: false, error: "URL cannot contain newline or control characters." };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length > 2048) {
    return { isValid: false, error: "URL exceeds maximum allowed length of 2048 characters." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: "Invalid URL format. Please include http:// or https:// (e.g. https://example.com).",
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      isValid: false,
      error: "Only HTTP and HTTPS URLs are allowed.",
    };
  }

  if (!parsed.hostname || parsed.hostname.length < 3) {
    return {
      isValid: false,
      error: "URL must contain a valid domain name.",
    };
  }

  // Prevent internal loops back to LinkPulse host itself if provided in env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).host;
      if (parsed.host === appHost) {
        return {
          isValid: false,
          error: "Destination URL cannot be a LinkPulse redirect itself.",
        };
      }
    } catch {
      // Ignore host comparison failure if env appUrl is not parsed
    }
  }

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
  };
}
