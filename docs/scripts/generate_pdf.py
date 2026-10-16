"""
Generate self-contained HTML for LinkPulse Round 1 Presentation and compile to PDF via Edge headless.
"""

import os
import base64
import subprocess

IMG_DIR = r"C:\Users\hp\.gemini\antigravity-ide\brain\aeb5f0e2-5c19-449f-b7fe-6bd5d39f5b7f\scratch\extracted_images"

def get_base64_img(filename):
    path = os.path.join(IMG_DIR, filename)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    return ""

img_mascot_wave = get_base64_img("Im25.png")
img_visitor_orange = get_base64_img("Im56.png")
img_visitor_green = get_base64_img("Im58.png")
img_mascot_pulse = get_base64_img("Im134.png")
img_mascot_wrench = get_base64_img("Im421.png")
img_mascot_shield = get_base64_img("Im215.png")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>LinkPulse - Round 1 Ideation Presentation</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');

  @page {{
    size: 1920px 1080px;
    margin: 0;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: #0f172a;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  .slide {{
    width: 1920px;
    height: 1080px;
    position: relative;
    background: #ffffff;
    page-break-after: always;
    overflow: hidden;
    padding: 70px 100px;
  }}

  .badge-header {{
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    border: 3px solid #0f172a;
    border-radius: 40px;
    padding: 12px 34px;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
    box-shadow: 4px 4px 0px #0f172a;
    margin-bottom: 35px;
  }}

  .badge-subtitle {{
    display: inline-block;
    margin-left: 25px;
    font-size: 24px;
    font-weight: 700;
    color: #475569;
    vertical-align: middle;
  }}

  .card {{
    background: #f8fafc;
    border: 3px solid #0f172a;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 5px 5px 0px #0f172a;
  }}

  .card-yellow {{
    background: #fef08a;
  }}

  .card-cyan {{
    background: #e0f2fe;
    border-color: #0284c7;
  }}

  .card-white {{
    background: #ffffff;
  }}

  .callout-bottom {{
    position: absolute;
    bottom: 60px;
    left: 100px;
    right: 100px;
    background: #fef08a;
    border: 3px solid #0f172a;
    border-radius: 20px;
    padding: 18px 30px;
    box-shadow: 5px 5px 0px #0f172a;
    font-size: 20px;
    line-height: 1.5;
  }}

  .callout-bottom strong {{
    font-weight: 800;
    color: #0f172a;
  }}

  /* Typography */
  h1.slide-title {{
    font-family: 'Space Grotesk', sans-serif;
    font-size: 80px;
    font-weight: 700;
    color: #0284c7;
    line-height: 1;
    margin-bottom: 12px;
  }}

  h2.slide-subtitle {{
    font-size: 32px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 40px;
  }}

  h3.card-title {{
    font-family: 'Space Grotesk', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 14px;
  }}

  p, li {{
    font-size: 19px;
    line-height: 1.55;
    color: #334155;
  }}

  ul {{
    list-style: none;
  }}

  ul li {{
    position: relative;
    padding-left: 24px;
    margin-bottom: 12px;
  }}

  ul li::before {{
    content: "•";
    position: absolute;
    left: 4px;
    color: #0284c7;
    font-weight: 900;
    font-size: 24px;
    line-height: 1;
  }}

  /* Table styling */
  table.tech-table {{
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 3px solid #0f172a;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 5px 5px 0px #0f172a;
  }}

  table.tech-table th {{
    background: #0284c7;
    color: #ffffff;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 22px;
    font-weight: 700;
    text-align: left;
    padding: 18px 26px;
    border-bottom: 3px solid #0f172a;
  }}

  table.tech-table td {{
    padding: 18px 26px;
    border-bottom: 2px solid #e2e8f0;
    font-size: 19px;
    vertical-align: middle;
  }}

  table.tech-table tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  table.tech-table tr:last-child td {{
    border-bottom: none;
  }}

  /* Badges */
  .pill {{
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.5px;
    border: 2px solid currentColor;
  }}

  .pill-built {{
    background: #dcfce7;
    color: #166534;
  }}

  .pill-planned {{
    background: #e0f2fe;
    color: #0369a1;
  }}
</style>
</head>
<body>

<!-- SLIDE 1: Title -->
<div class="slide">
  <div class="badge-header">INNOVISTA 2026 | ROUND 1: IDEATION</div>
  <div style="margin-top: 10px;">
    <h1 class="slide-title">LINKPULSE</h1>
    <h2 class="slide-subtitle">URL Shortener & Telemetry Platform</h2>
  </div>

  <div class="card card-yellow" style="width: 1050px; padding: 40px; margin-top: 30px;">
    <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #0f172a; text-transform: uppercase;">Team Name</div>
    <div style="font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 700; margin: 4px 0 24px 0;">[TEAM NAME]</div>

    <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #0f172a; text-transform: uppercase; margin-bottom: 12px;">Team Members & Roles</div>
    <ul style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <li><strong>Abhishek Dhapola</strong> — Frontend & User Interface</li>
      <li><strong>Sandeep Singh Mehta</strong> — Database & Data Modeling</li>
      <li><strong>Aditya Mehra</strong> — Testing, QA & Security</li>
      <li><strong>Deepak Kumar Kabi</strong> — Documentation & Presentation</li>
      <li style="grid-column: span 2;"><strong>Priyanshu Dangi</strong> — Team Lead, Backend & System Design</li>
    </ul>
  </div>

  <div style="position: absolute; right: 140px; top: 120px;">
    <div class="card card-white" style="display: inline-block; padding: 12px 28px; border-radius: 30px; font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; margin-left: 100px; margin-bottom: 20px;">
      HELLO! 👋
    </div>
    <br>
    <img src="{img_mascot_wave}" style="height: 640px;" alt="LinkPulse Mascot">
  </div>
</div>

<!-- SLIDE 2: Problem Statement -->
<div class="slide">
  <div>
    <div class="badge-header">PROBLEM STATEMENT</div>
    <div class="badge-subtitle">Why Standard URL Shorteners Break Under Concurrent Traffic</div>
  </div>

  <div style="display: flex; gap: 30px; margin-top: 10px;">
    <!-- Box 1 -->
    <div class="card card-white" style="flex: 1; text-align: center; padding: 30px;">
      <h3 class="card-title">1. ONE CLICK LEFT</h3>
      <div class="pill" style="background: #f1f5f9; color: #475569; margin: 10px 0;">limited campaign link</div>
      <div style="font-family: 'Space Grotesk', sans-serif; font-size: 96px; font-weight: 700; color: #e11d48; margin: 15px 0;">1</div>
      <p style="font-size: 18px; color: #64748b;">Remaining click capacity before link closes</p>
    </div>

    <!-- Box 2 -->
    <div class="card card-white" style="flex: 1.2; text-align: center; padding: 30px;">
      <h3 class="card-title">2. SIMULTANEOUS CLICKS</h3>
      <div style="display: flex; justify-content: center; gap: 30px; margin: 25px 0;">
        <img src="{img_visitor_orange}" style="height: 150px;" alt="Visitor 1">
        <img src="{img_visitor_green}" style="height: 150px;" alt="Visitor 2">
      </div>
      <p style="font-size: 18px; color: #64748b;">Two visitors click at the exact same millisecond</p>
    </div>

    <!-- Box 3 -->
    <div class="card card-white" style="flex: 1; text-align: center; padding: 30px;">
      <h3 class="card-title" style="color: #e11d48;">3. LIMIT BROKEN</h3>
      <div style="font-family: 'Space Grotesk', sans-serif; font-size: 96px; font-weight: 700; color: #e11d48; margin: 15px 0;">2</div>
      <p style="font-size: 18px; color: #e11d48; font-weight: 700;">Visitors allowed through!</p>
      <p style="font-size: 16px; color: #64748b;">Standard counter over-allocates</p>
    </div>

    <!-- Box 4: Right Summary -->
    <div class="card card-yellow" style="flex: 1.6; padding: 30px;">
      <h3 class="card-title" style="font-size: 26px;">THE PROBLEM IN SHORT</h3>
      <ul>
        <li><strong>Basic shorteners only redirect URLs</strong> — they cannot enforce business rules, expiration policies, or dynamic limits.</li>
        <li><strong>Limited campaigns fail under concurrency</strong> — flash sales and VIP passes easily overshoot caps when traffic spikes.</li>
        <li><strong>Synchronous tracking adds latency</strong> — logging clicks in the critical request path slows down redirects.</li>
        <li><strong>Raw click numbers deceive</strong> — basic counters fail to filter out search crawlers, preview scrapers, and bot traffic.</li>
      </ul>
    </div>
  </div>

  <div class="card" style="margin-top: 30px; padding: 22px 30px;">
    <h3 class="card-title" style="color: #0284c7; font-size: 20px; margin-bottom: 6px;">WHY IT HAPPENS & HOW LINKPULSE SOLVES IT</h3>
    <p style="font-size: 18px; color: #1e293b;">
      Standard applications read the click count into memory, evaluate the limit, and save an updated count later. Under concurrent clicks, both requests read the old count and both pass. <strong>LinkPulse solves this with conditional atomic SQL updates</strong> (<code>WHERE clicksCount &lt; clickLimit</code>) in a single database transaction, immediately blocking the extra visitor.
    </p>
  </div>
</div>

<!-- SLIDE 3: Solution Overview -->
<div class="slide">
  <div>
    <div class="badge-header">SOLUTION OVERVIEW</div>
    <div class="badge-subtitle">The Central Link Model & Architectural Decisions</div>
  </div>

  <div style="display: flex; gap: 40px; margin-top: 20px;">
    <!-- Left: Diagram representation -->
    <div style="flex: 1.2; position: relative; height: 600px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div class="card card-white" style="width: 45%; text-align: center;">
          <h3 class="card-title" style="margin-bottom: 4px;">USER (OWNER)</h3>
          <p style="font-size: 16px;">Creates, owns & configures links</p>
        </div>
        <div class="card card-white" style="width: 45%; text-align: center;">
          <h3 class="card-title" style="margin-bottom: 4px;">CAMPAIGNS & TAGS</h3>
          <p style="font-size: 16px;">Organizes & filters link portfolios</p>
        </div>
      </div>

      <!-- Central Link Hub -->
      <div class="card card-cyan" style="width: 75%; margin: 0 auto; padding: 30px; text-align: center;">
        <h3 class="card-title" style="color: #0284c7; font-size: 28px; margin-bottom: 12px;">CENTRAL LINK RECORD</h3>
        <ul style="text-align: left; display: inline-block; font-size: 17px;">
          <li>Short Code (Base62 generated or custom alias)</li>
          <li>Destination URL (Validated RFC scheme & anti-loop)</li>
          <li>Active Status & Reason (Owner/Admin toggle)</li>
          <li>Rules: Expiry timestamp, click limit, passcode hash</li>
          <li>Atomic Click Counter (Concurrency safe)</li>
        </ul>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 30px;">
        <div class="card card-white" style="width: 48%; text-align: center;">
          <h3 class="card-title" style="margin-bottom: 4px;">CLICKEVENT</h3>
          <p style="font-size: 16px;">Logged asynchronously per visit</p>
        </div>
        <div class="card card-yellow" style="width: 48%; text-align: center;">
          <h3 class="card-title" style="margin-bottom: 4px;">LIVE DASHBOARD</h3>
          <p style="font-size: 16px;">Aggregated metrics & health alerts</p>
        </div>
      </div>

      <img src="{img_mascot_pulse}" style="position: absolute; left: -60px; bottom: 30px; height: 260px;" alt="Mascot">
    </div>

    <!-- Right: Core Decisions -->
    <div class="card card-white" style="flex: 1.1; padding: 36px;">
      <h3 class="card-title" style="font-size: 26px; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px;">
        CORE ENGINEERING DECISIONS
      </h3>
      <ul>
        <li>
          <strong>The Central Link Hub:</strong> All rules, tags, campaigns, and telemetry relate directly to the central Link record, keeping queries fast and relations clean.
        </li>
        <li>
          <strong>Predictable Rule Precedence:</strong> Redirect checks evaluate in a single, fixed sequence: <em>Disabled → Expired → Click Limit → Passcode Protection</em>.
        </li>
        <li>
          <strong>Non-Blocking Telemetry:</strong> Redirect responses are returned immediately via HTTP 307; telemetry recording runs in the background using Next.js <code>after()</code>.
        </li>
        <li>
          <strong>Data Retention Integrity:</strong> Disabling a link or deleting a campaign decouples associations but retains full historical click logs for audit and analysis.
        </li>
      </ul>
    </div>
  </div>
</div>

<!-- SLIDE 4: Tech Stack -->
<div class="slide">
  <div>
    <div class="badge-header">TECH STACK</div>
    <div class="badge-subtitle">Selected Technologies & Engineering Rationale</div>
  </div>

  <table class="tech-table" style="margin-top: 20px;">
    <thead>
      <tr>
        <th style="width: 20%;">LAYER</th>
        <th style="width: 35%;">WHAT WE USE</th>
        <th style="width: 45%;">WHY WE CHOSE IT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>App & API</strong></td>
        <td><strong style="color: #0284c7;">Next.js 15 (App Router) + TypeScript</strong></td>
        <td>Unified framework combining server-rendered UI, client interactivity, and API route handlers with end-to-end type safety.</td>
      </tr>
      <tr>
        <td><strong>Data Access</strong></td>
        <td><strong style="color: #0284c7;">Prisma ORM 6</strong></td>
        <td>Declarative schema acts as the single source of truth; generates type-safe database queries and migrations.</td>
      </tr>
      <tr>
        <td><strong>Database</strong></td>
        <td><strong style="color: #0284c7;">PostgreSQL on Supabase</strong></td>
        <td>Robust relational database supporting atomic conditional queries, composite indexing, and complex joins for analytics.</td>
      </tr>
      <tr>
        <td><strong>Authentication</strong></td>
        <td><strong style="color: #0284c7;">Stateless JWT in httpOnly Cookies</strong></td>
        <td>Secure, tamper-proof session tokens stored in cookies inaccessible to client-side JavaScript, preventing XSS token theft.</td>
      </tr>
      <tr>
        <td><strong>Hosting</strong></td>
        <td><strong style="color: #0284c7;">Vercel (Planned Target)</strong></td>
        <td>Native serverless cloud execution and edge routing tailored specifically for Next.js App Router performance.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-bottom">
    <strong>Deliberate Engineering Choices:</strong> HTTP 307 with <code>Cache-Control: no-store</code> instead of 301 (prevents browser caching so every visit reaches our server), atomic conditional SQL updates instead of in-memory counters (eliminates concurrency overshoots), and salted SHA-256 visitor hashing instead of storing raw IP addresses (privacy by design).
  </div>
</div>

<!-- SLIDE 5: Implementation Status -->
<div class="slide">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div class="badge-header">IMPLEMENTATION STATUS</div>
      <div class="badge-subtitle">Verified Progress & Development Roadmap</div>
    </div>
    <img src="{img_mascot_wrench}" style="height: 110px;" alt="Mascot Wrench">
  </div>

  <!-- Micro Pipeline -->
  <div class="card card-white" style="padding: 14px; text-align: center; margin-bottom: 24px; font-weight: 800; font-size: 18px; color: #0284c7;">
    Thin API Route Handlers &nbsp;➔&nbsp; Decoupled Services Layer (Rules & Telemetry) &nbsp;➔&nbsp; Prisma ORM &nbsp;➔&nbsp; PostgreSQL (Supabase)
  </div>

  <div style="display: flex; gap: 24px;">
    <!-- Col 1 -->
    <div class="card card-white" style="flex: 1.2; padding: 24px;">
      <div class="pill pill-built" style="font-size: 15px; margin-bottom: 16px; display: block; text-align: center;">
        BUILT & VERIFIED (MILESTONES 1–3)
      </div>
      <ul style="font-size: 16px;">
        <li>Role-based access control (USER & ADMIN)</li>
        <li>Two-step link creation with custom alias validation</li>
        <li>Rule evaluation engine (Disabled, Expired, Limit, Password)</li>
        <li>Atomic conditional click limits (zero race overshoots)</li>
        <li>Privacy-safe unique visitor tracking (salted SHA-256)</li>
        <li>Campaigns and tags with safe decouple cascades</li>
        <li>Live analytics dashboard (7d, 30d, all-time, breakdowns)</li>
        <li>Security: Password rate limiting & bot traffic exclusion</li>
        <li>Comprehensive automated test suite (27 Vitest tests passing)</li>
      </ul>
    </div>

    <!-- Col 2 -->
    <div class="card card-white" style="flex: 1; padding: 24px;">
      <div class="pill pill-planned" style="font-size: 15px; margin-bottom: 16px; display: block; text-align: center;">
        IN PROGRESS & NEXT (ROUND 2)
      </div>
      <ul style="font-size: 16px;">
        <li>Cloud production deployment on Vercel</li>
        <li>QR code generation with dynamic scan tracking</li>
        <li>Bulk link creation via CSV import with duplicate checks</li>
        <li>Admin-managed domain blocklist against malicious URLs</li>
        <li>Expanded browser and device testing</li>
        <li>Enhanced mobile dashboard UX refinement</li>
      </ul>
    </div>

    <!-- Col 3 -->
    <div class="card card-white" style="flex: 0.95; padding: 24px;">
      <div class="pill" style="background: #f1f5f9; color: #475569; font-size: 15px; margin-bottom: 16px; display: block; text-align: center;">
        FUTURE ROADMAP
      </div>
      <ul style="font-size: 16px;">
        <li>Custom branded domains (CNAME mapping)</li>
        <li>Device-specific redirect targeting (iOS / Android)</li>
        <li>Public developer REST API with API keys</li>
        <li>Link-in-bio customizable landing pages</li>
        <li>Real-time webhook notifications for alerts</li>
        <li>Edge GeoIP location telemetry</li>
      </ul>
    </div>
  </div>
</div>

<!-- SLIDE 6: Application Architecture -->
<div class="slide">
  <div>
    <div class="badge-header">APPLICATION ARCHITECTURE</div>
    <div class="badge-subtitle">End-to-End System Components & Service Boundaries</div>
  </div>

  <div style="display: flex; gap: 24px; margin-top: 15px;">
    <!-- Actors -->
    <div style="width: 280px; display: flex; flex-direction: column; gap: 16px;">
      <div class="card card-white" style="padding: 18px;">
        <h3 class="card-title" style="margin-bottom: 4px;">VISITOR</h3>
        <p style="font-size: 15px;">Accesses short links, enters passcodes</p>
      </div>
      <div class="card card-white" style="padding: 18px;">
        <h3 class="card-title" style="color: #0284c7; margin-bottom: 4px;">USER</h3>
        <p style="font-size: 15px;">Creates links, campaigns & views personal analytics</p>
      </div>
      <div class="card card-white" style="padding: 18px;">
        <h3 class="card-title" style="color: #e11d48; margin-bottom: 4px;">ADMIN</h3>
        <p style="font-size: 15px;">Global platform oversight & link moderation</p>
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #475569; padding-left: 8px;">
        Session: Signed JWT in httpOnly cookie
      </div>
    </div>

    <!-- Next.js App Core -->
    <div class="card card-white" style="flex: 2; padding: 24px; border-width: 3px;">
      <h3 class="card-title" style="color: #0284c7; text-align: center; font-size: 22px; margin-bottom: 16px;">
        NEXT.JS 15 (APP ROUTER) + TYPESCRIPT
      </h3>

      <div class="card" style="background: #f8fafc; padding: 14px; text-align: center; margin-bottom: 14px;">
        <div style="font-weight: 800; font-size: 17px;">Presentation Layer (Pages & UI Components)</div>
        <p style="font-size: 14px; color: #64748b;">Landing Hero, 2-Step Creator, Analytics Dashboard, Admin Console, Status Pages</p>
      </div>

      <div class="card" style="background: #f8fafc; padding: 14px; text-align: center; margin-bottom: 14px;">
        <div style="font-weight: 800; font-size: 17px;">Thin API Route Handlers (Validation & Role Guards)</div>
        <p style="font-size: 14px; color: #64748b;">/[code] Redirect, /api/links, /api/campaigns, /api/tags, /api/analytics</p>
      </div>

      <div class="card card-cyan" style="padding: 18px;">
        <div style="font-weight: 800; font-size: 18px; color: #0284c7; text-align: center; margin-bottom: 8px;">
          SERVICES LAYER (DECOUPLED BUSINESS LOGIC)
        </div>
        <ul style="font-size: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <li><strong>Auth & Guards:</strong> User registration, role checks</li>
          <li><strong>Link & Rules:</strong> Base62 generator, rule evaluation</li>
          <li><strong>Click Telemetry:</strong> Bot filter, hash generation</li>
          <li><strong>Analytics Engine:</strong> Multi-period DB aggregations</li>
        </ul>
      </div>
    </div>

    <!-- Data Layer -->
    <div class="card card-white" style="width: 360px; padding: 24px; border-width: 3px;">
      <h3 class="card-title" style="text-align: center; font-size: 22px; margin-bottom: 4px;">DATA LAYER</h3>
      <div style="text-align: center; color: #0284c7; font-weight: 700; font-size: 16px; margin-bottom: 16px;">
        Prisma ORM ➔ PostgreSQL (Supabase)
      </div>
      <ul style="font-size: 15px;">
        <li><strong>User:</strong> Accounts & role permissions</li>
        <li><strong>Link:</strong> URLs, rules, atomic counters</li>
        <li><strong>ClickEvent:</strong> Telemetry records</li>
        <li><strong>Campaign:</strong> Groupings with safe cascade</li>
        <li><strong>Tag & LinkTag:</strong> Many-to-many labels</li>
        <li><strong>PasswordAttempt:</strong> Hashed IP lockout</li>
      </ul>
    </div>
  </div>

  <div class="callout-bottom">
    <strong>High-Performance Redirect Flow:</strong> Visitor ➔ Thin Route Handler ➔ Business Rules Service ➔ Atomic Counter ➔ HTTP 307 Redirect. Telemetry is dispatched in the background via Next.js <code>after()</code> without delaying the visitor.
  </div>
</div>

<!-- SLIDE 7: Security and Safety -->
<div class="slide">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div class="badge-header">SECURITY & DATA INTEGRITY</div>
      <div class="badge-subtitle">Built-in Safeguards Protecting Users, Privacy, and System Availability</div>
    </div>
  </div>

  <div style="display: flex; gap: 40px; margin-top: 15px;">
    <!-- Left Mascot with Shield -->
    <div style="width: 340px; text-align: center; padding-top: 40px;">
      <img src="{img_mascot_shield}" style="height: 480px;" alt="Mascot with Shield">
    </div>

    <!-- Right Safeguards List -->
    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Predictable rule evaluation hierarchy (Disabled → Expired → Limit → Password)</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Atomic conditional click counter prevents concurrency race conditions and overshoots</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Passcode protection salted and hashed with bcrypt; plain passwords never stored</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Stateless user sessions signed with JWT in secure httpOnly cookies (anti-XSS)</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Privacy-preserving visitor tracking using salted SHA-256 hashes; no raw IPs stored</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Password brute-force lockout: rate limits to 5 failed attempts per 15 minutes</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Link creation abuse protection: sliding window rate limit of 15 links per minute</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Automated bot exclusion: search crawlers & preview fetchers bypass click counters</span>
        <span class="pill pill-built">BUILT</span>
      </div>
      <div class="card card-white" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 22px;">
        <span style="font-size: 17px; font-weight: 600;">Admin domain blocklist: platform-wide moderation against malicious destinations</span>
        <span class="pill pill-planned">PLANNED</span>
      </div>
    </div>
  </div>

  <div class="callout-bottom">
    <strong>Strict Multi-Tenant Isolation:</strong> Users only ever access their own links and telemetry; administrators have global moderation oversight. A deactivated link stops traffic immediately at the first rule check while preserving complete historical logs.
  </div>
</div>

<!-- SLIDE 8: Redirect Flow -->
<div class="slide">
  <div>
    <div class="badge-header">REDIRECT & TELEMETRY FLOW</div>
    <div class="badge-subtitle">Strict Precedence Ordering & Non-Blocking Logging</div>
  </div>

  <div class="card card-yellow" style="padding: 16px 26px; margin: 15px 0 25px 0; font-size: 18px;">
    <strong>Why HTTP 307 + no-store:</strong> Permanent 301 redirects are cached by visitor browsers, causing repeat clicks to skip our servers entirely. LinkPulse issues HTTP 307 Temporary Redirects with <code>Cache-Control: no-store</code> so every visit evaluates current rules and records accurate telemetry.
  </div>

  <!-- Linear Pipeline Cards -->
  <div style="display: flex; gap: 16px; margin-bottom: 25px;">
    <div class="card card-white" style="flex: 1; text-align: center; padding: 16px;">
      <h3 class="card-title" style="font-size: 17px;">VISITOR OPENS LINK</h3>
      <p style="font-size: 14px; color: #64748b;">Fetches active link by code from PostgreSQL</p>
    </div>
    <div class="card" style="flex: 1; text-align: center; padding: 16px; background: #fee2e2;">
      <h3 class="card-title" style="font-size: 17px; color: #e11d48;">1. DISABLED?</h3>
      <p style="font-size: 14px; color: #e11d48; font-weight: 600;">YES ➔ Shows 'Link Disabled' page</p>
    </div>
    <div class="card" style="flex: 1; text-align: center; padding: 16px; background: #fee2e2;">
      <h3 class="card-title" style="font-size: 17px; color: #e11d48;">2. EXPIRED?</h3>
      <p style="font-size: 14px; color: #e11d48; font-weight: 600;">YES ➔ Shows 'Link Expired' page</p>
    </div>
    <div class="card" style="flex: 1.1; text-align: center; padding: 16px; background: #fee2e2;">
      <h3 class="card-title" style="font-size: 17px; color: #e11d48;">3. CLICK LIMIT?</h3>
      <p style="font-size: 14px; color: #e11d48; font-weight: 600;">YES ➔ Shows 'Limit Reached' (atomic check)</p>
    </div>
    <div class="card card-yellow" style="flex: 1; text-align: center; padding: 16px;">
      <h3 class="card-title" style="font-size: 17px;">4. PASSWORD?</h3>
      <p style="font-size: 14px; color: #854d0e; font-weight: 600;">YES ➔ Prompts for passcode (rate-limited)</p>
    </div>
    <div class="card" style="flex: 1.2; text-align: center; padding: 16px; background: #dcfce7; border-color: #166534;">
      <h3 class="card-title" style="font-size: 17px; color: #166534;">ALL RULES PASS</h3>
      <p style="font-size: 14px; color: #166534; font-weight: 700;">HTTP 307 Redirect to Destination URL</p>
    </div>
  </div>

  <!-- Bottom Telemetry Pipeline -->
  <div class="card card-white" style="padding: 24px;">
    <h3 class="card-title" style="font-size: 20px; color: #0284c7; margin-bottom: 16px;">
      AFTER THE REDIRECT: ASYNCHRONOUS TELEMETRY PIPELINE
    </h3>
    <div style="display: flex; gap: 20px;">
      <div class="card" style="flex: 1; padding: 16px;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px;">1. Bot Filtering</div>
        <p style="font-size: 14px; color: #64748b;">Search crawlers, preview fetchers & curl bypass tracking</p>
      </div>
      <div class="card" style="flex: 1; padding: 16px;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px;">2. Privacy Hashing</div>
        <p style="font-size: 14px; color: #64748b;">Generate salted SHA-256 hash from IP + User-Agent; raw IP discarded</p>
      </div>
      <div class="card" style="flex: 1; padding: 16px;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px;">3. Client Classification</div>
        <p style="font-size: 14px; color: #64748b;">Extract device family, browser, operating system & referrer origin</p>
      </div>
      <div class="card" style="flex: 1; padding: 16px;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px;">4. Live Dashboard Ingestion</div>
        <p style="font-size: 14px; color: #64748b;">Persist ClickEvent row; immediately reflected on live reports</p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 9: Data Model + Analytics -->
<div class="slide">
  <div>
    <div class="badge-header">DATA MODEL & ANALYTICS</div>
    <div class="badge-subtitle">Relational Schema & Real-Time Aggregation Pipeline</div>
  </div>

  <div style="display: flex; gap: 30px; margin-top: 15px;">
    <!-- Left: Schema Entities -->
    <div class="card card-white" style="flex: 1; padding: 30px;">
      <h3 class="card-title" style="color: #0284c7; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 18px;">
        RELATIONAL SCHEMA (POSTGRESQL / PRISMA)
      </h3>
      <ul style="font-size: 16px;">
        <li><strong>User:</strong> id, email, passwordHash, role (USER | ADMIN)</li>
        <li><strong>Campaign:</strong> id, name, description, userId (deleting sets <code>campaignId=null</code> on links)</li>
        <li><strong>Link:</strong> id, code, destinationUrl, isActive, expiresAt, clickLimit, clicksCount, passwordHash</li>
        <li><strong>ClickEvent:</strong> id, linkId, timestamp, device, browser, os, referrer, visitorHash</li>
        <li><strong>Tag & LinkTag:</strong> Many-to-many relationship for dynamic link categorization and filtering</li>
        <li><strong>PasswordAttempt:</strong> id, linkId, ipHash, success, createdAt (salted sliding-window lockout)</li>
      </ul>
    </div>

    <!-- Right: How Clicks Become Reports -->
    <div class="card card-yellow" style="flex: 1.15; padding: 30px;">
      <h3 class="card-title" style="font-size: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
        HOW CLICKS BECOME ACTIONABLE INSIGHTS
      </h3>
      <ul style="font-size: 16px;">
        <li>
          <strong>1. Bot-Filtered Event Ingestion:</strong> Every legitimate visit writes an indexed ClickEvent with device category, browser family, OS, sanitized referrer, and privacy-safe visitor hash.
        </li>
        <li>
          <strong>2. Database-Level Real-Time Aggregation:</strong> Prisma count and groupBy queries execute directly in PostgreSQL, eliminating memory bottlenecks when scaling to thousands of records.
        </li>
        <li>
          <strong>3. Multi-Period Filtering:</strong> Interactive time periods (7 Days, 30 Days, All Time) calculate total visits, unique visitors, active links, and daily click distributions.
        </li>
        <li>
          <strong>4. Campaign & Audience Performance:</strong> Aggregates click volume, link counts, and top links per campaign, alongside device, browser, and referrer market shares.
        </li>
        <li>
          <strong>5. Proactive Link Health Alerts:</strong> Live warning cards notify owners of links expiring soon (within 72 hours), links approaching click capacity (≥ 80%), or deactivated links.
        </li>
      </ul>
    </div>
  </div>
</div>

<!-- SLIDE 10: Closing Slide -->
<div class="slide">
  <div class="badge-header">INNOVISTA 2026 | ROUND 1: IDEATION</div>
  <div style="margin-top: 60px;">
    <h1 class="slide-title" style="font-size: 96px; color: #0284c7;">THANK YOU!</h1>
    <h2 class="slide-subtitle" style="font-size: 36px; margin-bottom: 14px;">LinkPulse — URL Shortener & Telemetry Platform</h2>
    <p style="font-size: 24px; font-weight: 700; color: #64748b;">Graphic Era Hill University (GEHU), Haldwani Campus</p>
  </div>

  <div class="card card-yellow" style="width: 820px; padding: 26px 36px; margin-top: 60px;">
    <h3 class="card-title" style="font-size: 24px; margin-bottom: 8px;">Ready for Questions & Evaluation</h3>
    <p style="font-size: 19px; color: #0f172a;">Live prototype and codebase available for technical demonstration.</p>
  </div>

  <div style="position: absolute; right: 180px; top: 180px;">
    <img src="{img_mascot_wave}" style="height: 680px;" alt="LinkPulse Mascot">
  </div>
</div>

</body>
</html>
"""

html_path = os.path.join("docs", "LinkPulse_Round1_Presentation.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"[OK] Successfully created HTML presentation at {html_path}")

# Compile to PDF using Edge headless
pdf_path = os.path.abspath(os.path.join("docs", "LinkPulse_Round1_Presentation.pdf"))
abs_html_path = os.path.abspath(html_path)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if os.path.exists(edge_path):
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={pdf_path}",
        abs_html_path
    ]
    print("Running Edge headless print-to-pdf...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        print(f"[OK] Successfully compiled presentation PDF at {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
    else:
        print("Failed to compile PDF via Edge:", res.stderr)
else:
    print("Edge not found at default location.")
