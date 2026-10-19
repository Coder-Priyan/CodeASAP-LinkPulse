# LinkPulse

> High-velocity link management, telemetry, and guardrails cockpit with a tactile neo-brutalist aesthetic.

**Team:** Code ASAP  
**Members:**
- `<MEMBER_1_NAME>` (`<GITHUB_USERNAME>`)
- `<MEMBER_2_NAME>` (`<GITHUB_USERNAME>`)
- `<MEMBER_3_NAME>` (`<GITHUB_USERNAME>`)

---

## Problem Statement

Standard URL shorteners are treated as dumb redirects. They offer no visitor-level access governance, lack enforceable expiration dates or click limits, and fail to prevent destination phishing or malicious link hijacking. Furthermore, traditional shortener analytics either rely on intrusive tracking cookies or fail to distinguish between legitimate human engagement, automated preview crawlers, and QR code scans.

---

## Solution

LinkPulse transforms short URLs into intelligent, rule-governed routing endpoints. Every redirect is evaluated atomically in real time against multi-tier guardrails (activation status, platform-wide domain blocklists, expiration dates, strict click caps, and passcode challenges). With asynchronous non-blocking telemetry, privacy-preserving visitor hashing, server-side vector QR generation, and bulk CSV migration, LinkPulse delivers enterprise-grade link management with a tactile "playful shell, calm data" design.

---

## Features

- **Short Links & Custom Aliases:** Generate compact 6-character random slugs or claim custom brand aliases (3–32 characters) with real-time format and collision validation.
- **Rule-Governed Guardrails:**
  - **Passcode Protection:** Cryptographically protected destination links requiring a passcode challenge via bcrypt before redirecting.
  - **Atomic Click Limits:** Atomic counter increment guarantees concurrent visits never exceed user-configured click limits.
  - **Expiry Timestamps:** Configurable expiration dates that automatically route visitors to friendly status pages once reached.
  - **Instant Deactivation:** One-click manual toggle to disable and re-enable links on demand.
- **Privacy-Safe Telemetry & Analytics:**
  - **Zero Intrusive Tracking:** 100% cookie-free visitor tracking using salted SHA-256 hashes of client headers; raw IP addresses are never persisted.
  - **Bot & Crawler Exclusion:** Automated preview bots, crawlers, and CLI tools are detected and skipped; they never consume click limits or distort metrics.
  - **Granular Breakdowns:** Visual analytics over time (7-day, 30-day, all-time) with device split, browser distribution, operating system breakdowns, and referrer sources.
  - **Channel Attribution:** Distinguish between direct web visits and physical QR code scans with built-in channel attribution.
- **Server-Side QR Code Studio:**
  - Instant vector SVG and high-resolution PNG generation with embedded `?src=qr` attribution.
  - Downloadable directly from the interface with dynamic size scaling (`?size=120..2048`).
- **Bulk CSV Importer:**
  - RFC-4180 compliant CSV ingestion supporting up to 200 links per file with automated schema validation.
  - Built-in spreadsheet formula injection defense (neutralizes `=`, `+`, `-`, `@` characters).
  - Batch campaign and tag assignments with strict multi-tenant ownership validation.
- **Platform Governance & Domain Blocklist:**
  - Dedicated administrative blocklist to instantly intercept malicious destinations and phishing campaigns.
  - Automatic subdomain matching (blocking `evil.com` protects `sub.evil.com`).
  - In-memory cache with sub-5ms invalidation ensures zero database saturation on redirect paths.
- **Campaign & Tag Organization:** Categorize links into marketing campaigns and color-coded tags with multi-tenant dashboard filtering.

---

## Tech Stack

Exact package versions from [package.json](package.json):

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | `^15.2.1` | App Router, Server Components, and Route Handlers |
| **React** | `^19.0.0` | UI component rendering |
| **React DOM** | `^19.0.0` | DOM bindings for React 19 |
| **TypeScript** | `^5.8.2` | Strict end-to-end type safety |
| **Prisma Client** | `^6.4.1` | Type-safe PostgreSQL ORM client |
| **Prisma CLI** | `^6.4.1` | Database migrations and schema management |
| **bcryptjs** | `^3.0.2` | Salted hashing for account passwords and link passcodes |
| **jose** | `^5.9.6` | Lightweight JWT signing and session validation |
| **qrcode** | `^1.5.4` | Server-side vector SVG and raster PNG QR code synthesis |
| **lucide-react** | `^1.16.0` | Neo-brutalist consistent interface iconography |
| **vitest** | `^5.0.5` | Fast automated unit and regression testing |
| **playwright** | `^1.64.1` | Browser automation and visual responsiveness benchmarking |
| **tsx** | `^4.19.3` | Executable TypeScript environment for seeding |

---

## Live Demo

- **Application URL:** [https://link-pulse-coral.vercel.app](https://link-pulse-coral.vercel.app)

### Demo Access
- **Demo User:** `<DEMO_EMAIL>` / `<DEMO_PASSWORD>`
- **Demo Admin:** `<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>`
- *Anyone can also register a fresh account directly from the `/register` page.*

---

## Screenshots

> *Note: Currently, `docs/screenshots/` contains only `.gitkeep`. Run `scripts/capture_logged_in.mjs` to capture and populate screenshots for all authenticated surfaces.*

The following primary surfaces are available in LinkPulse:
1. **Landing Page (`/`):** Neo-brutalist interactive hero with real-time alias simulator.
2. **Dashboard (`/dashboard`):** Central link management table with optimistic toggles, search, and inline creation.
3. **Analytics Cockpit (`/analytics`):** 14-day telemetry charts, QR vs direct channel split, and device breakdown.
4. **Admin Console (`/admin`):** Global link directory and platform domain blocklist management.
5. **QR Code Studio & Modal:** Responsive vector export modal for instant PNG and SVG downloads.
6. **Passcode Challenge Screen (`/p/[code]`):** High-contrast tactile challenge card for protected destinations.

---

## How It Works: High-Throughput Redirect Flow

When a visitor requests `GET /[code]`:

```
GET /{code}?src=...
│
├─ 1. Link Not Found?
│   └─ → Redirect to /link-status?code={code}&status=NOT_FOUND
│
├─ 2. Evaluate Guardrail Rules (evaluateLinkRules in link.service.ts)
│   ├─ [Rule 1] isActive === false        → /link-status?status=DISABLED
│   ├─ [Rule 2] isDomainBlocked(destUrl)  → /link-status?status=BLOCKED (Interpreted via in-memory cache)
│   ├─ [Rule 3] expiresAt <= now          → /link-status?status=EXPIRED
│   ├─ [Rule 4] clicksCount >= clickLimit → /link-status?status=LIMIT_REACHED
│   └─ [Rule 5] passwordHash present      → /p/{code}?src=... (Passcode challenge prompt)
│
├─ 3. Bot Check (isBot in user-agent.ts)
│   └─ If crawler/bot: Skip tracking, do not increment limits, return HTTP 307
│
├─ 4. Atomic Counter Update ($executeRaw in link.service.ts)
│   └─ UPDATE "Link" SET "clicksCount" = "clicksCount" + 1 WHERE id = $id AND clicksCount < clickLimit
│      (Guarantees concurrent visits cannot exceed configured limits)
│
├─ 5. Asynchronous Telemetry Logging via Next.js after()
│   └─ Non-blocking execution records device, browser, OS, referrer, and hashed visitor ID
│
└─ 6. HTTP 307 Temporary Redirect
    └─ Cache-Control: private, no-cache, no-store, must-revalidate
```

---

## Setup Instructions

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Coder-Priyan/LinkPulse.git
cd LinkPulse
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

### 3. Database Migration & Schema Push
Initialize your database schema:
```bash
# Push schema directly to database
npx prisma db push

# Generate Prisma Client
npm run prisma:generate
```

### 4. Database Seeding (Guarded)
To populate sample campaigns, diverse links, and realistic 14-day telemetry, provide passwords and set `SEED_CONFIRM="yes"`:

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

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Configured in [.env.example](.env.example):

| Variable | Purpose | Required | Example / Placeholder |
|---|---|---|---|
| `DATABASE_URL` | Main PostgreSQL connection string | Yes | `postgresql://postgres:postgres@localhost:5432/linkpulse?schema=public` |
| `DIRECT_URL` | Direct PostgreSQL connection string | Yes | `postgresql://postgres:postgres@localhost:5432/linkpulse?schema=public` |
| `NEXT_PUBLIC_APP_URL` | Public base application URL | Yes | `http://localhost:3000` |
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars) | Yes | `super-secret-linkpulse-production-key-min32chars` |
| `VISITOR_SALT` | Salt for visitor SHA-256 hashes | Yes | `distinct-salt-for-privacy-safe-visitor-hashing` |
| `NODE_ENV` | Application environment mode | No | `development` / `production` |
| `SEED_CONFIRM` | Must equal `yes` to authorize destructive seed | For seed only | `yes` |
| `SEED_ADMIN_PASSWORD` | Demo admin account password (min 12 chars) | For seed only | `AdminPassword123!` |
| `SEED_USER_PASSWORD` | Demo user account password (min 12 chars) | For seed only | `UserPassword123!` |
| `SEED_LINK_PASSCODE` | Sample link passcode for `/roadmap` | For seed only | `Passcode123!` |
| `PRISMA_LOG_QUERIES` | Log raw SQL queries to stdout | No | `false` |
| `TEST_DATABASE_URL` | Dedicated test database URL for `npm test` | For full test suite | `postgresql://postgres:postgres@localhost:5433/linkpulse_test?schema=public` |
| `TEST_DIRECT_URL` | Direct connection for test database | For full test suite | `postgresql://postgres:postgres@localhost:5433/linkpulse_test?schema=public` |
| `ALLOW_REMOTE_TEST_DB`| Set to `1` to authorize remote test DBs | For full test suite | `1` |

---

## Running Tests

### 1. DB-Free Unit Tests (Fast & Zero Setup)
Run all in-memory unit tests (session signing, URL building, loading states, clipboard, rate limiter logic) without needing any database:
```bash
npm run test:unit
```

### 2. Full Test Suite & Database Safety Guard
LinkPulse includes an automated safety guard ([test/global-setup.ts](test/global-setup.ts)) that blocks `npm test` from running against your development or live `DATABASE_URL`.

To execute database-backed integration tests, provide an isolated `TEST_DATABASE_URL`:
```bash
# 1. Start an isolated test container on port 5433
docker run --name linkpulse-test-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=linkpulse_test -p 5433:5432 -d postgres:16-alpine

# 2. Push schema to test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/linkpulse_test?schema=public" npx prisma db push

# 3. Execute test suite
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/linkpulse_test?schema=public" npm test
```

---

## Project Structure

```
LinkPulse/
├── prisma/
│   ├── schema.prisma         # Database schema (Models: User, Link, ClickEvent, etc.)
│   ├── seed.ts               # Guarded sample data population script
│   └── migrations/           # Tracked database migration history
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication pages (/login, /register)
│   │   ├── (dashboard)/      # Protected workspaces (/dashboard, /import, /admin)
│   │   ├── analytics/        # Telemetry cockpit (/analytics)
│   │   ├── [code]/           # HTTP 307 redirect route handler
│   │   ├── p/[code]/         # Passcode challenge page
│   │   ├── link-status/      # Status landing pages (expired, limit, blocked)
│   │   └── api/              # REST API endpoints for links, campaigns, tags, QR
│   ├── components/           # Accessible UI components (Toast, ConfirmDialog, QrModal, LinksTable)
│   └── lib/
│       ├── auth/             # Session verification and role guards
│       ├── services/         # Core business logic (link, analytics, click, blocklist)
│       ├── utils/            # Hashing, short-url formatting, clipboard utility
│       └── validations/      # RFC compliance, URL & alias validators
├── scripts/                  # Screenshot capture and responsiveness measurement scripts
├── test/                     # Unit and DB-backed test suite
└── docs/                     # Documentation and milestone logs
```