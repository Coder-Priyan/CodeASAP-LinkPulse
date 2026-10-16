# LinkPulse Devlog

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
