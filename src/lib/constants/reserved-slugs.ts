/**
 * Reserved slugs that cannot be used as custom link aliases
 * to prevent collisions with application routes and system endpoints.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "login",
  "logout",
  "register",
  "settings",
  "analytics",
  "import",
  "link",
  "links",
  "link-status",
  "p",
  "static",
  "assets",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "health",
  "ping",
  "terms",
  "privacy",
  "about",
  "contact",
  "not-found",
  "404",
  "500",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase().trim());
}
