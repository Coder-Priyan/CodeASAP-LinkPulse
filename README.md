# LinkPulse

> High-velocity link management, telemetry, and guardrails cockpit with a tactile neo-brutalist aesthetic.

**Live demo:** https://linkpulse-url.vercel.app

**Team:** Code ASAP  
**Members:**
- `Sandeep Singh Mehta` (`Sandeep123-sys`)
- `Abhishek Dhapola` (`abdhapola20`)
- `Aditya Mehra` (`<GITHUB_USERNAME>`)
- `Deepak Kumar Kabi` (`deepakkabi`)
- `Priyanshu Dangi` (`Coder-Priyan`)

---

## Problem Statement

Standard URL shorteners are treated as dumb redirects. They offer no visitor-level access governance, lack enforceable expiration dates or click limits, and fail to prevent destination phishing or malicious link hijacking. Furthermore, traditional shortener analytics either rely on intrusive tracking cookies or fail to distinguish between legitimate human engagement, automated preview crawlers, and QR code scans.

---

## Solution

LinkPulse transforms short URLs into intelligent, rule-governed routing endpoints. Every redirect is evaluated in real time against multi-tier guardrails (activation status, platform-wide domain blocklists, expiration dates, strict click caps, and passcode challenges). With asynchronous non-blocking telemetry, privacy-preserving visitor hashing, server-side vector QR generation, and bulk CSV migration, LinkPulse delivers complete link management with a tactile "playful shell, calm data" design.

---

## Features

- **Custom Slugs & Brand Aliases:** Generate 6-character random slugs or claim custom aliases (3–32 chars) with real-time collision detection.
- **Rule-Governed Guardrails:**
  - *Passcode Protection:* Links gated by a bcrypt-hashed passcode.
  - *Atomic Click Limits:* Hard concurrency-safe caps enforced via atomic SQL increments (`$executeRaw`).
  - *Expiration Timestamps:* Time-bound links automatically route to informative status pages once expired.
  - *Instant Kill-Switch:* One-click deactivation and reactivation without deleting links.
- **Privacy-First Telemetry:**
  - *No Tracking Cookies for Visitors:* visitor metrics use salted SHA-256 hashes of client headers; raw IP addresses are never saved.
  - *Bot & Crawler Exclusion:* Automated user-agents and preview crawlers are filtered out so they never exhaust click caps.
  - *Multi-Period Trends:* Daily traffic graphs across 7-day, 30-day, and all-time windows with peak visit indicators.
  - *Channel Attribution:* Live breakdown between direct web traffic and physical QR code scans.
- **Server-Side QR Code Studio:** On-demand vector SVG and raster PNG export with embedded scan tracking and configurable dimensions.
- **Bulk CSV Importer:** RFC-4180 compliant batch upload (up to 200 links/file) with automatic spreadsheet formula injection defense (`=`, `+`, `-`, `@`).
- **Domain Governance & Safety:** Platform-wide blocklist with wildcard subdomain matching (`evil.com` intercepts `*.evil.com`) and cached evaluations.
- **Campaigns & Categorization:** Organize links with marketing campaigns, color-coded tags, and instant table search.

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
| **PostgreSQL (Neon)** | Serverless | Scalable relational database with connection pooling and branching |
| **Vercel** | Platform | Serverless hosting and continuous deployment |
| **tsx** | `^4.19.3` | Executable TypeScript environment for seeding |

---

## Live Demo

- **Application URL:** [https://linkpulse-url.vercel.app](https://linkpulse-url.vercel.app)

### Demo Access
- **Demo User:** `alex@techcorp.dev` / `HwDePUsi2a4rG5Jp`
- *Anyone can also register a fresh account directly from the `/register` page.*

---

## Screenshots

<table>
  <tr>
    <td align="center">
      <img src="docs/screenshots/landing.png" width="440" /><br />
      <b>Landing Page</b><br />
      Interactive alias simulator and neo-brutalist landing experience.
    </td>
    <td align="center">
      <img src="docs/screenshots/dashboard.png" width="440" /><br />
      <b>Dashboard</b><br />
      Workspace overview with quick statistics cards and short link creator.
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/screenshots/links-table.png" width="440" /><br />
      <b>Link Management & Guardrails</b><br />
      Real-time visit counts, rule badges (expiry/limit/passcode), and action controls.
    </td>
    <td align="center">
      <img src="docs/screenshots/analytics.png" width="440" /><br />
      <b>Telemetry & Traffic Trends</b><br />
      Operational link alerts, period KPI summary, and daily traffic bar chart.
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/screenshots/passcode.png" width="440" /><br />
      <b>Passcode Challenge</b><br />
      Passcode gate intercepting visits to protected links.
    </td>
    <td align="center">
      <img src="docs/screenshots/link-status.png" width="440" /><br />
      <b>Expiration Intercept</b><br />
      Clear, user-friendly notice shown when an expiration date is reached.
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/screenshots/qr-modal.png" width="440" /><br />
      <b>QR Code Studio</b><br />
      Server-generated QR code with SVG and PNG download.
    </td>
    <td align="center">
      <img src="docs/screenshots/import.png" width="440" /><br />
      <b>Bulk CSV Importer</b><br />
      Drag-and-drop batch ingestion supporting up to 200 links with validation.
    </td>
  </tr>
</table>

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
│   ├─ [Rule 2] isDomainBlocked(destUrl)  → /link-status?status=BLOCKED (checked via in-memory cache)
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
git clone https://github.com/Coder-Priyan/<REPO_NAME>.git
cd <REPO_NAME>
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
> Note: `prisma/migrations` is kept for reference of tracked schema revisions and performance index definitions.

### 4. Database Seeding (Guarded)
To populate sample campaigns, diverse links, and realistic multi-day telemetry, provide passwords and set `SEED_CONFIRM="yes"`:

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
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars) | Yes | `<random-string-min-32-chars>` |
| `VISITOR_SALT` | Salt for visitor SHA-256 hashes | Yes | `<random-string>` |
| `NODE_ENV` | Application environment mode | No | `development` / `production` |
| `SEED_CONFIRM` | Must equal `yes` to authorize destructive seed | For seed only | `yes` |
| `SEED_ADMIN_PASSWORD` | Demo admin account password (min 12 chars) | For seed only | `<admin-password-min-12-chars>` |
| `SEED_USER_PASSWORD` | Demo user account password (min 12 chars) | For seed only | `<user-password-min-12-chars>` |
| `SEED_LINK_PASSCODE` | Sample passcode for protected links | For seed only | `<sample-link-passcode>` |
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