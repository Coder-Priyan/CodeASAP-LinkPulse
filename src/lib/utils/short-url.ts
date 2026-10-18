/**
 * Short URL helper
 *
 * Resolves the public base URL and builds a short link URL.
 * Prefers NEXT_PUBLIC_APP_URL when set, otherwise falls back to
 * window.location.origin in the browser, with any trailing slash removed.
 */

export function getShortUrlBase(): string {
  const isProduction = process.env.NODE_ENV === "production";

  // Outside production: use active window.location.origin so short URLs reflect the actual dev server port
  if (!isProduction && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  // In production: prefer configured NEXT_PUBLIC_APP_URL
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envBase) {
    return envBase.replace(/\/+$/, "");
  }

  // Fallback to window.location.origin in production if NEXT_PUBLIC_APP_URL is not set
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "";
}

export function buildShortUrl(code: string): string {
  const base = getShortUrlBase();
  const cleanCode = code ? code.replace(/^\/+/, "") : "";
  return base ? `${base}/${cleanCode}` : `/${cleanCode}`;
}
