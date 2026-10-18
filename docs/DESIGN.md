# LinkPulse Design System Guide

A playful, friendly neo-brutalist visual design system built around one core philosophy: **Playful shell, calm data**.

---

## 1. Design Tokens

All design tokens are centralized as CSS custom properties in [globals.css](file:///f:/Hackathon/LinkPulse/src/app/globals.css).

### Color Palette

| Token | Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-ink` | `#14272B` | Deep ink outlines, text, and hard offset shadows |
| `--color-paper` | `#FBF7EF` | Warm cream page background |
| `--color-white` | `#FFFFFF` | Card surfaces and input backgrounds |
| `--color-blue` | `#0F5C5C` | Main deep teal (primary CTA buttons, brand badges) |
| `--color-blue-light` | `#D9EDE6` | Soft sage/teal tint for active chips and accents |
| `--color-yellow` | `#F4C95D` | Butter yellow accent, hover states, and active tabs |
| `--color-yellow-light` | `#FBF0CF` | Soft butter highlight background |
| `--color-coral` | `#E8806A` | Warm coral danger actions, expired states, error alerts |
| `--color-coral-light` | `#FAE3DC` | Soft coral background for error callouts |
| `--color-green` | `#A5D6A0` | Calmer sage green active status badges and success states |
| `--color-green-light` | `#E6F2E1` | Soft sage green background for success callouts |
| `--color-muted` | `#4F6266` | High-contrast secondary text ($\ge 4.5:1$ contrast ratio) |
| `--color-ink-muted` | `#46585C` | Secondary text label tokens |
| `--color-ink-faint` | `#D8D3C5` | Subtle dividers and decorative borders (never text) |
| `--color-text-blue` | `#0F5C5C` | Text-safe deep teal for links |
| `--color-text-danger` | `#B3261E` | Text-safe dark red for error text |
| `--on-primary` | `#FFFFFF` | High-contrast text & icons on deep teal surfaces |

> **Strict rule**: No gradients, no glows, no glassmorphism, no blurred shadows, no dark "hacker" theme.

### Borders & Outlines
- **Cards & Buttons**: `2.5px solid #14272B` (`--border-thick`)
- **Data Tables & Code Badges**: `1.5px solid #14272B` (`--border-thin`)
- **Border Radius**:
  - Small elements / badges: `8px` (`--radius-sm`)
  - Inputs & cards: `12px` (`--radius-md`) to `16px` (`--radius-lg`)
  - Pills / User chips: `9999px` (`--radius-full`)

### Hard Offset Shadows (No Blur)
- **Standard Cards & Buttons**: `4px 4px 0 #14272B` (`--shadow-hard`)
- **Small Elements & Badges**: `2px 2px 0 #14272B` (`--shadow-hard-sm`)
- **Hover Lift State**: `6px 6px 0 #14272B` (`--shadow-hard-lg`) with `-2px, -2px` translation
- **Active / Pressed State**: `1px 1px 0 #14272B` (`--shadow-pressed`) with `+2px, +2px` translation
- **Data Tables**: Zero shadows on rows (`box-shadow: none !important`)

### Typography
Fonts are self-hosted via `next/font/google` in [layout.tsx](file:///f:/Hackathon/LinkPulse/src/app/layout.tsx) without external `<link>` tags:
- **Headings & Logo**: `Lilita One` (`--font-display-family`) — bold, expressive display font.
- **Body & UI**: `Nunito` (`--font-sans-family`) — clean, rounded, legible sans-serif.
- **Short Codes & URLs**: `JetBrains Mono` (`--font-mono-family`) — crisp monospace for `/xyz123` codes.

### Motion & Accessibility
- **Micro-interactions**: Instant 120ms transitions for hover lifts and button presses.
- **Reduced Motion**: Full `@media (prefers-reduced-motion: reduce)` override disabling all transforms and transitions for users requesting minimal movement.
- **Touch Targets**: Minimum `44px` on interactive elements, buttons, inputs, and toggles.
- **Focus Rings**: Universally applied `:focus-visible` ring (`3px solid var(--color-text-blue)` with `2px` offset).

---

## 2. The One Rule: Playful Shell, Calm Data

> **Playful shell, calm data.**  
> Everything *around* the data can be playful. Tables, charts, forms, numbers, and codes must stay calm and very readable.

- **Data Tables**: Clean 1.5px solid borders, neutral row backgrounds, horizontal alignment, 14px or larger text, and zero tilt or rotation.
- **Codes & URLs**: Displayed in `JetBrains Mono` inside bordered pills.
- **Status Communication**: Never communicate status through color alone. Every badge pairs a clear text label with an icon or colored pill (e.g. `Active`, `Expired`, `Blocked`, `Limit Reached`).
- **Contrast**: Text contrast meets or exceeds WCAG AA standard ($\ge 4.5:1$).

---

## 3. Shared Components

| Component | Class Name(s) | Key Styling |
| :--- | :--- | :--- |
| **Primary Button** | `.btn.btn-primary` | Deep teal background (`#0F5C5C`), white text and icons (`--on-primary`), thick border, 4px shadow, hover lift |
| **Secondary Button** | `.btn.btn-secondary` | White background, butter yellow hover, thick border, 4px shadow |
| **Danger Button** | `.btn.btn-danger` | Coral background (`#E8806A`), thick border |
| **Ghost Button** | `.btn.btn-ghost` | Transparent background, bordered on hover |
| **Table Action Button** | `.table-action-btn` | Compact 34px square icon button for dense table actions (`QR`, `Edit`, `Power`, `Delete`) with native title tooltips and accessible aria labels |
| **Disabled Button** | `.btn:disabled` | High-contrast muted sage fill (`#DDE8E4`), deep slate ink text (`#1E3438`, 7.2:1 contrast ratio), 2px solid border, zero opacity wash-out |
| **Form Inputs** | `.form-input`, `.form-select`, `.form-textarea` | White fill, 2.5px border, 2px shadow, deep teal focus ring, 48px height |
| **Password Toggle** | `.input-password-wrapper`, `.btn-toggle-password` | Inset accessible toggle button for password visibility |
| **Card** | `.card` | White card, 2.5px solid ink border, 16px radius, 4px hard shadow |
| **Sticker Badges** | `.badge.badge-active`, `.badge-expired`, etc. | Pill shape, 2px border, uppercase bold text, 2px hard shadow |
| **Calm Table** | `.table-wrapper`, `.data-table` | Bordered wrapper, warm header row, thin dividers, no row shadows |
| **Modal** | `.modal-backdrop`, `.modal` | Solid darkened backdrop (no blur), bordered dialog box with 6px shadow |
| **Toast** | `.toast`, `.toast-success`, `.toast-error` | Fixed bottom-right notification card with thick border and 4px shadow |
| **Tooltip** | `.tooltip-trigger`, `.tooltip` | Ink tooltip with yellow border, appearing on hover and focus |
| **Tabs & Stepper** | `.tabs`, `.tab`, `.stepper`, `.step-circle` | Step indicators and tab controls with 44px touch targets |
| **Alert Box** | `.alert`, `.alert-error`, `.alert-success` | High-contrast status banner with icon and thick border |
| **Empty State** | `.empty-state` | Centered message box with mascot illustration and primary action |

---

## 4. Mascot Guidelines: "Pulse"

- **Component**: [PulseMascot.tsx](file:///f:/Hackathon/LinkPulse/src/components/PulseMascot.tsx) (lightweight inline SVG).
- **Design**: A friendly geometric rounded robot-creature featuring deep teal body (`#0F5C5C`), antenna pulse orb in coral (`#E8806A`), butter ear sensors (`#F4C95D`), and a soft sage belly screen (`#D9EDE6`) showing a real-time heartbeat line.
- **Moods**:
  1. `happy`: Upward smile, sage green heartbeat line, rosy cheeks. Used on landing page hero.
  2. `thinking`: Inquisitive brow, butter wave line. Used on inactive / pending link status.
  3. `sad`: Drooping brows, tear drop, red flatline. Used on 404 page and expired/blocked status.
  4. `surprised`: Wide eyes and round mouth, teal spike. Used when visit limits are reached.
- **Placement Restrictions**: Use **only** on the landing page hero, empty states, status pages (`/link-status`), and the 404 page (`/not-found`). **Never** display the mascot on data-heavy tables or dashboards.

---

## 5. Copy Tone

- **Plain and Direct**: Clear, human, informative language.
- **No Buzzwords**: Do not use marketing buzzwords like "production-grade", "hyper-scale", or "AI-powered".
- **No Invented Numbers**: Avoid fabricated claim numbers or fake statistics.
- **Tagline**: `"LinkPulse: short links, clear numbers."`

---

## 6. Dashboard & Data Component Patterns

Round 2 applies the design system to data surfaces while upholding **The One Rule**:

### Stat Cards
- Container `.stat-card` with white surface, 2.5px solid ink border, and 4px offset shadow.
- Title in uppercase bold sans (`--color-ink-muted`) with paired outline icon.
- Metric values in `Lilita One` (`--font-display-family`, $\ge 2.2\text{rem}$), ensuring numbers stand out clearly without decoration.

### Two-Step Create Link Wizard
- Stepper: Horizontal 2-step pill indicators (`.stepper`, `.step-circle`) showing active/completed states with high-contrast text and numbers.
- Step 1: Destination URL and custom alias fields with 48px height, clear help text, and validation feedback.
- Step 2: Operational rules drawer (passcode, expiry date, click limit) and organization tags (`.tag-pill`). Includes an explicit Rule Summary review box.
- Success State: High-contrast success card (`.alert.alert-success`) with short URL in `font-mono`, "Visit" action, and an accessible "Copy URL" button providing instant 2-second visual feedback (`Copied!` with checkmark).

### Links Table & State Badges
- Responsive container (`.table-wrapper`) enabling horizontal scrolling on narrow screens ($\le 768\text{px}$) without causing viewport overflow.
- Table headers in bold sans with subtle warm paper background; calm rows with thin dividers and zero shadows.
- Short links formatted inside `.code-badge` with one-click copy feedback.
- Status is **never communicated by color alone**:
  - `Active`: Green pill + `CheckCircle2` icon + "Active" label
  - `Disabled`: Inactive pill + `Power` icon + "Disabled" label
  - `Expired`: Coral pill + `Clock` icon + "Expired" label
  - `Limit Reached`: Coral pill + `Gauge` icon + "Limit Reached" label
  - `Blocked`: Coral pill + `ShieldAlert` icon + "Blocked" label

### Modals (Edit Link & QR Code)
- Backdrop: Solid semi-opaque ink backdrop (`.modal-backdrop`, `rgba(20, 39, 43, 0.6)`) without blurred filters.
- Modal Box: White card with 2.5px solid ink border, 6px hard offset shadow, and 16px border radius.
- Controls: Prominent 44px close button (`.modal-close`) in top-right, visible focus trapping, and responsive sizing down to 360px viewport width.
- QR Code: High-contrast preview framed with a solid 2px border and download actions for both PNG and SVG formats.

### CSV Bulk Import
- Upload Dropzone: Dashed 2.5px ink border (`.upload-dropzone`), tactile hover lift, keyboard accessible (`role="button"`, `tabIndex={0}`), and clear file format requirements.
- Preview Table: Calm line-by-line inspection table with line numbers, code badges, and explicit validation pills (`Valid` / `Invalid` with error descriptions in high-contrast text).
- Summary Banner: High-contrast result card showing created vs. skipped counts with plain-English itemized reasons.

### Shared States
- Loading: Card container with spinning outline icon and plain text (`Validating rows...`, `Loading links...`).
- Empty State: Centered card displaying the mascot "Pulse" in `thinking` mood, friendly explanation, and primary action button. Never shown on data-heavy views.
- Error / Success: High-contrast alert boxes (`.alert.alert-error`, `.alert.alert-success`) with dark ink text on soft pastel backgrounds ($\ge 4.5:1$ contrast).

---

## 7. Analytics & Admin Patterns

### Analytics Telemetry & Accessible Charts
- **Period Tabs**: Clear `.tabs` component with 44px min touch targets for `7d`, `30d`, and `all`.
- **Clicks Over Time Chart**:
  - Pure flat colors from token palette (`--color-blue` `#0F5C5C`, `--color-paper` `#FBF7EF`); strictly zero gradients, zero glow, and zero drop-shadows on bars.
  - Value labels displayed directly above each bar so numbers are readable without mouse hovering.
  - Horizontal axis labels sized at 12px or larger in body sans, unrotated for maximum legibility.
  - Screen reader alternative: Includes an `aria-label` summary and a visually hidden `.sr-only` data table detailing every timestamp and click count.
  - Color-blind safety: Bar height and direct numeric text communicate values without reliance on color hues.
  - Ink Outline: Every bar features an explicit `1.5px solid var(--color-ink)` outline ensuring $\ge 3:1$ contrast against card backgrounds.
- **Breakdown Bars**: Flat solid fills (`--color-blue`, `--color-yellow`, `--color-coral`, `--color-green`) bordered with thin ink strokes inside bordered tracks.
- **Operational Alerts**: Every alert item pairs an icon with a word (`Expired`, `Disabled`, `Limit Reached`, `Near Limit`, `Expiring Soon`).

### Admin Console & Security Governance
- **Admin Distinguishability**: Explicit `.badge.badge-admin` label in heading and user chips.
- **Creator Email Column**: Handled with `wordBreak: break-all`, max-width `220px`, full hover tooltip, and dedicated screen reader label (`<span className="sr-only">Creator email: ...</span>`) so addresses are never invisibly truncated.
- **Domain Blocklist**: Add form with inline validation alerts (`.alert-error`, `.alert-success`) and calm directory table with domain badges, subdomain rules, and accessible unblock action buttons.

---

## 8. Accessibility & Keyboard Navigation

- **Focus Ring**: Universal high-contrast focus state applied to all interactive controls (`outline: 3px solid var(--color-text-blue)` with `2px` offset ring).
- **Modal Focus Trapping & Escape Key**:
  - Opening a modal traps keyboard focus strictly within the dialog (`Tab` and `Shift+Tab` cycle between first and last focusable elements).
  - Pressing `Esc` immediately dismisses the modal and returns focus to the trigger.
  - Modal overlay is a solid semi-opaque color (`rgba(20, 39, 43, 0.6)`) without blurred filters.
- **Screen Reader Utilities**: Centralized `.sr-only` utility for visually hidden table and label data.
- **Touch Targets**: Minimum `44px` on interactive elements, buttons, inputs, tabs, and toggles.
- **Page Titles**: Short, descriptive titles on every page without marketing phrases (e.g. `Dashboard | LinkPulse`, `Analytics | LinkPulse`, `Admin Console | LinkPulse`, `Link Status | LinkPulse`).
- **Brand Favicon**: Original neo-brutalist SVG favicon at `src/app/icon.svg` featuring an ink-bordered deep teal tile and butter yellow pulse dot.
- **Prefers Reduced Motion**: Complete override disabling all CSS animations and transitions when requested by user OS preferences.

---

## 9. Desktop Architecture & Visual Hierarchy (Round 6 Major Polish)

Desktop viewports ($\ge 1024\text{px}$) balance three complementary attributes: **Professional credibility**, **Mature restraint**, and **Playful character**.

### Where Personality Lives
- **Hero Companion Deck**: Mascot "Pulse" is integrated with a speech bubble badge (`"Fast redirects. Clear click telemetry."`) directly above the landing title.
- **Live Simulator Card**: Interactive desktop product showcase card on the landing page labeled explicitly as `Interactive Demo (Sample Data)`, displaying realistic short codes, copy affordance, active status, and telemetry pill counters (`1,482 visits`, `1,120 uniques`, `362 QR scans`, `1,120 direct clicks`).
- **Split Authentication Layout**: Desktop login and register pages pair a characterful brand panel (`.auth-brand-panel`) on the left with the calm, focused sign-in form on the right.
- **Top Link Rank Medals**: Top performing links in analytics feature distinct rank medals (`#1` butter, `#2` sage/teal tint, `#3` coral tint) for instant spatial hierarchy.

### Where Calm & Precision Rule
- **Semantic Stat Card Top Bars**: Desktop stat cards feature crisp 4px semantic accent top borders (`.stat-card-teal`, `.stat-card-butter`, `.stat-card-sage`, `.stat-card-coral`), paired with hover lifts and large readable display numbers.
- **Telemetry Chart Deck**: The Clicks Over Time chart features direct numeric labels above bars, a peak traffic indicator badge, and subtle dashed horizontal guidelines.
- **Live Alias Preview**: The link creation wizard displays an instant monospace short URL preview chip using the dynamically resolved app base URL as the user types.
- **Admin Security Console**: Clean tabular directory with full break-all email wrapping, wildcard subdomain indicators, and explicit delete confirmations.

---

## 10. Desktop Redesign Round 2: Productivity, Inspection & Onboarding

Desktop viewports ($\ge 1024\text{px}$) in Round 2 receive major functional UX enhancements that make LinkPulse a power tool while maintaining full neo-brutalist charm:

### 1. Instant Desktop Search & Keyboard Navigation (`/` or `Ctrl+K`)
- **Global Desktop Listener**: Users can press `/` or `Ctrl+K` / `Cmd+K` anywhere on desktop to immediately focus the link filter input without touching the mouse.
- **Escape Affordance**: Pressing `Escape` while focused clears the filter query and returns focus to the table.
- **Client-Side Responsiveness**: Filters links across code, title, destination URL, campaign, and tags instantly, with a real-time count badge (`Showing X of Y links`) and one-click reset button.

### 2. Interactive Row Inspector Drawer (`.table-inspector-deck`)
- **Spatial Expansion**: Each link row features an accessible `ChevronDown`/`ChevronUp` toggle.
- **Attribution Ratio Bar**: Visual segmented horizontal progress bar (`.breakdown-bar-track`) comparing direct web clicks against physical QR scans in high-contrast deep teal and butter yellow.
- **Rule Guardrails Card**: Displays exact expiration timestamps with human countdowns, click limit utilization meters ($N$ of $M$ used), and passcode enforcement indicators.
- **Target URL Affordance**: Displays the complete destination target in a high-contrast card with one-click copy and visit actions.

### 3. First-Time Onboarding Experience
- **Empty State Transformation**: When zero links exist, the empty state displays an interactive 3-step Quick-Start Guide featuring mascot "Pulse" in a welcoming posture (`mood="happy"`).
- **Milestone Steps**:
  1. *Paste & Shorten*: Directs users to the two-step shortener wizard.
  2. *Grab QR Code*: Explains tactile vector QR code export and physical scan attribution.
  3. *Inspect Telemetry*: Explains privacy-safe click telemetry, unique visitor tracking, and referrers.
- **Desktop Pro-Tip Banner**: When links exist, displays a non-intrusive tip bar highlighting the `Ctrl+K` and `/` shortcuts.

### 4. Tactile Notification System & Inline Feedback
- **Floating Toast**: Neo-brutalist toast alert (`.toast-notification`) appears in the bottom-right viewport on copy actions (`Copied short link to clipboard: ...`), self-dismissing after 2.4 seconds.
- **Accessible Screen Reader Announcement**: Dedicated `<div className="sr-only" aria-live="polite">` broadcasts status updates to screen readers.
- **Immediate Redirect Testing**: Short link generation alert provides a direct "Visit" button alongside "Copy URL" so users can test newly created redirects immediately.

### 5. CSV Bulk Import Drag & Drop
- **Dragover Feedback**: Active `.upload-dropzone.dragover` state highlights the dropzone with a butter yellow tint and raised shadow when files are dragged over.
- **One-Click Sample Loader**: "Load Sample CSV" button allows instant testing of the 200-row validator without requiring file downloads.

---

## 11. Desktop Redesign Round 3 & Fine-Tuning Enhancements

### 1. Neo-Brutalist Desktop Footer (`.footer-neo`)
- Persistent desktop footer containing verified package version (`v0.1.0`), brand deck, quick navigation links, and real tech stack attribution (`Next.js App Router • TypeScript • Prisma & PostgreSQL`).
- Avoids unverified or simulated telemetry status indicators.

### 2. Accessible Switch Toggle in Modals
- `EditLinkModal` incorporates an accessible switch toggle with `role="switch"`, `aria-checked`, `aria-labelledby`, and Space/Enter keyboard support.
- Replaces generic checkboxes and multi-button clusters with an unmistakable single-control switch.

### 3. High-DPI Vector QR Downloads & Clean Copy
- `QrModal` provides distinct actions for print-ready Vector SVG and web-ready High-Res PNG downloads (both encoding `?src=qr` on the server).
- In-modal copy button copies the plain canonical short link without query parameter noise.

### 4. Keyboard Shortcut Focus Protection
- `/` and `Ctrl+K` shortcuts are intelligently suppressed while focus resides within any `input`, `textarea`, `select`, `contenteditable`, or open dialog modal.
- `Ctrl+K` consistently executes `preventDefault()` to prevent default browser address bar capture.

### 5. Password Strength Feedback (`/register`)
- Real-time 4-segment neo-brutalist strength meter on the registration form providing instant visual clarity (Too short, Fair, Good, Strong) and character counter.

---

## 12. Major Improvement Pass: Wizard Title Integration & Batch Taxonomies

### 1. Step-1 Title Input in Creation Stepper
- In `LinkCreateForm`, Step 1 incorporates an explicit Title field with character limit indicator (`0 / 255`), trimming rules, and clean neo-brutalist styling matching the URL input.
- Displays an instant monospace short URL preview chip directly beneath alias entry.

### 2. Multi-Tenant Batch Taxonomies in Bulk Import
- The Bulk Import interface (`/import`) integrates optional Campaign and Tag selectors matching individual link creation options, styling selection chips with `--border-thick` and tactile selection states.
- Rejection of foreign or inaccessible IDs displays an informative error callout (`404 NOT_FOUND`) preserving user file preview.

---

## 13. UI Round 3: Analytics, Admin & Universal Accessibility Standards

### 1. Analytics Architecture
- **Period Selector**: Clean neo-brutalist tabs (`7d`, `30d`, `all`) with thick ink border, butter yellow active indicator, and full keyboard tab navigation.
- **Clicks Over Time Visualizer**: Flat palette colors (`--color-blue` and `--color-paper`), thin 2px axes, direct numeric values rendered above each bar without requiring hover, and readable date labels ($\ge 12\text{px}$). Includes a hidden `.sr-only` data table for screen reader parity.
- **Color-Blind Accessibility**: Breakdowns (devices, browsers, referrers, and visit sources) provide direct text names, exact counts, percentages, and category icons so comprehension never relies on color hue alone. Progress tracks use accessible `role="progressbar"` attributes.
- **Alerts**: Each operational alert strictly pairs a word with an icon:
  - `EXPIRED`: Clock icon + "Expired" (`.badge-expired`)
  - `DISABLED`: Power icon + "Disabled" (`.badge-disabled`)
  - `LIMIT_REACHED`: Gauge icon + "Limit Reached" (`.badge-limit-reached`)
  - `NEAR_LIMIT`: AlertTriangle icon + "Near Limit" (`.badge-near-limit`)
  - `EXPIRING_SOON`: Clock icon + "Expiring Soon" (`.badge-expiring-soon`)
- **Mascot Presence**: Mascot "Pulse" appears strictly in the empty state (`mood="thinking"`) when no data exists, never cluttering active metric views.

### 2. Admin Console Architecture
- **Admin Sticker**: Visually distinguishes admin surfaces with a `.badge-admin` pill in the page header.
- **Global Link Directory**: Full-width data table at 1440px max container width. Creator email is truncated cleanly with title tooltip and full screen reader label, preventing row clipping. Status badges display full words and icons. Action buttons are compact 34px icon buttons with accessible names. Zero horizontal scroll at $\ge 1280\text{px}$.
- **Domain Blocklist Area**: Add form with inline validation hints, `aria-describedby`, `aria-invalid`, and high-contrast error alerts. Readable table displaying domain, subdomain wildcard rule, reason, creator, date, and unblock button with explicit browser confirmation.

### 3. Status Page Security Architecture
- **Zero URL Parameter Injection**: The status page (`/link-status`) completely ignores URL `reason` query parameters, eliminating arbitrary text injection.
- **Fixed Friendly Copy**: Renders fixed, friendly, pre-vetted messages mapped strictly to canonical status codes:
  - `DISABLED` / `INACTIVE`: "Link Currently Disabled" ("This short link has been temporarily disabled by its owner or an administrator.")
  - `EXPIRED`: "Link Has Expired" ("This shortened link was configured with an expiration date and is no longer active.")
  - `LIMIT_REACHED`: "Click Limit Reached" ("This short link has reached its maximum visit limit set by its creator.")
  - `BLOCKED`: "Destination Domain Blocked" ("The destination domain for this link has been blocked by administrators for safety and policy compliance.")
  - `NOT_FOUND`: "Link Not Found" ("We could not find an active link matching this short code.")
  - `PASSWORD`: "Passcode Protected" ("This short link is protected with a passcode before redirecting.")

### 4. Universal Accessibility Standards
- **Focus Rings**: Universal `:focus-visible` outline (`3px solid var(--color-blue); outline-offset: 2px`) on all interactive controls.
- **Reduced Motion**: Universal `@media (prefers-reduced-motion: reduce)` override disabling all animations, transitions, and transforms across the entire app.
- **Modal Accessibility**: All modals (`EditLinkModal`, `QrModal`) enforce `role="dialog"`, `aria-modal="true"`, focus trapping with Tab, `Escape` key close handlers, and automatic focus restoration.
- **High-Contrast Disabled Controls**: Disabled primary buttons utilize `--color-disabled-primary-bg` (`#DDE8E4`) and `--color-disabled-primary-text` (`#1E3438`), delivering a 7.2:1 contrast ratio that exceeds WCAG AA.




