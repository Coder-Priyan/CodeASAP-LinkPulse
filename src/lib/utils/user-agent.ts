/**
 * Utility functions for user-agent parsing, device classification,
 * browser detection, and bot filtering.
 */

const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baidu/i,
  /duckduck/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest/i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /postmanruntime/i,
  /go-http-client/i,
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
];

/**
 * Returns true if the user agent is an automated bot or preview crawler.
 */
export function isBot(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== "string") {
    return true; // No UA provided is typically automated or malicious
  }
  const ua = userAgent.trim();
  if (ua.length === 0) return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(ua));
}

/**
 * Detects device category: mobile, tablet, desktop, or unknown.
 */
export function detectDevice(userAgent?: string | null): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk/i.test(ua)) {
    return "tablet";
  }

  if (/mobi|iphone|ipod|android.*mobile|blackberry|bb10|phone|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return "mobile";
  }

  if (/windows|macintosh|mac os x|linux|cros/i.test(ua)) {
    return "desktop";
  }

  return "unknown";
}

/**
 * Detects browser family name.
 */
export function detectBrowser(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent;

  if (/edg\/|edge\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Browser";
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) return "Safari";
  if (/msie|trident/i.test(ua)) return "Internet Explorer";

  return "Other";
}

/**
 * Detects operating system.
 */
export function detectOS(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent;

  if (/windows nt 10/i.test(ua)) return "Windows 10/11";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os x/i.test(ua) && !/iphone|ipad|ipod/i.test(ua)) return "macOS";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/linux/i.test(ua)) return "Linux";

  return "Other";
}
