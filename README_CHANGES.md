# README Overhaul & Hackathon Submission Report

**Date:** October 19, 2026  
**Repository:** LinkPulse (`Coder-Priyan/LinkPulse`)  
**Branch:** `ui-polish`  

---

## Summary of Changes to `README.md`

`README.md` was rewritten and completed to serve as a comprehensive, polished submission document for the **Code ASAP** team at the Innovista 2026 Hackathon. The document structure strictly follows the requested 12-section sequence:

1. **Title & Team Information:**
   - Tagline: *"High-velocity link management, telemetry, and guardrails cockpit with a tactile neo-brutalist aesthetic."*
   - Team Name: **Code ASAP**
   - Placeholders for team members: `<MEMBER_1_NAME>` (`<GITHUB_USERNAME>`), `<MEMBER_2_NAME>`, `<MEMBER_3_NAME>`.
2. **Problem Statement:**
   - 2-4 focused sentences detailing why traditional shorteners fall short (dumb redirects, lack of access control, no abuse or phishing defense, and intrusive tracking cookies).
3. **Solution:**
   - Clear paragraph defining LinkPulse as a rule-governed routing cockpit with real-time atomic evaluation, non-blocking telemetry, vector QR studio, and bulk CSV migration.
4. **Features (Code-Verified Only):**
   - Compact 6-char slugs & custom brand aliases (3–32 chars).
   - Atomic click limits (`$executeRaw` atomic increment).
   - Expiration dates with automated status page redirection.
   - Passcode protection with salted bcrypt verification.
   - One-click active/inactive toggle.
   - Privacy-safe telemetry with salted SHA-256 visitor hashing (no raw IPs, no cookies).
   - Bot & crawler exclusion (`isBot` user-agent filtering).
   - Live analytics breakdowns (devices, browsers, OS, referrers, and QR vs direct split).
   - Server-side vector SVG and raster PNG QR codes (`?size=120..2048`).
   - RFC-4180 CSV bulk import with spreadsheet formula injection defense (`=`, `+`, `-`, `@`).
   - Platform domain blocklist with automatic subdomain wildcarding and sub-5ms in-memory cache.
   - Campaigns and multi-tag link categorization.
5. **Tech Stack (Exact Versions from `package.json`):**
   - Next.js: `^15.2.1`
   - React & React DOM: `^19.0.0`
   - TypeScript: `^5.8.2`
   - Prisma Client & CLI: `^6.4.1`
   - bcryptjs: `^3.0.2`
   - jose: `^5.9.6`
   - qrcode: `^1.5.4`
   - lucide-react: `^1.16.0`
   - vitest: `^5.0.5`
   - playwright: `^1.64.1`
   - tsx: `^4.19.3`
6. **Live Demo & Access:**
   - Live URL: `https://link-pulse-coral.vercel.app`
   - Demo Access credentials placeholders: `<DEMO_EMAIL>` / `<DEMO_PASSWORD>`, `<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>`.
   - Registration note for instant self-serve guest onboarding.
7. **Screenshots Section:**
   - Inspected `docs/screenshots/`: currently contains only `.gitkeep` (0 image files present).
   - Accurately listed the missing screenshot surfaces (Landing, Dashboard, Analytics, Admin, QR Modal, Passcode Challenge) and pointed to `scripts/capture_logged_in.mjs` for populating them. Did not reference non-existent files.
8. **How It Works (High-Throughput Redirect Flow):**
   - Detailed ASCII sequence diagram matching verified code execution order:
     `DISABLED` $\rightarrow$ `BLOCKED` $\rightarrow$ `EXPIRED` $\rightarrow$ `LIMIT_REACHED` $\rightarrow$ `PASSWORD_REQUIRED` $\rightarrow$ `ACTIVE`.
   - Explains bot filtering, atomic DB increment, non-blocking click logging via Next.js `after()`, and HTTP 307 with `Cache-Control: private, no-cache, no-store, must-revalidate`.
9. **Setup Instructions:**
   - Step-by-step commands for cloning, dependency installation, `.env` creation, database push, seed script execution with `SEED_CONFIRM="yes"`, and development server launch.
10. **Environment Variables Table:**
    - Fully aligned with `.env.example` including optional variables (`PRISMA_LOG_QUERIES`, `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, `ALLOW_REMOTE_TEST_DB`). Only placeholder strings; zero credentials.
11. **Running Tests:**
    - Documented `npm run test:unit` for DB-free in-memory testing.
    - Documented `npm test` with full `TEST_DATABASE_URL` instructions and safety guard behavior.
12. **Project Structure:**
    - Concise, annotated tree mapping core modules in `prisma/`, `src/app/`, `src/components/`, `src/lib/`, `scripts/`, `test/`, and `docs/`.

---

## Verification of Commands & Paths

All commands and file paths mentioned in `README.md` were cross-checked against `package.json` and the workspace filesystem:

| Command / Script in README | Matching Definition in `package.json` | Verified Status |
|---|---|---|
| `npm install` | Standard npm | Verified |
| `npm run dev` | `"dev": "next dev"` | Verified |
| `npm run build` | `"build": "prisma generate && next build"` | Verified |
| `npm run start` | `"start": "next start"` | Verified |
| `npm run prisma:generate` | `"prisma:generate": "prisma generate"` | Verified |
| `npm run prisma:seed` | `"prisma:seed": "tsx prisma/seed.ts"` | Verified |
| `npm run test:unit` | `"test:unit": "vitest run --config vitest.unit.config.ts"` | Verified |
| `npm test` | `"test": "vitest run"` | Verified |
| `npx prisma db push` | Prisma CLI | Verified |

| File Path in README | Location on Disk | Verified Status |
|---|---|---|
| `package.json` | `package.json` | Verified |
| `prisma/schema.prisma` | `prisma/schema.prisma` | Verified |
| `prisma/seed.ts` | `prisma/seed.ts` | Verified |
| `src/lib/services/link.service.ts` | `src/lib/services/link.service.ts` | Verified |
| `src/lib/utils/user-agent.ts` | `src/lib/utils/user-agent.ts` | Verified |
| `scripts/capture_logged_in.mjs` | `scripts/capture_logged_in.mjs` | Verified |
| `test/global-setup.ts` | `test/global-setup.ts` | Verified |
| `.env.example` | `.env.example` | Verified |
| `docs/screenshots/` | `docs/screenshots/.gitkeep` | Verified (0 images present) |

---

## Items Marked "Needs Verification" / User Action

1. **Team Member Information in `README.md`**:
   - The team section currently contains placeholders: `<MEMBER_1_NAME> (<GITHUB_USERNAME>)`. The user will fill in the actual names and GitHub handles.
2. **Demo Access Credentials in `README.md`**:
   - The live demo section uses placeholders `<DEMO_EMAIL>` and `<DEMO_PASSWORD>` to maintain credential security. The user can supply the credentials designated for judges.
3. **Screenshot Generation**:
   - `docs/screenshots/` currently has only `.gitkeep`. The user can run `node scripts/capture_logged_in.mjs` while their server is active to generate and copy the final screenshots into `docs/screenshots/`.
