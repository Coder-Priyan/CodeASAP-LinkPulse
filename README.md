# LinkPulse

A URL shortener with analytics. Shorten a URL, set rules on it — expiry date, click limit, password — group links into campaigns, and see click data in a live dashboard. Each rule is enforced on every visit, not just at creation time.

**Team:** Code ASAP — Innovista 2026 Hackathon, Round 2: Implementation

---

## Features

**Links**
- Create a short link with a generated code or a custom alias
- Optional title; destination URL and alias validated at creation time
- Admins can disable any link; owners can toggle their own

**Redirect rules** (evaluated in this order on every visit)
- Disabled — blocks redirect immediately with a reason
- Expiry date — link stops redirecting after the set time
- Click limit — enforced atomically; concurrent visits cannot exceed the cap
- Password protection — visitor must pass a password challenge before being redirected

**Click tracking**
- Every human visit is stored as a ClickEvent with device, browser, OS, sanitized referrer, and a privacy-safe visitor hash
- Bots (crawlers, preview fetchers, CLI tools) are detected and skipped — they create no events and do not consume the click limit
- Click logging runs after the HTTP response via Next.js `after()`, so it never delays the redirect
- Unique visitors identified with a salted SHA-256 hash of IP + User-Agent; raw IP never stored

**Organization**
- Campaigns: group links; deleting a campaign unlinks it from its links but does not delete them or their click history
- Tags: label links with a name and color; multiple tags per link
- Filter the dashboard by campaign or tag

**Analytics**
- Period selector: 7 days, 30 days, all time
- Metrics: total clicks, unique visitors, active links, total links
- Clicks over time (daily buckets for the selected period)
- Campaign performance: total links, total clicks, top link per campaign
- Top links, device breakdown, browser breakdown, referrer breakdown
- Link alerts: `DISABLED`, expired (flagged as `DISABLED`), `EXPIRING_SOON` (within 72 h), `LIMIT_REACHED` (clicks ≥ limit), `NEAR_LIMIT` (clicks ≥ 80% of limit)
- Users see only their own data; admins can view platform-wide totals

**Security**
- Passwords hashed with bcrypt (12 rounds); plain passwords never stored or compared in plaintext
- Password attempts rate-limited: 5 failed attempts per 15-minute window per link per IP
- IP stored only as a salted SHA-256 hash in `PasswordAttempt`; raw IP never persisted
- Link creation rate-limited: 15 links per minute per user (DB-backed sliding window)
- Sessions are signed JWTs (jose, HS256) stored in `httpOnly` cookies; expire after 7 days

**Roles**
- `USER`: sees and manages only their own links, campaigns, tags, and analytics
- `ADMIN`: sees all links and platform-wide analytics; can disable any link

---

## Not built yet

- QR code generation with scan tracking
- CSV bulk link import
- Admin domain blocklist
- Custom domains
- Device-based redirect targeting
- Public API with API keys
- Link-in-bio pages
- GeoIP location breakdown (the `country` column exists in the schema but is never written)

---

## How it works: redirect flow

```
GET /{code}
│
├─ Link not found?
│   └─ → /link-status?status=NOT_FOUND
│
├─ Evaluate rules (link.service.ts: evaluateLinkRules)
│   ├─ 1. isActive === false         → /link-status?status=DISABLED
│   ├─ 2. expiresAt ≤ now            → /link-status?status=EXPIRED
│   ├─ 3. clicksCount ≥ clickLimit   → /link-status?status=LIMIT_REACHED
│   └─ 4. passwordHash set           → /p/{code}  (password prompt page)
│
├─ Bot? (user-agent.ts: isBot)
│   └─ yes → HTTP 307, no counter increment, no ClickEvent written
│
├─ Atomic increment (Prisma $executeRaw)
│   └─ UPDATE "Link" SET "clicksCount" = "clicksCount" + 1
│      WHERE "id" = $id AND "clicksCount" < $limit
│      → if 0 rows updated, a concurrent visit filled the last slot → LIMIT_REACHED
│
├─ Schedule click logging via after() — runs after response is sent
│
└─ HTTP 307 + Cache-Control: private, no-cache, no-store, must-revalidate
```

307 (temporary redirect) with `no-store` ensures browsers and CDN caches never cache the response, so rule changes take effect immediately on the next visit.

---

## Architecture

```
LinkPulse/
├── prisma/
│   ├── schema.prisma       PostgreSQL schema
│   └── seed.ts             Seed script (destructive; see Seed data section)
├── src/
│   ├── app/
│   │   ├── (auth)/         Login and register pages
│   │   ├── (dashboard)/    User dashboard and admin console
│   │   ├── analytics/      Analytics dashboard page
│   │   ├── [code]/         Redirect route handler
│   │   ├── p/[code]/       Password prompt page
│   │   ├── link-status/    Status page (disabled, expired, limit reached, not found)
│   │   └── api/            Route handlers (see API overview)
│   ├── components/         Navbar, Footer, LinkCreateForm, EditLinkModal, LinksTable
│   └── lib/
│       ├── auth/           Session (JWT + cookie) and role guards
│       ├── constants/      Reserved slugs list
│       ├── services/       Business logic: link, click, analytics, campaign, tag, rate limiters, user
│       ├── utils/          Code generator, user-agent parser, visitor hash
│       └── validations/    URL validator, alias validator
├── test/                   Vitest test files
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
              └─< LinkTag >─ Tag
              └── Campaign (nullable FK)
              └─< PasswordAttempt
```

| Model | Key fields | Notes |
|---|---|---|
| `User` | `id`, `email`, `passwordHash`, `role` | role: USER or ADMIN |
| `Link` | `code` (unique), `destinationUrl`, `isActive`, `expiresAt`, `clickLimit`, `clicksCount`, `passwordHash` | `clicksCount` is the atomic counter; `passwordHash` is bcrypt |
| `ClickEvent` | `linkId`, `timestamp`, `device`, `browser`, `os`, `referrer`, `visitorHash` | Raw IP never stored |
| `PasswordAttempt` | `linkId`, `ipHash`, `success` | IP stored as SHA-256 hash only |
| `Campaign` | `userId`, `name` | Unique per user; links get `campaignId = null` on delete |
| `Tag` | `userId`, `name`, `color` | Unique per user |
| `LinkTag` | `linkId`, `tagId` | Join table; composite primary key |

---

## Tech stack

| Package | Version (package.json) |
|---|---|
| next | ^15.2.1 |
| react | ^19.0.0 |
| typescript | ^5.8.2 |
| @prisma/client | ^6.4.1 |
| prisma | ^6.4.1 |
| bcryptjs | ^3.0.2 |
| jose | ^5.9.6 |
| lucide-react | ^1.16.0 |
| vitest | ^5.0.5 |
| tsx | ^4.19.3 |

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

> **Warning: the seed script deletes all existing rows in every table** before inserting sample data. It wipes `PasswordAttempt`, `ClickEvent`, `LinkTag`, `Tag`, `Link`, `Campaign`, and `User` unconditionally. Do not run it against a database that holds real data.
>
> There is no confirmation variable or guard. The wipe runs as soon as the script is called.

```bash
npm run prisma:seed
```

**Demo accounts** (all use password `Password123!`):

| Email | Role |
|---|---|
| admin@linkpulse.io | ADMIN |
| alex@techcorp.dev | USER |
| sarah@creatorhub.com | USER |

**Sample links** (owned by alex@techcorp.dev unless noted):

| Code | State | Notes |
|---|---|---|
| `/docs` | Active | Developer Documentation campaign |
| `/roadmap` | Password protected | Passcode: `Secret123!` |
| `/launch2026` | Active | Spring Launch 2026 campaign |
| `/vip-pass` | Limit reached | 15 of 15 clicks used |
| `/early-bird` | Limit active | 12 of 50 clicks used |
| `/flash-sale` | Expired | Expiry set 7 days in the past |
| `/flagged-offer` | Disabled | Owned by alex; disabled with a reason |
| `/portfolio` | Active | Owned by sarah@creatorhub.com |

The script also creates 3 campaigns, 5 tags, and 227 click events distributed across the past 12 days with device, browser, OS, and referrer variety.

---

## Tests

```bash
npm run test
```

Runs against the database configured in `.env`. Each test creates its own records and removes them in `afterAll`.

**What the tests cover:**
1. Rule evaluation order — disabled, expired, click limit, password; including a link that is both expired and password-protected
2. Click limit accuracy under concurrent visits — many parallel requests, limit never exceeded
3. Bot exclusion — bots create no `ClickEvent` rows and do not consume the click limit, tested in both the redirect route and the password verify route
4. URL and alias validation — invalid URLs, duplicate aliases, reserved aliases, valid cases
5. Unique visitor counting — same visitor counted once, different visitors counted separately
6. Role-based access control — a user cannot read or modify another user's resources; an admin can disable any link
7. Rate limiting — link creation (15/minute) and password attempts (5 failures/15 minutes)
8. Analytics aggregation — metrics and campaign performance match known test data
9. Campaign deletion cascade safety — deleting a campaign decouples the campaign but preserves links and click history
10. Link PATCH updates — campaign and tag assignments, ownership checks (rejecting foreign IDs), preserving omitted fields, and explicit clearing (`null` / `[]`)

Verified result: **10 test files, 32 tests, all passed** (24.6 s).

---

## API overview

All routes require a valid session cookie (set at login) except register, login, and password verify (`/api/links/verify`). Users can only act on their own resources.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Anyone | Create account |
| `POST` | `/api/auth/login` | Anyone | Log in, receive session cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear session cookie |
| `GET` | `/api/auth/me` | Authenticated | Return current user |
| `GET` | `/api/links` | Authenticated | List own links; query params: `campaignId`, `tagId`; ADMIN + `scope=all` returns all links |
| `POST` | `/api/links` | Authenticated | Create a link (rate-limited: 15/min per user) |
| `PATCH` | `/api/links/[id]` | Owner or ADMIN | Update rules, destination URL, active state, password, campaign, tags |
| `DELETE` | `/api/links/[id]` | Owner or ADMIN | Delete a link |
| `POST` | `/api/links/verify` | Anyone | Verify password for a password-protected link |
| `GET` | `/api/campaigns` | Authenticated | List own campaigns |
| `POST` | `/api/campaigns` | Authenticated | Create a campaign |
| `DELETE` | `/api/campaigns/[id]` | Owner or ADMIN | Delete a campaign (links preserved, `campaignId` set to null) |
| `GET` | `/api/tags` | Authenticated | List own tags |
| `POST` | `/api/tags` | Authenticated | Create a tag |
| `DELETE` | `/api/tags/[id]` | Owner or ADMIN | Delete a tag |
| `GET` | `/api/analytics` | Authenticated | Analytics report; query params: `period` (7d/30d/all), `campaignId`, `scope` (me/all) |

The redirect itself is handled by `GET /[code]` (a Next.js route handler, not under `/api`).

---

## Deployment

Live link: to be added.

Deployment steps will be added here once the project is deployed.

---

## Project log

See [docs/DEVLOG.md](docs/DEVLOG.md) for a short entry per milestone.