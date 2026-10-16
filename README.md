# LinkPulse ⚡

> Production-grade URL shortener & real-time telemetry engine built for high-performance redirects, bot-filtered analytics, and multi-tenant role-based access control.

---

## 🚀 Key Features

### Milestone 1 — Core URL Shortener
1. **Role-Based Access Control (RBAC)**:
   - `USER`: Complete ownership of their personal shortened links and click analytics.
   - `ADMIN`: Global directory visibility, cross-tenant moderation, and link disabling/enabling.
2. **Handcrafted Business Logic**:
   - Safe Base62 collision-resistant short-code generator.
   - RFC URL scheme validation & anti-loop defense.
   - Custom alias validation with length checks, character filtering, and reserved system slug protections.
3. **Decoupled Asynchronous Click Tracking**:
   - Every visit logs time, device category, browser family, operating system, and sanitized referrer.
   - **Zero Redirect Latency**: Click recording is dispatched asynchronously using Next.js `after()`, never blocking the HTTP redirect.
   - **Automated Bot Filtering**: Search engine crawlers (Googlebot, Bingbot), preview fetchers (Twitterbot, WhatsApp, Slackbot), and CLI tools (curl, postman) are filtered at the application boundary and ignored.

### Milestone 2 — Reliable Redirection & Trustworthy Data
1. **Centralized Rule Evaluation Order**:
   - Redirect rules are evaluated in a deliberate, strictly ordered sequence:
     1. `Disabled` &rarr; 2. `Expired` &rarr; 3. `Click Limit` &rarr; 4. `Password Protection`
   - Each non-active state routes to an informative branded status page with contextual reasoning.
   - Passwords are salted & hashed with `bcrypt`; plain passwords are never stored or compared. Visitors see a password challenge screen before gaining access.
2. **Atomic Click Limits & Concurrency Safety**:
   - Click limits are enforced through conditional atomic database updates (`WHERE "clicksCount" < "clickLimit"`).
   - Under high concurrent visits, the limit is strictly adhered to without race condition overshoots.
   - Expired, limited, or disabled links preserve their complete historical analytics logs.
3. **Privacy-Safe Unique Visitor Tracking**:
   - Each click generates a salted SHA-256 hash (`visitorHash`) derived from the visitor's IP and User-Agent using a dedicated `VISITOR_SALT`.
   - Raw IP addresses are **never stored** in the database.
   - Unique visitor counts are displayed alongside total clicks in personal dashboards, analytics views, and admin consoles.
4. **Two-Step Creation Flow & Rule Editing**:
   - Step 1: Destination URL & Alias with instant live validation feedback.
   - Step 2: Configurable rules (Expiry date, Click limit, Passcode, Campaign & Tags) with a live policy review before publishing.
   - Post-creation rule editing: users and admins can edit destination URLs, toggle active status, adjust limits, or update passwords anytime via the dashboard.
5. **Basic User Rate Limiting**:
   - Link creation is rate-limited per user (15 links / minute) using a DB-backed sliding window.

### Milestone 3 — Organization, Real Analytics & Hardening
1. **Campaigns & Tags Organization**:
   - Users can create, manage, and assign campaigns and tags to links during creation and via rule editing.
   - Real-time multi-tenant filtering on dashboard by campaign and tag.
   - **Safe Deletion**: Deleting a campaign sets `campaignId = null` on affected links, preserving all links and their complete click telemetry intact.
2. **Live Telemetry & Analytics Dashboard**:
   - Interactive period filtering (`7 days`, `30 days`, `all time`).
   - Key metrics: Total clicks, unique visitors, and active link count.
   - Clicks over time chart for the selected period.
   - Campaign performance breakdown (links count, total clicks, top link per campaign).
   - Top links leaderboard, device family breakdown, browser distribution, and top referrers.
   - Link health alerts: expiring soon (within 72h), approaching click limit (&ge; 80%), limit reached, or disabled.
   - Scoped visibility: Users see only their own link telemetry; Admins access platform-wide aggregated telemetry.
3. **Security Hardening**:
   - **Bot Click Exclusion**: Web crawlers and preview bots (curl, Googlebot, Twitterbot, etc.) are detected prior to atomic increments. Bots neither create click events nor consume a link's click quota.
   - **Password Attempt Rate Limiting**: Password attempts on protected links are strictly rate-limited (max 5 failed attempts per 15-minute window per IP and link) with locked-out status feedback.
   - **Decoupled Visitor Salt**: Visitor hashing is decoupled from `JWT_SECRET` and powered by a dedicated `VISITOR_SALT` environment variable.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript 5.8 (Strict Mode)
- **Database ORM**: Prisma ORM 6
- **Database**: PostgreSQL (Neon, Supabase, Railway, AWS RDS, or local Docker)
- **Authentication**: Stateless signed JWT sessions (`jose`) in secure, `httpOnly` cookies with salted bcrypt hashing
- **Styling**: Vanilla CSS design system with custom dark mode and glassmorphism (No Tailwind bloat)
- **Icons**: Lucide React

---

## 📁 Folder Structure

```
LinkPulse/
├── docs/
│   └── DEVLOG.md                # Progress log entries for each milestone
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema with future milestone fields
│   └── seed.ts                  # Multi-tenant realistic seed script (users, links, clicks)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx   # Login page with 1-click demo fillers
│   │   │   └── register/page.tsx# Registration page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx # User dashboard (stats, link creation, list, filters)
│   │   │   └── admin/page.tsx   # Admin-only console with global oversight
│   │   ├── analytics/
│   │   │   └── page.tsx         # Live telemetry dashboard with period filtering
│   │   ├── [code]/
│   │   │   └── route.ts         # High-speed redirect & rule evaluation handler
│   │   ├── p/[code]/
│   │   │   └── page.tsx         # Password prompt screen for protected links
│   │   ├── api/
│   │   │   ├── analytics/       # Live aggregated telemetry endpoint
│   │   │   ├── auth/            # Auth endpoints (login, register, logout, me)
│   │   │   ├── campaigns/       # Campaign management CRUD
│   │   │   ├── tags/            # Tag management CRUD
│   │   │   └── links/           # Link CRUD & password verification endpoints
│   │   ├── link-status/page.tsx # Branded status for inactive/expired/limited/404 links
│   │   ├── globals.css          # Design system & tokens
│   │   ├── layout.tsx           # Root layout with reactive Navbar & Footer
│   │   ├── not-found.tsx        # Branded 404 handler
│   │   └── page.tsx             # Landing hero and features
│   ├── components/
│   │   ├── Navbar.tsx           # Dynamic navigation with role badges & analytics
│   │   ├── Footer.tsx           # Footer with system details
│   │   ├── LinkCreateForm.tsx   # Two-step link creation form with campaigns & tags
│   │   ├── EditLinkModal.tsx    # Modal to update link rules, campaigns & tags
│   │   └── LinksTable.tsx       # Interactive table with uniques, rule icons, campaign/tags
│   └── lib/
│       ├── auth/
│       │   ├── session.ts       # Signed JWT & httpOnly cookie handling
│       │   └── guard.ts         # Role guards (getCurrentUser, requireAuth, requireAdmin)
│       ├── constants/
│       │   └── reserved-slugs.ts# Blacklisted system paths & keywords
│       ├── services/
│       │   ├── analytics.service.ts # Aggregated real telemetry engine
│       │   ├── campaign.service.ts  # Multi-tenant campaign service (safe delete)
│       │   ├── tag.service.ts       # Multi-tenant tag service
│       │   ├── link.service.ts      # Rule evaluation, atomic counting, link CRUD
│       │   ├── click.service.ts     # Bot filtering & privacy-safe telemetry recording
│       │   ├── rate-limiter.ts      # Sliding window link creation rate limiter
│       │   ├── password-rate-limiter.ts # Link password brute-force limiter
│       │   └── user.service.ts      # Account registration & authentication
│       ├── utils/
│       │   ├── code-generator.ts# Base62 random short-code generator
│       │   ├── user-agent.ts    # UA classification (bots, devices, browsers, OS)
│       │   └── visitor-hash.ts  # SHA-256 salted privacy-safe visitor identifier
│       ├── validations/
│       │   ├── alias-validator.ts # Custom alias rules & character validation
│       │   └── url-validator.ts # RFC URL validation & anti-loop check
│       └── db.ts                # PrismaClient singleton instance
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 22)
- Any PostgreSQL database URL (free tier on [Neon](https://neon.tech), [Supabase](https://supabase.com), or local Docker)

### 2. Installation
```bash
# Clone the repository and enter the directory
cd LinkPulse

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and supply your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://user:password@host:5432/linkpulse?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="your-32-character-secret-key-goes-here"
VISITOR_SALT="your-32-character-visitor-salt-goes-here"
```

### 4. Database Schema & Realistic Seed Data

> ⚠️ **CRITICAL WARNING**:
> The seed script (`npm run prisma:seed`) performs a **complete destructive wipe** of existing tables before inserting sample data.
> **DO NOT RUN THIS SCRIPT ON A DATABASE CONTAINING REAL PRODUCTION DATA.**

Push the schema to your database and run the realistic seed script:
```bash
# Push schema to PostgreSQL
npx prisma db push

# Run the comprehensive seed script
npm run prisma:seed
```

The seed script creates:
- **Admin Account**: `admin@linkpulse.io` / `Password123!`
- **User Account 1**: `alex@techcorp.dev` / `Password123!`
- **User Account 2**: `sarah@creatorhub.com` / `Password123!`
- Sample links demonstrating all rules:
  - `/docs` — Standard active link
  - `/roadmap` — Password-protected link (Passcode: `Secret123!`)
  - `/vip-pass` — Click-limited link that reached its limit (10/10 visits)
  - `/early-bird` — Click-limited link with remaining capacity (8/50 visits)
  - `/flash-sale` — Expired link (set 7 days in past)
  - `/flagged-offer` — Deactivated link with reason
- 80+ realistic click events with hashed visitor tracking across browsers, devices, and referrers.

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Automated Testing
Run the automated test suite covering core business rules, concurrency, validation, RBAC, rate limiting, and analytics:
```bash
npm run test
```
The test suite uses Vitest to execute 27 automated tests against the database in isolated scopes, cleaning up only its own created test entities.

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into **Vercel**.
3. In Vercel Project Settings > Environment Variables, add:
   - `DATABASE_URL`: Hosted PostgreSQL connection string (Neon, Supabase, etc.)
   - `DIRECT_URL`: Direct PostgreSQL connection string (if using connection pooling)
   - `JWT_SECRET`: Random 32+ character string
   - `NEXT_PUBLIC_APP_URL`: Your production Vercel domain (e.g. `https://linkpulse.vercel.app`)
4. In Build Settings, set Build Command to:
   ```bash
   prisma generate && next build
   ```
5. Deploy!
