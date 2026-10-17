# LinkPulse Devlog

### 2026-10-17 — Milestone 5: Production Readiness & Security Hardening
- **What**: Completed end-to-end security hardening, input validation auditing, and resilience enhancements across authentication, API payloads, redirect flows, CSV processing, and QR endpoints.
- **Why**: Protect production infrastructure from brute-force authentication attacks, user enumeration timing side-channels, header injection / HTTP response splitting, CSV formula injection, SVG XSS execution, route collisions, and unhandled JSON parse exceptions.
- **How**:
  - Guarded production session signing: `getJwtSecret()` refuses default dev secrets in production.
  - Implemented IP-based login rate limiting (10 attempts/min) with standard `429 Too Many Requests` responses.
  - Mitigated authentication timing attacks via constant-time dummy 12-round bcrypt comparisons for non-existent users.
  - Enforced a 128-character maximum length on user registration passwords to prevent CPU exhaustion DoS.
  - Added HTTP security headers (`nosniff`, `DENY` frame options, XSS protection, referrer policy, permissions policy) in `next.config.ts`.
  - Added strict `Content-Security-Policy: default-src 'none'` and `nosniff` headers to inline SVG QR code responses.
  - Sanitized destination URLs by rejecting CRLF (`\r`, `\n`) and illegal control characters (`\x00-\x1F`) to eliminate HTTP response splitting.
  - Strengthened CSV formula injection neutralization to handle tabs (`\t`), pipes (`|`), percent (`%`), and newlines in untrimmed cells per OWASP.
  - Protected API routes against malformed JSON bodies, returning `400 Bad Request` instead of `500 Internal Server Error`.
  - Added `"import"` to `RESERVED_SLUGS` to prevent short URL collisions with `/import`.
  - Added 6 new regression tests and fixed test suite typing; verified 100% test pass rate across 14 suites (72/72 tests) and clean production build (28 routes).
- **Requirement**: Milestone 5: Production Readiness & Security Hardening.
- **Next**: Review findings and approve GitHub commit.

### 2026-10-17 — Milestone 4: QR Codes, Bulk Import & Domain Safety Blocklist
- **What**: Built server-side QR code generation (PNG and SVG) with encoded `?src=qr` scan tracking; a CSV bulk import page (`/import`) with downloadable template, RFC-4180 parsing, formula injection neutralization, and 2-step preview/execute workflow; and an admin domain blocklist model and management UI with automatic subdomain matching and immediate redirect cutoff.
- **Why**: Give users offline-to-online engagement measurement via QR codes while recording source markers in a strict allowlist; provide high-volume link onboarding without triggering the single-link creation rate limiter or exposing spreadsheets to formula execution attacks; protect platform reputation by intercepting malicious or phishing destinations before consuming click limits, time expiry checks, or password prompts.
- **How**: Created `src/lib/services/qr.service.ts` using `qrcode` and added an RBAC-guarded download endpoint (`/api/links/[id]/qr`); updated `click.service.ts` to allowlist `"qr"` and `"direct"`; built `csv-import.service.ts` with formula neutralizer (prefixing `=+-@` with `'`), RFC-4180 tokenizer, and hourly bulk rate limiter; added `BlockedDomain` schema model and `blocked-domain.service.ts` with fast hierarchical candidate domain lookups; placed domain block validation immediately after disabled checks in `evaluateLinkRules`; built `QrModal`, bulk import page, and admin blocklist interface; added unit tests across 3 new test files bringing the automated suite to 14 test files and 66 passing tests.
- **Requirement**: QR Codes, Bulk Import, Safety Checks.
- **Next**: Custom branding and custom domains, webhook alerts for threshold breaches, device-based routing.

### 2026-10-17 — Production Hardening & Demo Data Preparation
- **What**: Added a strict confirmation guard (`SEED_CONFIRM="yes"`) and environment-driven passwords to the seed script; restricted one-click login demo credentials to non-production builds with complete dead-code elimination in production bundles; unified short URL construction across components into a centralized helper; differentiated expired link alerts as `EXPIRED` ("Expired" in UI); verified production session cookie security attributes.
- **Why**: Prevent accidental destructive database wipes on shared/live databases, ensure zero default credentials leak into production client assets, eliminate discrepancies in client-side short URL generation, and provide precise operational alert semantics for expired links.
- **How**: Guarded `prisma/seed.ts` with `SEED_CONFIRM`, `SEED_ADMIN_PASSWORD` (min 12 chars), `SEED_USER_PASSWORD` (min 12 chars), and `SEED_LINK_PASSCODE`; wrapped login demo buttons in `process.env.NODE_ENV !== "production"`; implemented `src/lib/utils/short-url.ts` prioritizing `NEXT_PUBLIC_APP_URL` over `window.location.origin`; updated analytics alert typing and badges to `EXPIRED`/`Expired`; added comprehensive Vitest unit tests for the helper and alert classifications.
- **Requirement**: Make LinkPulse safe to run on the live site and prepare it for demo data. Do not commit or push. Do not run the seed script or any prisma or database command. Do not print or log any secret.
- **Next**: Run deployment verification checks and execute seed on production database only when explicitly confirmed.

### 2026-10-16 — Documentation: README Rewrite
- **What**: Replaced the old README with a plain-English document covering features, redirect flow, architecture, data model, env vars, seed data, tests, and API routes.
- **Why**: The old README used marketing language and some details were inaccurate or unverified (seed link codes and click counts had drifted from the actual seed script). Every statement in the new README was checked against the code before writing.
- **How**: Read schema.prisma, all route handlers, service files, seed.ts, .env.example, package.json, and vitest output; cross-checked every claim; ran `npm run test` to confirm the 27-test result.
- **Requirement**: Document the project accurately so a reviewer can understand and run it without guessing.
- **Next**: Add real screenshots to `docs/screenshots/` and fill in the deployment section once deployed.


### 2026-10-16 — Testing: Core Business Logic Test Suite
- **What**: Built a focused 27-test automated suite using Vitest covering rule ordering, click limit concurrency, bot exclusion, URL/alias validation, unique visitors, RBAC, rate limits, analytics, and campaign deletion cascades.
- **Why**: Chose Vitest with isolated per-test database fixtures to test actual PostgreSQL logic directly without mocking out race conditions or atomic queries.
- **How**: Runs via `npm run test`; each test creates its own entities and cleans them up in `afterAll`, never wiping or mutating existing table data.
- **Requirement**: Automated test suite for core business logic.
- **Next**: Milestone 4 (QR code generation, CSV bulk link import, custom domains).

### 2026-10-16 — Milestone 3: Organization, Live Analytics & Hardening
- **What**: Added campaigns and tags for organizing links, a real-time analytics dashboard with date filtering and alerts, bot click exclusions, password attempt rate limiting, and a dedicated visitor salt.
- **Why**: Used database aggregation so live reporting stays fast without caching issues, kept links when a campaign is deleted so metrics aren't destroyed, and excluded bots before incrementing click counters so limits aren't eaten by crawlers.
- **How**: Filters aggregate Prisma queries by user or global role over selected day ranges; bots redirect without atomic click increments; password failures are tracked per IP in a 15-minute sliding window.
- **Requirement**: Campaigns and tags, Analytics dashboard, driven by live data (no hardcoded values), Hardening (bot requests verification, rate limit password attempts, separate env var for visitor-hash salt).
- **Next**: QR code generation, CSV bulk link import, custom branding/domains, webhook alerts for threshold breaches.

### 2026-10-16 — Milestone 2: Redirect Rules & Trustworthy Data
- **What**: Added rule-driven redirects (expiry date, atomic click limits, bcrypt passwords), privacy-safe unique visitor tracking, a two-step link creator with live policy review, post-creation rule editing, and user rate limiting.
- **Why**: Chose an atomic conditional database counter to eliminate concurrency race conditions on click limits, and hashed visitor IPs so we count unique people without saving raw personal data.
- **How**: Evaluates rules in a fixed order (disabled, expired, limit, password) in the business layer; visits atomically increment `clicksCount` and log hashed visitors in the background.
- **Requirement**: Reliable Redirection, Basic Rules, Link Creation Workflow, Click Tracking.
- **Next**: Campaigns and tags, analytics dashboard (by period and campaign), QR codes, CSV bulk import, admin domain blocklist, rate limit on password attempts.

### 2026-10-15 — Milestone 1: Core URL Shortener & Analytics
- **What**: Built the core URL shortener with role-based auth (USER and ADMIN), custom aliases, fast redirects, bot-filtered click logging, and a personal dashboard plus admin console.
- **Why**: Chose lightweight JWT cookies and custom application logic instead of heavy third-party auth services, to keep redirects fast and avoid vendor lock-in.
- **How**: Visiting `/[code]` fetches the active link from PostgreSQL and returns an instant HTTP 307 redirect while recording the click in the background using Next.js `after()`.
- **Requirement**: Unified Link Flow, Reliable Redirection, Click Tracking (with bot filtering), Role-based access.
- **Next**: Link expiration enforcement, click limits, password-protected links, campaigns, tags, and QR codes.
