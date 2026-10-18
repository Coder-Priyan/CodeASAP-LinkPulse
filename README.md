# LinkPulse

A URL shortener with analytics. Shorten a URL, set rules on it — expiry date, click limit, password — group links into campaigns, generate QR codes, import links via CSV, and inspect click data in a live dashboard. Each rule is enforced on every visit, not just at creation time.

**Team:** Code ASAP — Innovista 2026 Hackathon, Round 2: Implementation

---

## Features

**Links**
- Create a short link with an auto-generated 6-character alphanumeric code or a custom alias (3–32 chars)
- Optional title (trimmed, max 255 chars, empty-to-null); destination URL and alias validated at creation and edit time
- Server-side QR code generation (view and download in PNG and SVG formats) with encoded `?src=qr` source marker and customizable size (`?size=120..2048`, default 360, with safe fallback on invalid/NaN values)
- Admins can disable any link; owners can toggle their own

**Redirect rules** (evaluated in centralized order on every visit in `evaluateLinkRules`)
1. **Disabled** — blocks redirect immediately with a reason (`/link-status?status=DISABLED`)
2. **Blocked Domain** — platform security check against admin domain blocklist; intercepts unsafe destinations immediately without consuming click limits or exposing password prompts (`/link-status?status=BLOCKED`)
3. **Expiry date** — link stops redirecting after the set date and time (`/link-status?status=EXPIRED`)
4. **Click limit** — enforced atomically; concurrent visits cannot exceed the cap (`/link-status?status=LIMIT_REACHED`)
5. **Password protection** — visitor must pass a password challenge before being redirected (`/p/{code}`); source marker (`?src=qr`) survives the password flow

**Click tracking & QR scans**
- Every human visit is stored as a `ClickEvent` with device, browser, OS, sanitized referrer, privacy-safe visitor hash, and `source` (`"qr"` or `"direct"`)
- Strict source allowlist: only `"qr"` or `"direct"` is stored; unknown or raw parameters default to `"direct"`
- Self-reported marker note: the `?src=qr` marker is self-reported (anyone can append `?src=qr` to a URL), so it is a measure of QR engagement rather than cryptographic proof
- Scans displayed alongside total clicks per link in the dashboard and on the analytics page (total QR scans and QR vs direct split)
- Bots (crawlers, preview fetchers, CLI tools) are detected and skipped — they create no events and do not consume click limits
- Click logging runs after the HTTP response via Next.js `after()`, so it never delays the redirect
- Unique visitors identified with a salted SHA-256 hash of IP + User-Agent; raw IP never stored

**CSV Bulk Import**
- Dedicated bulk upload page (`/import`) linked from the dashboard; supports up to 200 links and 1 MB per file
- Downloadable CSV template (`destination_url,alias,title`)
- **Step 1: Preview & Validation**: row-by-row parsing with RFC-4180 compliance (UTF-8 BOM, CRLF, quoted commas, escaped quotes); checks URL format, alias validity, duplicate aliases in file, duplicate aliases in database, and blocked domains; displays line numbers with status pills and errors
- **Step 2: Execution**: imports valid rows into the authenticated user's account and skips invalid rows with clear error summaries; supports optional batch assignment of `campaignId` and `tagIds` with strict multi-tenant ownership validation (rejects foreign IDs with 403 Forbidden)
- **Formula injection defense**: any text cell beginning with `=`, `+`, `-`, or `@` is automatically neutralized by prefixing with an apostrophe (`'`) to prevent spreadsheet command execution
- **Rate limiting**: isolated bulk import rate limit (10 imports per hour per user); bypasses the single-link 15/min limiter

**Admin Domain Blocklist**
- Dedicated model `BlockedDomain` (domain, reason, createdById, createdAt)
- Admin console (`/admin`) to add and remove blocked domains; standard users receive 403 on all blocklist endpoints
- Normalized domain input (lowercase, trimmed, stripped of protocol, paths, and `www.`)
- Automatic subdomain matching: blocking `evil.com` blocks all subdomains like `login.evil.com` and `sub.deep.evil.com`, but does not overblock unrelated domains
- Enforced at link creation, link editing, bulk import, and immediately on existing link redirects without deleting click history

**Organization**
- Campaigns: group links; deleting a campaign unlinks it from its links but does not delete them or their click history
- Tags: label links with a name and color; multiple tags per link
- Filter the dashboard by campaign or tag

**Analytics**
- Period selector: 7 days, 30 days, all time
- Metrics: total clicks, unique visitors, QR scans, active links, total links
- Clicks over time (daily buckets for the selected period)
- Source breakdown: QR scans vs direct/web visits with visual split bars
- Campaign performance: total links, total clicks, top link per campaign
- Top links, device breakdown, browser breakdown, referrer breakdown
- Link alerts: `DISABLED`, `EXPIRED`, `EXPIRING_SOON` (within 72 h), `LIMIT_REACHED` (clicks ≥ limit), `NEAR_LIMIT` (clicks ≥ 80% of limit)
- Multi-tenant isolation: users see only their own data; admins can view platform-wide totals

**Security**
- Passwords hashed with bcrypt (12 rounds); plain passwords never stored or compared in plaintext
- Password attempts rate-limited: 5 failed attempts per 15-minute window per link per IP
- IP stored only as a salted SHA-256 hash in `PasswordAttempt`; raw IP never persisted
- Single link creation rate-limited: 15 links per minute per user (DB-backed sliding window)
- Bulk import rate-limited: 10 imports per hour per user
- Sessions are signed JWTs (jose, HS256) stored in `httpOnly` cookies; expire after 7 days

**Roles**
- `USER`: sees and manages only their own links, campaigns, tags, and analytics; imports links into their own account
- `ADMIN`: sees all links and platform-wide analytics; can disable any link; manages domain blocklist

---

## Not built yet

- Custom domains
- Device-based redirect targeting
- Public API with API keys
- Link-in-bio pages
- GeoIP location breakdown (the `country` column exists in the schema but is never written)

---

## How it works: redirect flow

```
GET /{code}?src=...
│
├─ Link not found?
│   └─ → /link-status?status=NOT_FOUND
│
├─ Evaluate rules (link.service.ts: evaluateLinkRules)
│   ├─ 1. isActive === false         → /link-status?status=DISABLED
│   ├─ 2. isDomainBlocked(url)       → /link-status?status=BLOCKED
│   ├─ 3. expiresAt ≤ now            → /link-status?status=EXPIRED
│   ├─ 4. clicksCount ≥ clickLimit   → /link-status?status=LIMIT_REACHED
│   └─ 5. passwordHash set           → /p/{code}?src=...  (password prompt page)
│
├─ Bot? (user-agent.ts: isBot)
│   └─ yes → HTTP 307, no counter increment, no ClickEvent written
│
├─ Atomic increment (Prisma $executeRaw)
│   └─ UPDATE "Link" SET "clicksCount" = "clicksCount" + 1
│      WHERE "id" = $id AND "clicksCount" < $limit
│      → if 0 rows updated, a concurrent visit filled the last slot → LIMIT_REACHED
│
├─ Schedule click logging via after() — records source ("qr" | "direct") after response is sent
│
└─ HTTP 307 + Cache-Control: private, no-cache, no-store, must-revalidate
```

307 (temporary redirect) with `no-store` ensures browsers and CDN caches never cache the response, so rule changes and domain blocks take effect immediately on the next visit.

---

## Architecture

```
LinkPulse/
├── prisma/
│   ├── schema.prisma       PostgreSQL schema (User, Link, ClickEvent, PasswordAttempt, Campaign, Tag, LinkTag, BlockedDomain)
│   └── seed.ts             Seed script (destructive; see Seed data section)
├── src/
│   ├── app/
│   │   ├── (auth)/         Login and register pages
│   │   ├── (dashboard)/    User dashboard, CSV bulk import (/import), and admin console (/admin)
│   │   ├── analytics/      Analytics dashboard page
│   │   ├── [code]/         Redirect route handler
│   │   ├── p/[code]/       Password prompt page
│   │   ├── link-status/    Status page (disabled, blocked, expired, limit reached, not found)
│   │   └── api/            Route handlers (see API overview)
│   ├── components/         Navbar, Footer, LinkCreateForm, EditLinkModal, LinksTable, QrModal
│   └── lib/
│       ├── auth/           Session (JWT + cookie) and role guards
│       ├── constants/      Reserved slugs list
│       ├── services/       Business logic: link, click, qr, csv-import, blocked-domain, analytics, campaign, tag, rate-limiter, user
│       ├── utils/          Code generator, user-agent parser, visitor hash, short-url
│       └── validations/    URL validator, alias validator
├── test/                   Vitest test suite (14 test files)
├── docs/
│   └── DEVLOG.md           Per-milestone progress log
├── .env.example
└── package.json
```

**Layering:** Next.js route handlers → service functions → Prisma client → PostgreSQL. Route handlers handle HTTP parsing and error mapping. Services own all business logic. Prisma is never called directly from route handlers.

---

## Data model

```
User ──< Link ──< ClickEvent
     │        └─< LinkTag >─ Tag
     │        └── Campaign (nullable FK)
     │        └─< PasswordAttempt
     └──< BlockedDomain
```

| Model | Key fields | Notes |
|---|---|---|
| `User` | `id`, `email`, `passwordHash`, `role` | role: `USER` or `ADMIN` |
| `Link` | `code` (unique), `destinationUrl`, `title`, `isActive`, `expiresAt`, `clickLimit`, `clicksCount`, `passwordHash` | `clicksCount` is the atomic counter; `passwordHash` is bcrypt |
| `ClickEvent` | `linkId`, `timestamp`, `device`, `browser`, `os`, `referrer`, `visitorHash`, `source` | `source` strictly allowlisted to `"qr"` or `"direct"`; raw IP never stored |
| `BlockedDomain` | `domain` (unique), `reason`, `createdById`, `createdAt` | Normalized domain; blocks root and all subdomains platform-wide |
| `PasswordAttempt` | `linkId`, `ipHash`, `success` | IP stored as SHA-256 hash only |
| `Campaign` | `userId`, `name` | Unique per user; links get `campaignId = null` on delete |
| `Tag` | `userId`, `name`, `color` | Unique per user |
| `LinkTag` | `linkId`, `tagId` | Join table; composite primary key |

---

## Tech stack

| Package | Version (package.json) | Purpose |
|---|---|---|
| next | ^15.2.1 | React fullstack application framework |
| react | ^19.0.0 | UI rendering |
| typescript | ^5.8.2 | Type safety across services and components |
| @prisma/client | ^6.4.1 | Database ORM client |
| prisma | ^6.4.1 | Schema migrations and DB push |
| qrcode | ^1.5.4 | Server-side QR code PNG and SVG generation |
| @types/qrcode | ^1.5.5 | TypeScript definitions for qrcode library |
| bcryptjs | ^3.0.2 | Salted password hashing (passcodes and account passwords) |
| jose | ^5.9.6 | JWT session signing and verification |
| lucide-react | ^1.16.0 | System interface icons |
| vitest | ^5.0.5 | Automated test runner |
| tsx | ^4.19.3 | TypeScript execution for seed script |

---

## Getting started

### Prerequisites

- Node.js 18 or later (tested on v22.20.0)
- A PostgreSQL database URL — free tier on [Neon](https://neon.tech) or [Supabase](https://supabase.com) works, as does a local instance

### Install

```bash
git clone https://github.com/Coder-Priyan/LinkPulse.git
cd LinkPulse
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (main connection or pooled URL) | Yes |
| `DIRECT_URL` | Direct (non-pooled) PostgreSQL connection string; required by Prisma schema (set to the same value as `DATABASE_URL` if not using a pooler) | Yes |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app, e.g. `http://localhost:3000` | Yes |
| `JWT_SECRET` | Signs session tokens; use a random string of at least 32 characters in production | Yes |
| `VISITOR_SALT` | Salt for visitor SHA-256 hashes; must be different from `JWT_SECRET` | Yes |
| `NODE_ENV` | Set to `production` for deployed builds | No |
| `SEED_CONFIRM` | Must equal `yes` to authorize running the destructive seed script | Only for seed |
| `SEED_ADMIN_PASSWORD` | Demo admin account password (minimum 12 characters) | Only for seed |
| `SEED_USER_PASSWORD` | Demo user account password (minimum 12 characters) | Only for seed |
| `SEED_LINK_PASSCODE` | Passcode for sample password-protected link (`/roadmap`) | Only for seed |

### Database setup

```bash
npx prisma db push
```

This applies the schema to your database without creating a migration history. Use `npm run prisma:migrate` if you want tracked migrations.

### Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm run start
```

---

## Seed data

> **Warning: the seed script deletes all existing rows in every table** before inserting sample data. It wipes `BlockedDomain`, `PasswordAttempt`, `ClickEvent`, `LinkTag`, `Tag`, `Link`, `Campaign`, and `User` unconditionally. Do not run it against a database that holds real data.
>
> **Safety Guard**: The script requires `SEED_CONFIRM="yes"` in the environment to execute. If this variable is missing or does not equal `yes`, the script immediately halts with an error and will not touch any data. Passwords must be provided via `SEED_ADMIN_PASSWORD` (min 12 chars), `SEED_USER_PASSWORD` (min 12 chars), and `SEED_LINK_PASSCODE`. No hardcoded passwords exist in the codebase.

**Bash / Linux / macOS:**
```bash
SEED_CONFIRM="yes" \
SEED_ADMIN_PASSWORD="YourSecureAdminPassword123!" \
SEED_USER_PASSWORD="YourSecureUserPassword123!" \
SEED_LINK_PASSCODE="YourSecureLinkPasscode123!" \
npm run prisma:seed
```

**PowerShell (Windows):**
```powershell
$env:SEED_CONFIRM="yes"
$env:SEED_ADMIN_PASSWORD="YourSecureAdminPassword123!"
$env:SEED_USER_PASSWORD="YourSecureUserPassword123!"
$env:SEED_LINK_PASSCODE="YourSecureLinkPasscode123!"
npm run prisma:seed
```

**Demo accounts**:

| Email | Role | Password Source |
|---|---|---|
| admin@linkpulse.io | ADMIN | Configured via `SEED_ADMIN_PASSWORD` |
| alex@techcorp.dev | USER | Configured via `SEED_USER_PASSWORD` |
| sarah@creatorhub.com | USER | Configured via `SEED_USER_PASSWORD` |

**Sample links** (owned by alex@techcorp.dev unless noted):

| Code | State | Notes |
|---|---|---|
| `/docs` | Active | Developer Documentation campaign |
| `/roadmap` | Password protected | Passcode configured via `SEED_LINK_PASSCODE` |
| `/launch2026` | Active | Spring Launch 2026 campaign |
| `/vip-pass` | Limit reached | 15 of 15 clicks used |
| `/early-bird` | Limit active | 12 of 50 clicks used |
| `/flash-sale` | Expired | Expiry set 7 days in the past |
| `/flagged-offer` | Disabled | Owned by alex; disabled with a reason |
| `/portfolio` | Active | Owned by sarah@creatorhub.com |

The seed script creates 3 users, 3 campaigns, 5 tags, 1 blocked domain (`malicious-phishing.test`), and 227 click events distributed across the past 12 days with device, browser, OS, referrer variety, and realistic QR scan telemetry.

---

## Tests

```bash
npm run test
```

Runs against the database configured in `.env`. Each test creates its own records and removes them in `afterAll`.

**What the tests cover:**
1. **Rule evaluation order** — disabled, blocked domain, expired, click limit, password; verified priority of blocked domain over expiry/limits/passwords
2. **Click limit accuracy under concurrent visits** — many parallel requests, limit never exceeded
3. **Bot exclusion** — bots create no `ClickEvent` rows and do not consume click limits, in redirect and password verify routes
4. **URL and alias validation** — invalid URLs, duplicate aliases, reserved aliases, valid cases
5. **Unique visitor counting** — same visitor counted once, different visitors counted separately
6. **Role-based access control** — users cannot read or modify another user's resources; admins can manage platform-wide data
7. **Rate limiting** — link creation (15/minute) and password attempts (5 failures/15 minutes)
8. **Live analytics aggregation** — metrics, unique visitors, source split, and campaign performance match known test data
9. **Campaign deletion cascade safety** — deleting a campaign decouples the campaign but preserves links and click history
10. **Link PATCH updates & title editing** — campaign and tag assignments, title updates (trimming, max-length 255, empty-to-null), ownership checks (403 for non-owners), preserving omitted fields, and explicit clearing
11. **QR code generation & scan tracking** — PNG buffer and SVG string rendering, custom size/width parameter with robust fallback for NaN/empty/non-numeric values and clamping (120–2048), `?src=qr` encoding verification, allowlist normalization, rule immunity, bot exclusion, and RBAC endpoint protection (403 for non-owners)
12. **CSV bulk import** — RFC-4180 parsing (BOM, CRLF, quoted commas, escaped quotes), formula injection neutralization (`=`, `+`, `-`, `@`), file size and row limits, line numbers, duplicate alias detection, batch campaign/tag assignment, and foreign ID rejection
13. **Admin domain blocklist** — domain normalization, hierarchical subdomain matching, enforcement on creation, editing, importing, and redirect-time status page, and admin-only endpoint protection (403 for normal users)

Verified result: **14 test files, 80 tests, all passed**.

---

## API overview

All routes require a valid session cookie (set at login) except register, login, and password verify (`/api/links/verify`). Users can only act on their own resources; admin-only routes enforce `ADMIN` role.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Anyone | Create account |
| `POST` | `/api/auth/login` | Anyone | Log in, receive session cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear session cookie |
| `GET` | `/api/auth/me` | Authenticated | Return current session user |
| `GET` | `/api/links` | Authenticated | List own links; query params: `campaignId`, `tagId`; ADMIN + `scope=all` returns all links |
| `POST` | `/api/links` | Authenticated | Create a link with optional title, alias, rules, campaign, tags (rate-limited: 15/min per user) |
| `PATCH` | `/api/links/[id]` | Owner or ADMIN | Update title, destination URL, rules, active state, password, campaign, tags (enforces ownership) |
| `DELETE` | `/api/links/[id]` | Owner or ADMIN | Delete a link |
| `GET` | `/api/links/[id]/qr` | Owner or ADMIN | Generate server-side QR code image (`?format=png` or `?format=svg`, `?size=120..2048`, `?download=true`) |
| `POST` | `/api/links/import/preview` | Authenticated | Parse and validate CSV bulk import payload; returns row statuses and errors |
| `POST` | `/api/links/import/execute` | Authenticated | Create links from valid CSV rows; supports optional batch `campaignId` and `tagIds` with ownership validation (rate-limited: 10 bulk imports/hour per user) |
| `POST` | `/api/links/verify` | Anyone | Verify passcode for password-protected link; preserves `?src=qr` |
| `GET` | `/api/campaigns` | Authenticated | List own campaigns |
| `POST` | `/api/campaigns` | Authenticated | Create a campaign |
| `DELETE` | `/api/campaigns/[id]` | Owner or ADMIN | Delete a campaign (links preserved, `campaignId` set to null) |
| `GET` | `/api/tags` | Authenticated | List own tags |
| `POST` | `/api/tags` | Authenticated | Create a tag |
| `DELETE` | `/api/tags/[id]` | Owner or ADMIN | Delete a tag |
| `GET` | `/api/admin/blocked-domains` | ADMIN only | List all blocked domains and their creators |
| `POST` | `/api/admin/blocked-domains` | ADMIN only | Add a domain to the platform blocklist |
| `DELETE` | `/api/admin/blocked-domains/[id]` | ADMIN only | Remove a domain from the platform blocklist |
| `GET` | `/api/analytics` | Authenticated | Analytics report; query params: `period` (7d/30d/all), `campaignId`, `scope` (me/all) |

The redirect route is handled by `GET /[code]` (a Next.js route handler, not under `/api`).

---

## Deployment

Live link: to be added.

Deployment steps will be added here once the project is deployed.

---

## Project log

See [docs/DEVLOG.md](docs/DEVLOG.md) for a short entry per milestone.