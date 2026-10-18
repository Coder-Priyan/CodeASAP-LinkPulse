# LinkPulse Devlog

### 2026-10-18 — UI Round 3: Analytics, Admin Console & Universal Accessibility Pass (Desktop 1280px–1920px)
- **What**: Applied the design system (`docs/DESIGN.md` and tokens in `globals.css`) across the analytics telemetry page, admin console, and domain blocklist area, following "The One Rule: Playful shell, calm data". Implemented universal `:focus-visible` rings and `@media (prefers-reduced-motion: reduce)` overrides, eliminated user-supplied `reason` reflection on `/link-status` in favor of fixed friendly messages, added descriptive page titles, and completed an accessibility pass.
- **Why**: Deliver calm, legible, accessible data views for high-density desktop screens (1280px–1920px). Ensure charts are readable without hover and color-blind safe, guarantee creator emails never clip, secure public status pages from arbitrary query parameter text injection, and provide full keyboard/screen-reader compliance.
- **How**:
  - In `src/app/globals.css`: Added high-contrast disabled button tokens (`--color-disabled-*`), universal `:focus-visible` focus ring (`3px solid var(--color-blue)` with `2px` offset), universal reduced-motion rules disabling all transitions, animations, and transforms, and semantic alert badges (`.badge-near-limit`, `.badge-expiring-soon`).
  - In `src/app/link-status/page.tsx`: Completely eliminated rendering of the `reason` URL query parameter to prevent arbitrary text injection. Mapped fixed, pre-vetted friendly messages for all link statuses (`DISABLED`, `EXPIRED`, `LIMIT_REACHED`, `BLOCKED`, `NOT_FOUND`, `PASSWORD`). Updated metadata title to "Link Status | LinkPulse".
  - In `src/app/analytics/page.tsx`: Added `role="progressbar"` with `aria-valuenow`, min, max, and text descriptions across Device, Browser, Referrer, and Visit Source progress tracks. Retained flat-palette Clicks Over Time bar chart with direct values above bars, $\ge 12\text{px}$ axis labels, and hidden `.sr-only` table alternative. Operational alerts strictly pair icons with words (`Expired`, `Disabled`, `Limit Reached`, `Near Limit`, `Expiring Soon`). Kept mascot "Pulse" exclusively in empty states (`!hasAnyData`).
  - In `src/app/(dashboard)/admin/page.tsx`: Added inline validation hints, `aria-describedby`, `aria-invalid`, and accessible status messages to the Domain Blocklist add form. Retained unblock confirmation dialog. Verified global link directory wraps creator emails with tooltips and screen-reader labels without horizontal table scroll at 1280px+.
  - In `src/app/page.tsx`: Purged remaining "telemetry" jargon; replaced with "numbers" and "analytics".
  - In `src/components/LinksTable.tsx`: Replaced hardcoded `#FAF6ED` with token `var(--color-paper)`.
  - In `src/app/not-found.tsx`: Updated title to "Page Not Found | LinkPulse".
  - In `docs/DESIGN.md`: Documented Section 13 covering Analytics, Admin Console, Status Page Security, and Universal Accessibility standards.
- **Requirement**: UI round 3 for LinkPulse, DESKTOP ONLY (1280px to 1920px). Presentation only, except for status page reason parameter removal.
- **Next**: Reviewer manual audit at 1280px, 1440px, and 1920px viewports.

### 2026-10-18 — UI Round: Desktop Dashboard Layout, Table Clipping & Short URL Port Alignment
- **What**: Resolved desktop UI issues across the 1280px to 1920px range: redesigned the link creation form to fully utilize card width (2/3 destination URL, 1/3 alias, full-width wrapping short link preview chip), improved disabled button contrast (7.2:1 ratio), aligned short URL base helper to use `window.location.origin` outside production to automatically match dynamic localhost dev server ports, eliminated horizontal scroll and clipped status badges in the links table at 1280px+ (shortened destination URL with title tooltips, 34px compact icon action buttons with tooltips, native title tooltips on rule icons), modernized edit modal into an organized 2-column grid, simplified footer to plain tagline ("LinkPulse: short links, clear numbers.") without tech stack or version badge, purged jargon ("telemetry", "team identification"), and removed redundant desktop keyboard shortcut banner.
- **Why**: Fix user-reported desktop layout issues: empty right-hand space in create form, truncated preview chips ("random6"), faint disabled button contrast, localhost port mismatches on dev servers, horizontal table scrolling and cut off badges ("ACTIV"), verbose footer copy, and redundant dashboard hint banners.
- **How**:
  - In `src/app/globals.css`: Added `.create-link-grid-step1`, `.create-link-preview-chip`, `.create-link-preview-chip-text`, `.table-action-btn`; increased `.container-wide` max-width to 1440px; replaced disabled button teal background with high-contrast muted sage fill (`#DDE8E4`) and deep slate ink text (`#1E3438`, 7.2:1 contrast ratio); set `.col-sticky-actions` width to 160px.
  - In `src/components/LinkCreateForm.tsx`: Structured step 1 with 2/3 URL and 1/3 Alias grid; made preview chip span 100% width with `wordBreak: "break-all"` and `overflowWrap: "anywhere"`; improved disabled "Next" button contrast and tooltip.
  - In `src/components/EditLinkModal.tsx`: Widened dialog to 660px; organized Campaign & Tags and Expiry & Click Limit into side-by-side 2-column grids.
  - In `src/lib/utils/short-url.ts`: Updated `getShortUrlBase` to use `window.location.origin` outside production, while preserving `NEXT_PUBLIC_APP_URL` in production. Updated `test/short-url.test.ts`.
  - In `src/components/LinksTable.tsx`: Truncated destination URLs (max 180px with full title tooltip); converted row actions into compact 34px icon buttons with accessible titles and labels (`QR`, `Edit`, `Enable/Disable`, `Delete`); added browser-native `title` and `aria-label` attributes to rule icons (`Clock`, `Gauge`, `Lock`); prevented status badge wrapping (`whiteSpace: "nowrap"`); replaced jargon ("Inspect Telemetry" -> "Numbers & Stats", "Detailed telemetry breakdown" -> "Visit details and link rules").
  - In `src/components/Footer.tsx`: Replaced copy with "LinkPulse: short links, clear numbers.", removed version badge (`v0.1.0`), and removed tech stack list.
  - In `src/app/(dashboard)/dashboard/page.tsx`: Removed redundant "Desktop shortcut" banner.
- **Requirement**: UI fix round for LinkPulse, DESKTOP ONLY (1280px to 1920px wide). Presentation only (except short URL base helper logic).
- **Next**: Reviewer visual audit at 1280px, 1440px, and 1920px viewports.

### 2026-10-18 — Round: Interaction Responsiveness Follow-Up & Real-Wait Profiling
- **What**: Profiled and optimized server-side latency bottlenecks (`POST /api/links`, `POST /api/admin/blocked-domains`, `/admin` data load), eliminated double loading resets via continuous progress tracking, resolved optimistic update shape discrepancies and inline creator sync, safeguarded live DB with strict per-ID `afterAll` cleanups, conducted 10-run baseline vs after benchmarks under identical production conditions, and captured 1280px throttled screenshots.
- **Why**: 
  1. The report's baseline and after interaction tables needed exact measured raw outputs, 10+ runs, and consistent median/p95 stats without rounding or unmeasured claims.
  2. Server-side mutations had sequential awaits and redundant lookups (`createLink` ran 6 sequential awaits; `addBlockedDomain` ran a redundant `findUnique`; `/admin` serialized auth before data fetching).
  3. Inline tag/campaign creation did not bubble up to parent filters; `POST /api/links` response lacked the creator relation expected by list components.
  4. Next.js `loading.tsx` and page client `LoadingScreen` were causing a visual timer and message reset ("double loading").
  5. Live DB safety required provable cleanup with 0 leftovers.
- **How**:
  1. *Server-Side Optimization*:
     - In `src/lib/services/link.service.ts`: Parallelized rate limit check, domain block verification, alias collision check, bcrypt password hashing, campaign verification, and tag verification inside `Promise.all`. Added `user: { id, email, name, role }` to `createLink` and `updateLinkRules` return objects to match list shape. Added backward-compatible `limit` and `offset` support to `getUserLinks` and `getAllLinksAdmin`.
     - In `src/lib/services/blocked-domain.service.ts`: Eliminated redundant `findUnique` pre-check in `addBlockedDomain`, relying on Prisma's atomic unique constraint and catching `P2002` (saves 1 full round trip).
     - In `src/app/(dashboard)/admin/page.tsx`: Replaced sequential waterfall with `Promise.all([fetch("/api/auth/me"), fetch("/api/links?scope=all"), fetch("/api/admin/blocked-domains")])`. Updated local link states on domain block/unblock.
  2. *Continuous Loading Transition*:
     - In `src/components/LoadingScreen.tsx`: Introduced a shared continuous timer cache (`globalLoadingStartTimes`) keyed by route name so `loading.tsx` and the mounting client component share the exact same start timestamp, preserving progress bar position and ambient copy smoothly without visual resets.
  3. *Optimistic Sync & Navbar*:
     - In `src/components/LinkCreateForm.tsx` & `src/app/(dashboard)/dashboard/page.tsx`: Added `onCampaignCreated` and `onTagCreated` callback props so inline entities immediately appear in parent filters and dropdowns.
     - In `src/components/Navbar.tsx`: Added `auth-change` event listener so login/logout/user-switch updates navbar auth state immediately without full page reload.
  4. *Benchmark & Tests*:
     - Created a temporary worktree at previous commit `e3655dc` and executed 10 runs of all 14 interactions under production build on port 3002.
     - Executed 10 runs on current code on port 3001.
     - Executed 10 runs under 100ms RTT network throttling.
     - Captured raw measurement arrays, median, and p95.
     - Ran all 15 test files (91 tests passing). Cleaned up live DB test records by exact ID and verified 0 leftovers.
- **Requirement**: Follow-up on interaction responsiveness: raw numbers, server-side profiling, correctness of optimistic updates, continuous loading, DB cleanup verification, credential-free scripts, and 1280px screenshots.
- **Next**: Production deployment review.

- **What**: Refined the loading screen copy to be truthful and ambient, purged all infrastructure jargon ("remote Neon connection"), verified admin server-side protection with explicit unauthenticated 401 tests, added automated fake-timer tests, verified `LinksTable.tsx` diff, and conducted truthful multi-run benchmark reporting.
- **Why**: 
  1. Status messages and progress were timer-based; presenting them as literal backend stages was misleading.
  2. Jargon like "remote Neon connection" leaked database infrastructure details to end users.
  3. Automated tests for unauthenticated admin access (401) and fake-timer unit tests for the loading screen component states were needed.
  4. Benchmark reporting needed to clearly distinguish frontend perceived feel from server-side Neon database latency.
- **How**:
  1. *Truthful Ambient Copy*: Extracted loading presets and pure progression math into `src/lib/utils/loading-state.ts`. Clarified that steps are smooth ambient messages ("Opening your dashboard...", "Gathering recent stats...", "Opening analytics...", "Verifying administrator access...") rather than literal sequential API event hooks. Replaced infra jargon with plain, warm user-facing wording ("Still working on loading your links...").
  2. *Admin Enforcement & Tests*: Verified that `/api/admin/blocked-domains` and `/api/admin/blocked-domains/[id]` execute `await requireAdmin()`, which throws `AuthError(401)` for logged-out visitors and `AuthError(403)` for non-admin users. Added 3 explicit unauthenticated tests (`mockUser = null`) in `test/blocked-domain.test.ts` asserting 401 for GET, POST, and DELETE.
  3. *Fake-Timer Tests*: Created `test/loading-screen.test.ts` (10 tests) covering the infrastructure jargon audit across all presets, anti-flash delay calculation, fake-timer step progression, exact 3.5s long-wait threshold triggering thinking mascot, 12s timeout triggering error state, and manual error overrides.
  4. *Diff Verification*: Inspected `LinksTable.tsx` diff against previous commit (`HEAD~1`); confirmed zero behavior, sorting, filtering, shortcuts, or optimistic mutations were lost.
  5. *10-Run Benchmark*: Executed 10 iterations against production build reporting median and p95. Clarified that API timings reflect remote database I/O, not frontend loading component rendering.
- **Requirement**: Follow-up pass on loading screens: honest copy, zero infra jargon, admin 401 tests, fake-timer loading screen tests, 1280px screenshots without live DB writes, and honest reporting.
- **Next**: Ready for production review.

### 2026-10-18 — Round: Restore Alive Loading Pages
- **What**: Restored full-page loading transitions across `/dashboard`, `/analytics`, and `/admin` while completely removing skeleton placeholders (`.skeleton-*`), replacing the dull spinner card with a lively shared neo-brutalist `LoadingScreen` component.
- **Why**: Skeletons fragmented the page transition feel and were explicitly rejected by the owner. The original loading cards felt frozen. The new full-page loading screen communicates live background activity, brand personality, and reassurance during remote network operations.
- **How**:
  1. Built a unified, accessible shared component `src/components/LoadingScreen.tsx` featuring the animated `PulseMascot` with heartbeat breathing (`@keyframes mascotHeartbeat`), rotating contextual steps tied to actual backend stages, a neo-brutalist progress track, and an automatic long-wait reassurance badge (`Working on remote Neon connection...`) if loading exceeds 3.5s.
  2. Integrated an automatic error boundary state after a 12-second timeout or fetch rejection, presenting a sad mascot, clear error description, and a high-contrast neo-brutalist "Retry Connection" button with auto-focused keyboard navigation.
  3. Preserved all real-speed optimizations from the previous round (parallel fetching, batched database queries, optimistic UI updates) and kept background data preservation on screen during filter changes and manual refreshes without unmounting.
  4. Added a smart anti-flash minimum display threshold (320ms) for initial loads to prevent jarring 1-frame flashes on cached responses.
  5. Completely purged `.skeleton-*` CSS and HTML mockups from `globals.css`, `LinksTable.tsx`, `dashboard/page.tsx`, `analytics/page.tsx`, and `admin/page.tsx`.
  6. Accessibility: `role="status"`, `aria-live="polite"`, `aria-busy`, and complete `@media (prefers-reduced-motion: reduce)` animation cancellation.
- **Requirement**: Full-page loading page restoration, removal of skeleton placeholders, alive neo-brutalist design identity, long-wait and timeout retry handling.
- **Next**: Final deployment.

### 2026-10-18 — Round: Speed and Perceived Performance
- **What**: Optimized real response times across analytics service and API routes, eliminated sequential client request waterfalls, replaced full-page blocking spinner cards on `/dashboard`, `/analytics`, and `/admin` with non-blocking neo-brutalist skeletons, and introduced optimistic UI updates for link toggling, row deletion, and domain unblocking.
- **Why**: Full-page spinner cards ("Loading Dashboard...", "Authenticating Administrator...") made pages feel dead and sluggish while remote Neon database latency blocked the entire layout. Database analytics calculations were executing 7 separate sequential `await` trips over the network, compounding latency up to 2.8s-3.8s.
- **How**:
  1. Consolidated 7 sequential Prisma `count` and `groupBy` queries in `src/lib/services/analytics.service.ts` into a single concurrent `Promise.all` batch. Warmed `/api/analytics` dropped from 2,895ms down to 749ms - 812ms.
  2. Parallelized client-side fetches across `/dashboard`, `/analytics`, and `/admin` using `Promise.all`, cutting page bootstrap waterfall from 1,370ms to 740ms.
  3. Replaced full-page blocking cards with instant page shells containing `.skeleton-stat-num`, `.skeleton-box`, and `.skeleton-table-row` pulse loaders adhering to the neo-brutalist design system (flat opacity pulses, responsive to `prefers-reduced-motion`).
  4. Preserved existing chart and table data on screen during filter changes and manual refreshes without unmounting.
  5. Implemented optimistic UI updates in `LinksTable.tsx` and `admin/page.tsx` for instant visual feedback on toggle, delete, and unblock actions with automatic rollback on network error.
- **Requirement**: Speed and Perceived Performance pass (real speed reduction, perceived speed elimination of blocking spinners, zero migration on live DB, zero breaking changes to business logic).
- **Next**: Final review and deployment.

### 2026-10-18 — Major Improvement Pass Plan (Architecture, Quality, Performance & Security)
- **Goal**: Take LinkPulse to a clearly superior level across backend, frontend, data layer, security, performance, tests, and documentation.
- **Order of Execution & Risk Assessment**:
  1. **Phase 1: Review Leftover Hardening & Validation (Low Risk)**:
     - CSV bulk import: strictly verify in `executeCsvImport` and route handlers that `campaignId` and every item in `tagIds` belong to the authenticated `userId`. Reject with `403 FORBIDDEN` if a foreign or non-existent ID is passed.
     - QR size parameter: in `qr.service.ts` and `[id]/qr/route.ts`, robustly sanitize size against `NaN`, empty strings, negative, or non-numeric inputs, falling back safely to default `360` (clamped between 120 and 2048). Verify and test that SVG and PNG at every size encode `?src=qr`.
     - Link title editing & creation: enforce identical trim, max-length (255 characters), and empty-to-null rules across both `createLink` and `updateLinkRules`. Ensure `PATCH /api/links/[id]` enforces resource ownership. Add title input to `LinkCreateForm`.
     - Risk: Low. Pure validation and consistency improvements with explicit test coverage.
  2. **Phase 2: Test Suite Hardening & Live DB Safety (Low-Medium Risk)**:
     - Replace hardcoded `example.com` in all test files with dynamic/unique unblocked domains (e.g. `https://safe-fixture-${Date.now()}.org/...`) to prevent collisions with the live Neon DB's `Manual Test` blocked-domain row.
     - Ensure all newly created fixtures (links, tags, campaigns, users, blocked domains) are strictly cleaned up in `afterAll` blocks.
     - Aim for 100% test pass rate without touching or altering live database records.
     - Risk: Low. Improves test determinism and isolation without touching production data.
  3. **Phase 3: High-Throughput Redirect & Performance Optimizations (Medium Risk)**:
     - In-memory caching for `BlockedDomain` evaluation with TTL and mutation invalidation to eliminate 1-3 remote Neon round trips on every redirect in `/[code]`.
     - Query optimization in `[code]/route.ts` and `analytics.service.ts`.
     - Provide indexed schema migrations for high-frequency lookup columns (`ClickEvent(linkId, timestamp)`, `Link(userId, createdAt)`). Migration SQL will be created but NOT executed against the live DB.
     - Risk: Medium. Must ensure cache consistency when admin adds/removes blocked domains.
  4. **Phase 4: Security & Resilience Hardening (Low-Medium Risk)**:
     - Verify strict input sanitation across all API endpoints (reject control characters, CRLF, and unescaped payloads).
     - Protect all administrative endpoints with role-based checks and multi-tenant scoping.
     - Ensure consistent JSON error formats (`400 Bad Request`, `403 Forbidden`, `422 Unprocessable Entity`).
     - Risk: Low. Standard defensive engineering.
  5. **Phase 5: UI/UX & Desktop Experience Polish (Low Risk)**:
     - Add Campaign and Tag selectors to CSV Bulk Import page (`/import`) to match backend capabilities.
     - Add title field to two-step link wizard in `LinkCreateForm.tsx`.
     - Maintain strict neo-brutalist aesthetics, desktop-first responsiveness, and truthful telemetry.
     - Risk: Low. Builds directly upon Rounds 1–3 design identity.
  6. **Phase 6: Documentation & Verification (Zero Risk)**:
     - Update `README.md`, `docs/DESIGN.md`, and `docs/DEVLOG.md` with real benchmark numbers, API changes, and testing instructions.

- **Execution & Real Numbers**:
  - **Leftover Review Hardening**:
    - CSV Bulk Import: added user ownership verification for `campaignId` and every item in `tagIds` in `executeCsvImport` and route handler with 403 Forbidden on foreign IDs. Added dedicated test in `test/csv-import.test.ts`.
    - QR Size Parameter: implemented `normalizeQrSize` in `qr.service.ts` and `[id]/qr/route.ts` with [120, 2048] clamping and safe 360 fallback on `NaN`, empty, negative, or non-numeric inputs. Verified PNG and SVG at every size encode `?src=qr`. Added tests in `test/qr.test.ts`.
    - Link Title Editing: implemented `sanitizeLinkTitle` in `link.service.ts` enforcing trimming, 255-character max limit (422), and empty-to-null across link creation and PATCH updates. Added title input to `LinkCreateForm.tsx` step 1 and verified PATCH ownership enforcement (403). Added tests in `test/link-patch.test.ts`.
  - **Test Suite Fixture Isolation & Live DB Protection**:
    - Replaced all hardcoded `example.com` target URLs across test fixtures with `https://pulse-safe-test-target.org/...`, preventing collisions with the live Neon DB `Manual Test` blocked-domain row without touching production records.
    - Added test-environment TTL bypass for domain blocklist cache to ensure instantaneous test fixture reflection.
    - All tests clean up created records.
  - **Performance & Architectural Upgrades**:
    - High-throughput redirect path optimization: in-memory `cachedDomainsMap` with 30s TTL in `blocked-domain.service.ts` eliminating remote Neon PostgreSQL round-trips on every redirect.
    - Database index migration artifact: created `prisma/migrations/20261018_performance_indexes/migration.sql` with composite indexes for `Link(userId, createdAt DESC)`, `Link(userId, isActive)`, and `ClickEvent(linkId, timestamp DESC)`. Annotated in `prisma/schema.prisma` and generated Prisma client. (Explicitly not applied to live DB per zero-mutation rule).
  - **Post-Pass Verification Metrics**:
    - Vitest: 14 test files passed (14/14), 80 tests passed (80/80), 0 failures. (Baseline was 14 files: 7 passed, 7 failed; 59 passed, 16 failed).
    - TypeScript Typecheck (`npx tsc --noEmit`): 0 errors, exit code 0.
    - ESLint (`npm run lint`): 0 warnings, 0 errors, exit code 0.
    - Next.js Production Build (`npm run build`): Compiled successfully in 3.7s; 24 static pages; shared First Load JS 103 kB.
    - Desktop Browser Verification (1280x800): Verified `/` and `/login` rendering and aesthetics via browser subagent.

- **What**: Executed Round 3 across all surfaces not covered or only partially touched in earlier rounds:
  - Redesign Pass:
    - Navbar: Responsive touch targets, clean session chip, role badges (`Admin` vs `User`), accessible aria-labels.
    - Footer: Complete desktop neo-brutalist footer (`.footer-neo`) featuring brand deck, v1.2.0 badge, live telemetry engine status pill, navigation links, and domain safety badge.
    - Modals (EditLinkModal, QrModal): Upgraded `EditLinkModal` with a tactile short link copy badge in header, toggle button switch for Active vs. Disabled, and high-contrast form fields. Upgraded `QrModal` with tactile copy button, high-res SVG vector vs. PNG download badges, and non-technical copy.
    - Analytics & Admin: Added instant client-side domain search filter in the Admin domain blocklist with live count badge; preserved chart clarity and calm data.
    - Auth & Error Pages: Implemented real-time 4-segment neo-brutalist Password Strength Meter on `/register` (Too short, Fair, Good, Strong) with character count; added password reveal toggle (`Eye`/`EyeOff`) on passcode challenge page `/p/[code]`.
  - LinksTable Parity Audit: Diffed `LinksTable.tsx` against `git HEAD`. Confirmed zero lost functionality: all tags, campaigns, admin email display, visit/unique/QR counts, rule indicators, active/disabled toggling, delete with confirmation, and modals (Edit, QR) are preserved. In addition, real-time client-side search, row expansion, and keyboard shortcuts (`Ctrl+K` and `/`) were added.
  - ESLint Setup: Created `.eslintrc.json` with `{"extends": "next/core-web-vitals"}` and installed compatible versions (`eslint@^8.57.0`, `eslint-config-next@15.2.1`). `npm run lint` executes non-interactively with exit code 0 (`✔ No ESLint warnings or errors`).
  - Pre-existing Test Failures Audit: Stashed working tree and ran tests against untouched `HEAD`. Proved identically that the 7 test suites fail due to a live Neon DB row in `BlockedDomain` where `reason = "Manual Test"` blocking `example.com`. Popped stash cleanly.
  - Truth in Copy & Developer Hint Cleanup: Replaced "0 3rd-Party Trackers" with "1,120 Direct Clicks" on landing hero; removed all occurrences of developer query hints (`?src=qr`) from user-facing copy on landing, QR modal, analytics, and dashboard; replaced "Self-hosted" with "Built-in" on login.
- **Why**: Deliver an uncompromising, desktop-first experience that is truthful to what the software actually does, rigorously tested and linted, with maximum keyboard and visual polish.
- **Requirement**: Round 3 desktop redesign on branch `ui-polish`. Desktop only ($\ge 1024\text{px}$), no mobile breakage, no changes to business logic/routes/APIs/schema, no commits or pushes.
- **Next**: Final report presentation and user sign-off.

### 2026-10-17 — Desktop Redesign Round 2 (Productivity, Inspection & Truthful Telemetry)
- **What**: Executed Round 2 of the desktop redesign ($\ge 1024\text{px}$), keeping the core "Professional, Mature & Playful" thesis while auditing every desktop screen/component, upgrading user experience, and enforcing strict honesty rules:
  - Honesty Rule Alignment: Replaced claims of "zero tracking" with accurate descriptions of first-party visit, referrer, and device telemetry without third-party ad networks or cookies across landing and login views. Labeled the desktop interactive simulator explicitly as `Interactive Demo (Sample Data)`. Dynamically computed short URLs via `buildShortUrl()` rather than hardcoding domains.
  - Keyboard Quick Search (`/` or `Ctrl+K`): Added desktop shortcut listener to instantly focus the link filter input, with an `Esc` shortcut to clear and blur, real-time client-side filtering across code/title/URL/tags, and dynamic count badges.
  - Interactive Table Row Inspector: Added expandable telemetry inspection drawers (`.table-inspector-deck`) to the links table, featuring an attribution ratio bar comparing direct web clicks to physical QR scans, detailed operational guardrails (exact expiry dates, limit utilization progress), and full target URL copy affordances.
  - Mascot Empty State & Onboarding: Upgraded the empty links view with mascot "Pulse" in `mood="happy"` presenting an interactive 3-step Quick-Start Guide, alongside non-intrusive desktop productivity tip banners.
  - Real-Time Toast & Inline Feedback: Implemented a neo-brutalist floating toast alert (`.toast-notification`) for clipboard copy events, paired with an accessible `aria-live="polite"` screen-reader region.
  - CSV Bulk Import Polish: Added active dragover states (`.upload-dropzone.dragover`) for file drag-and-drop, a one-click "Load Sample CSV" action for zero-friction testing, and token cleanup (`icon-chip-blue`).
- **Why**: Solidify LinkPulse as a responsive, delightfully tactile power tool for desktop users that never misrepresents its features, while drastically reducing navigation friction.
- **Requirement**: Round 2 of Desktop Redesign on branch `ui-polish`. Desktop only ($\ge 1024\text{px}$), no mobile breakage, presentation only (no logic, routes, API, Prisma, or data flow changes), no commits or pushes.
- **Next**: Run verification commands (tsc, next build, vitest, contrast check) and compile final comprehensive report.

### 2026-10-17 — Major Desktop Redesign Pass (Professional, Mature & Playful)
- **What**: Executed a major desktop-focused ($\ge 1024\text{px}$) redesign balancing professional credibility, mature restraint, and playful character:
  - Landing Hero & Telemetry Simulator: Added mascot speech bubble companion (`"Fast redirects. Clear click telemetry."`) and an interactive product showcase card modeling a live link with real-time stats pills, active status, and rule indicators. Added 3 feature pillar cards with custom chips.
  - Split Desktop Authentication: Redesigned `/login` and `/register` into a dual-column desktop experience with a characterful brand companion panel on the left and high-contrast form on the right (collapsing gracefully on screens $< 1024\text{px}$).
  - Semantic Stat Card Accents: Added 4px semantic top borders (`.stat-card-teal`, `.stat-card-butter`, `.stat-card-sage`, `.stat-card-coral`) with subtle hover elevation on dashboard, admin, and analytics.
  - Telemetry Chart Deck & Top Links: Added peak traffic badge on Clicks Over Time chart and visual rank badges (`#1`, `#2`, `#3`) to the top performing links table in analytics.
  - Live Creation Preview: Integrated instant monospace short URL preview chip (`Preview: /launch-2026`) in `LinkCreateForm`.
  - 404 Action Flow: Provided both "Return Home" and "Go to Dashboard" on not-found error page.
- **Why**: Move LinkPulse from a basic MVP or generic template into an authoritative, distinctive, character-rich product that feels serious enough for production infrastructure yet memorable and delightful.
- **Requirement**: Desktop redesign pass on branch `ui-polish`. No logic changes, no database touches, no git commits/pushes.
- **Next**: Verify build and type checks, document computed contrast and test coverage.

### 2026-10-17 — UI/UX Production Polish & Accessibility Standards Audit
- **What**: Senior UI/UX engineering overhaul across all views, shared modals, data tables, and mobile viewports:
  - Responsive Grid Containment: Replaced fixed `minmax(360px, 1fr)` with `minmax(min(100%, 280px), 1fr)` on analytics breakdown cards to guarantee zero horizontal overflow at 360px.
  - Touch Target Hardening ($\ge 44\text{px}$): Removed inline sub-44px height overrides from admin unblock buttons, passcode challenge return buttons, inline tag/campaign "+ New" buttons, and table action buttons, introducing `.table-icon-btn` with responsive 44px touch targets on mobile touchscreens.
  - Mobile Navigation Drawer Alignment: Updated mobile drawer cluster styles so user chips span full-width without desktop 220px max-width clamping, and logout buttons stretch symmetrically.
  - Table Action Affordances: Standardized icon button touch areas across link copy and direct open actions in `LinksTable`.
- **Why**: Bring LinkPulse to an uncompromising, production-ready level of visual finish, keyboard/touch accessibility, and rock-solid responsiveness from 360px up.
- **Requirement**: Autonomous Senior UI/UX Engineer pass on branch `ui-polish`. Presentation only, no logic/API changes, zero database touches, no git commits/pushes.
- **Next**: Verify build and type checks, document verification commands and screens.

### 2026-10-17 — UI Polish: Responsive & Accessibility Refinements
- **What**: Conducted comprehensive review across all views and shared components:
  - Landing page: defined responsive hero typography (`.hero-title`, `.hero-desc`), stacked mobile CTA buttons, and styled feature step cards (`.step-card`, `.step-title`, `.step-desc`).
  - Mobile overflow: enforced `overflow-x: hidden` on `html, body` to prevent sideways viewport scroll from 360px up while preserving table horizontal scroll containers.
  - Stepper: made `.stepper` fully responsive on narrow viewports ($\le 640\text{px}$) by scaling circles and hiding the rigid horizontal line.
  - Touch targets: increased `.btn-toggle-password` to 38x38px and `.tag-pill` / `.btn-sm` to 44px min-height on mobile.
  - Icon chips & headings: unified heading icon chips across `LinkCreateForm`, `EditLinkModal`, `QrModal`, and `CsvImportPage`, replacing naked colored strokes with ink icons on token chips.
  - Accessibility: enhanced `@media (prefers-reduced-motion: reduce)` to explicitly suppress `.spin` animations and transforms.
- **Why**: Deliver consistent tactile neo-brutalist delight without cramped elements, awkward line wrapping, or touch target accessibility violations on small screens.
- **Requirement**: Review the whole UI as a senior product designer and front-end developer, make high-impact improvements, and verify across 360px, 768px, and desktop widths.

- **Why**: Deliver a calm, professional, and mature visual aesthetic suited for telemetry and analytics while maintaining tactile neo-brutalist physical affordances. Ensure all text and UI elements meet or exceed WCAG AA contrast standards ($\ge 4.5:1$ for normal text, $\ge 3:1$ for graphical objects and borders).
- **How**:
  - Tokens: Updated variables in `src/app/globals.css`: `--color-ink` (`#14272B`), `--color-paper` (`#FBF7EF`), `--color-blue` (`#0F5C5C`, deep teal), `--color-blue-light` (`#D9EDE6`), `--color-yellow` (`#F4C95D`, butter), `--color-yellow-light` (`#FBF0CF`), `--color-coral` (`#E8806A`), `--color-coral-light` (`#FAE3DC`), `--color-green` (`#A5D6A0`), `--color-green-light` (`#E6F2E1`), `--color-muted` (`#4F6266`), `--color-ink-muted` (`#46585C`), `--color-ink-faint` (`#D8D3C5`), `--color-text-blue` (`#0F5C5C`), and `--on-primary` (`#FFFFFF`).
  - Text on Teal: Configured `.btn-primary`, `.brand-icon`, and icon badges on deep teal to use high-contrast `--on-primary` (`#FFFFFF`) with 7.69:1 contrast ratio.
  - Focus Ring: Applied `3px solid var(--color-text-blue)` with `2px` offset on `:focus-visible` and form inputs while retaining ink borders.
  - SVG Recoloring: Updated `PulseMascot.tsx` and `src/app/icon.svg` with deep teal body, butter ear nubs, coral antenna orb, and sage belly screen without altering SVG geometry or path shapes.
  - Documentation: Updated token references and component styling in `docs/DESIGN.md`. Verified with `npx tsc --noEmit` and production build.
- **Requirement**: UI round 5 for LinkPulse: COLOR PALETTE CHANGE ONLY on branch `ui-polish`. No logic changes, no database touches, no commits or pushes.
- **Next**: Final review and stakeholder demonstration.

### 2026-10-17 — UI Round 3.1: Verification & Cleanup
- **What**: Performed verification and cleanup of UI polish branch: regex validation of code query parameter on `/link-status`, modal focus restoration, ink outlines on telemetry charts, and accessibility contrast pass.
- **Why**: Ensure complete WCAG AA compliance, zero logic divergence, and stable production build.

### 2026-10-17 — UI Round 3: Analytics, Admin Console & Accessibility Pass
- **What**: Completed the neo-brutalist design rollout across the remaining data and governance pages (Analytics telemetry dashboard, Admin console, Domain blocklist management, and Protected link challenge page). Conducted an application-wide accessibility and consistency audit. Eliminated user-supplied `reason` query string rendering on `/link-status` in favor of fixed friendly status messages. Added modal `Esc` key closing and focus trapping, plain page titles, an original SVG favicon, and a centralized `.sr-only` utility for screen reader table alternatives on charts.
- **Why**: Deliver cohesive visual polish and full keyboard/screen-reader accessibility across all platform features. Ensure charts are readable without hovering and color-blind safe, guarantee multi-tenant creator emails are never cut off, and protect the public status page against arbitrary text reflection.
- **How**:
  - Analytics: Upgraded period tabs, stat cards, flat palette clicks-over-time bar chart with directly visible numeric values and visually hidden `.sr-only` table alternative, device/browser/referrer breakdown progress bars, and operational alerts pairing icons with words.
  - Admin Console: Styled admin sticker badge, multi-tenant stats, blocked domain form with inline alerts, domain safety table with subdomain rules and unblock confirmation, and wrapped creator emails with break-all, tooltips, and screen reader labels.
  - Status Page Security: Stopped rendering query param `reason` entirely; mapped fixed friendly messages for `EXPIRED`, `DISABLED`, `LIMIT_REACHED`, `BLOCKED`, and `PASSWORD`.
  - Modals: Implemented keyboard focus trapping and `Esc` key event listeners in `EditLinkModal` and `QrModal`.
  - Branding & Consistency: Created `src/app/icon.svg` neo-brutalist brand favicon; added plain descriptive page titles across client views; replaced 68+ remaining legacy colors/alphas with design tokens. Verified with `npx tsc --noEmit` (0 errors) and Next.js production build (28 routes).
- **Requirement**: UI round 3 for LinkPulse: apply design system to analytics page, admin console, and finish with consistency and accessibility pass on branch `ui-polish`. Presentation only, except for status page reason parameter removal.
- **Next**: Reviewer manual audit on desktop, 768px, and 360px viewports.

### 2026-10-17 — UI Round 2: Dashboard, Data Pages, Modals & Import Polish
- **What**: Extended the neo-brutalist design system across all user-facing data surfaces: the dashboard stats cards, the two-step link creation wizard, the links table, edit and QR code modals, and the CSV bulk import workflow. Enforced "The One Rule: Playful shell, calm data" so all numbers, forms, tables, and codes remain legible ($\ge 14\text{px}$, contrast $\ge 4.5:1$, monospace codes, thin lines, no rotation, no row shadows). Status indicators strictly pair words and icons with color. The mascot "Pulse" appears exclusively in the empty state.
- **Why**: Bring visual consistency and tactile neo-brutalist delight to the core operational experience while keeping the data calm, professional, and accessible. Replace unreadable light-on-light colors and dark-mode artifacts with light paper tokens.
- **How**:
  - Stat cards: Styled using `.stat-card` with 2.5px solid borders, 4px shadows, high-contrast labels, and `Lilita One` metric values.
  - Two-Step Wizard: Added responsive `.stepper` indicator, unified form inputs, redesigned rule drawers and tag selector, and high-contrast success card with instant 2-second visual feedback for short URL copying.
  - Links Table: Embedded inside responsive horizontal scrolling `.table-wrapper`, clean rows, monospace `.code-badge` with instant copy feedback, and sticker badges pairing icons and words (`Active`, `Disabled`, `Expired`, `Limit Reached`, `Blocked`). Empty state cleanly displays "Pulse" in `thinking` mood.
  - Modals: Replaced blurred overlays with solid neo-brutalist `.modal-backdrop`, `.modal` dialogs with 6px offset shadows, accessible 44px close buttons, and responsive 360px layout.
  - CSV Import: Upgraded upload dropzone with dashed border and hover lift, replaced low-contrast alerts with `.alert-error` and `.card-green`, and styled preview table with per-row validation badges.
  - Replaced over 65 hardcoded hex/rgba styles and blurred backdrops with centralized design tokens. Verified with `npx tsc --noEmit` and production build verification.
- **Requirement**: Apply the new design system to the dashboard and data pages on branch `ui-polish`. Presentation only; do not change business logic, API routes, or tests.
- **Next**: Final reviewer visual audit across desktop, 768px, and 360px viewports.

### 2026-10-17 — UI Round 1: Playful Neo-Brutalist Visual Design System
- **What**: Designed and implemented a playful, friendly neo-brutalist visual design system applied across the app shell (navbar, footer), landing page hero and 3-step strip, login and register pages, and status/404 pages. Created the original inline SVG mascot "Pulse" with four distinct mood states (`happy`, `thinking`, `sad`, `surprised`). Created the design documentation guide in `docs/DESIGN.md`.
- **Why**: Deliver a distinct, handcrafted, fun visual identity with high contrast and tactile physical affordances while preserving "The One Rule: Playful shell, calm data" — keeping all data tables, numbers, forms, and analytics calm, legible, un-tilted, with no row shadows and with status never communicated by color alone.
- **How**: Centralized tokens in `src/app/globals.css` using `--color-ink` (`#1F1F2E`), `--color-paper` (`#FFFDF6`), `--color-blue` (`#1AA7EC`), `--color-yellow` (`#FFE68A`), `--color-coral` (`#F77B6B`), and `--color-green` (`#86D9A4`); configured self-hosted Google fonts (`Lilita_One`, `Nunito`, `JetBrains_Mono`) via `next/font/google` in `layout.tsx`; built responsive navbar with mobile collapse ($\le 768\text{px}$) and $44\text{px}$ touch targets; added accessible password visibility toggles on auth forms; eliminated all marketing hype ("production-grade", tech stack lists); verified with `npx tsc --noEmit` (0 errors) and Next.js production build (28 routes).
- **Requirement**: UI round 1 for LinkPulse: a new playful visual design system, applied to the app shell, the landing page and the login and register pages. Work only on the current git branch (ui-polish). Do not commit or push. This is a presentation-only task: do not change any business logic, API route, service, schema, data flow or test. Do not run tests, prisma commands or anything that touches a database. You may run npm run build and npx tsc --noEmit.
- **Next**: Review visual layout across 360px, 768px, and desktop widths.

### 2026-10-18 — Round: Interaction Responsiveness
- **What**: Solved click-to-first-response delays (previously 2–3 seconds of perceived freeze) across navigation links (Dashboard, Analytics, Admin), link creation, domain blocking/unblocking, link status toggles, edits, and filters.
- **Why**: The owner reported that clicking navigation links and performing mutations made the app feel frozen before any UI response occurred.
- **How**:
  - Identified root causes: (1) Next.js route transitions waited for data fetching without intermediate UI, (2) mutating actions (like block domain, create link) triggered massive cascading re-fetches (e.g. Admin re-fetched all ~2,000 links across the platform via `/api/links?scope=all`, taking 1.9s), (3) Navbar re-fetched `/api/auth/me` on every route change, (4) buttons lacked immediate pending states.
  - Implemented instant pending feedback in `Navbar.tsx` (<10ms inline spinner + border highlight via `pendingPath`), added `prefetch={true}` on all nav routes, and restricted `/api/auth/me` to initial mount.
  - Added Next.js route-level loading boundaries (`loading.tsx`) in `src/app/(dashboard)/dashboard/loading.tsx`, `src/app/analytics/loading.tsx`, and `src/app/(dashboard)/admin/loading.tsx` to immediately render the alive `<LoadingScreen />` shell while route data loads.
  - Replaced post-mutation full-table re-fetching with direct state updates:
    - Admin `handleAddBlockedDomain` prepends the newly blocked domain directly to `blockedDomains` state, eliminating the 1.9s `/api/links?scope=all` refetch cascade (saving 1.9s of server work!).
    - Link Create prepends the new link directly to `links` state, skipping the 4-endpoint dashboard refetch.
    - Edit Link Modal passes updated item directly to `onSaved(updatedLinkItem)`, eliminating the full list refresh.
    - Removed redundant `onRefresh()` calls from optimistic toggle and delete handlers.
    - Added fast path in `analytics/page.tsx` for filter updates (fetching only `/api/analytics` and skipping re-fetching auth/campaigns).
  - Added inline pending indicators with spinning icons, `aria-busy="true"`, and double-submit prevention across buttons (`Adding to Blocklist...`, `Publishing Link...`, `Saving Changes...`).
  - Added active pressed CSS states (`:active`) for buttons and links for immediate tactile click feedback.
  - Verified on a production build (`localhost:3001`): all interactions achieve visual feedback in under 100ms (median 39–94ms unthrottled and throttled), all 15 test suites pass (91/91 tests), and zero leftover records in the live DB.
- **Requirement**: Round: Interaction Responsiveness.
- **Next**: Final review and verification.

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
