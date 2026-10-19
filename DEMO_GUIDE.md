# LinkPulse 2-Minute Judge & Audience Demo Guide

This script provides an exact, second-by-second walkthrough to showcase LinkPulse's speed, neo-brutalist tactile aesthetic, privacy-first telemetry, and multi-tier guardrails in under 2 minutes.

---

## 🛠️ Pre-Demo Checklist (T-minus 5 minutes)

1. **Production Server Running**:
   ```bash
   npm run build
   npx next start
   ```
   *Verify `http://localhost:3000` responds with the landing page.*
2. **Database Seed State**:
   - Confirm demo accounts are seeded with rich telemetry (200+ clicks across 12 days, diverse devices/referrers).
   - Have two browser windows or profiles open:
     - **Profile A (User Demo)**: Pre-authenticated or ready to log in with `<demo-user-email>`.
     - **Profile B (Admin Demo)**: Ready in an incognito window with `<demo-admin-email>`.
3. **Prepared Short Codes to Test**:
   - `http://localhost:3000/docs` (Active, fast redirect)
   - `http://localhost:3000/roadmap` (Passcode protected challenge)
   - `http://localhost:3000/vip-pass` (Click limit reached guardrail)
   - `http://localhost:3000/flash-sale` (Expired link guardrail)
4. **Backup Plan if DB / Remote Connection is Slow**:
   - Keep a local SQLite or mock tab open, or pre-load `/dashboard` and `/analytics` tabs so anti-flash 320ms skeletons are already cached in DOM memory.

---

## ⏱️ 2-Minute Click-by-Click Demo Script

### Act 1: The Pitch & Tactile Creation (0:00 – 0:30)
- **Where**: Open `/` (Landing Page) $\rightarrow$ Navigate to `/dashboard` (logged in as `<demo-user-email>`).
- **What to Click**:
  1. Scroll slightly on `/` to highlight the neo-brutalist tactile design ("playful shell, calm data") and dynamic preview card.
  2. Click **"Go to Dashboard"** (or open `/dashboard`).
  3. In the **Create Short Link** form:
     - Paste a destination: `https://github.com/Coder-Priyan/LinkPulse`
     - Custom Alias: `live-demo`
     - Click **"Create Short Link"**.
- **What to Say**:
  > *"Most link shorteners are either bloated enterprise tools or generic corporate utilities. LinkPulse gives power users lightning-fast link management with personality. Notice the instant optimistic creation—no full-page reloads."*
- **Action**:
  - Click the **Copy** button on the newly created card.
  - Point out the **tactile green Toast notification**: *"Copied short link to clipboard!"*.
  - Show that it handled the clipboard safely and gave instant feedback.

---

### Act 2: Guardrails & Redirect Intelligence (0:30 – 1:00)
- **Where**: New browser tab $\rightarrow$ navigate to guardrail links.
- **What to Click**:
  1. Open a new tab and navigate to `http://localhost:3000/roadmap`.
  2. Point out the **Passcode Protected Link** modal challenge.
  3. Enter `<demo-link-passcode>` and click **Access Destination** $\rightarrow$ instant redirect.
  4. In another tab, navigate to `http://localhost:3000/vip-pass`.
  5. Show the **"Click Limit Reached"** guardrail page with the surprised mascot.
- **What to Say**:
  > *"LinkPulse treats links as living routers, not dumb redirects. Creators can enforce passcodes, strict expiration dates, or hard click limits. When a limit or expiration triggers, visitors receive a friendly, brand-consistent status page instead of a broken 404 or white screen."*

---

### Act 3: QR Codes & Tactile Modals (1:00 – 1:20)
- **Where**: Return to `/dashboard`.
- **What to Click**:
  1. Find `/docs` in the links table and click the **QR Code** action button.
  2. In the modal:
     - Highlight the instant SVG rendering and target URL copy button.
     - Show the **"Download PNG"** and **"Download SVG"** action buttons.
  3. Press **Esc** or click Cancel to close the modal (smooth focus restoration).
- **What to Say**:
  > *"Every link automatically generates high-resolution, vector-crisp QR codes with built-in telemetry attribution. Notice the accessible keyboard focus trap and smooth Esc dismissal."*

---

### Act 4: Real-Time Telemetry & Analytics (1:20 – 1:40)
- **Where**: Click **Analytics** in the top navigation bar (`/analytics`).
- **What to Show**:
  1. Point out the summary stat cards: **Total Clicks**, **Unique Visitors**, **QR Scans**.
  2. Scroll down to show:
     - Clicks over time bar chart (14-day history).
     - Breakdown grids: Top Referrers (Twitter, LinkedIn, GitHub), Device breakdown (Desktop vs Mobile), and Operating Systems.
- **What to Say**:
  > *"Telemetry in LinkPulse is privacy-first. We compute unique visitors using salted, privacy-preserving cryptographic hashes with zero cookies and no intrusive fingerprinting. You get actionable insight on traffic sources, device splits, and scan channels in real time."*

---

### Act 5: Governance, Blocklist & CSV Import (1:40 – 2:00)
- **Where**: Switch to Admin window (`/admin`) $\rightarrow$ Click **Import** (`/import`).
- **What to Click**:
  1. On `/admin`:
     - Show the **Domain Blocklist** section with `malicious-phishing.test`.
     - Click **Unblock** on a test domain $\rightarrow$ show the accessible neo-brutalist **ConfirmDialog** ("Unblock Domain") $\rightarrow$ Click **Cancel** (proves safe confirmation pattern).
  2. Click **Import** in the nav bar (`/import`):
     - Show the CSV bulk importer with schema preview, paste box, and batch validation.
- **What to Say**:
  > *"For platform security, administrators have global governance tools. Any domain flagged for phishing or malware is blocked instantly via sub-5ms in-memory cache invalidation, automatically deactivating malicious links. And power users migrating from Bitly can bulk-import thousands of links via CSV. That's LinkPulse: playful shell, calm data, bulletproof guardrails."*
- **Finish strong**: Open `/` and thank the judges!

---

## 📋 Quick Reference: Demo Credentials Placeholder Sheet

| Role | Email Placeholder | Password Placeholder | Purpose |
|---|---|---|---|
| **Demo User** | `<demo-user-email>` (e.g. `alex@techcorp.dev`) | `<demo-user-password>` | Main dashboard, link creation, QR modal, analytics |
| **Demo Admin** | `<demo-admin-email>` (e.g. `admin@linkpulse.io`) | `<demo-admin-password>` | Global link directory, domain blocklist governance |
| **Link Passcode** | N/A | `<demo-link-passcode>` | Unlocks `/roadmap` during Act 2 |
