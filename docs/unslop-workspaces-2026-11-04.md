# Workspace interface refinement

AMS0.11.5 / web0.10.5 · 4 November 2026.

Unslop by Damir Sokolovsky, https://github.com/heydamir/unslop, CC BY 4.0.
Polish mode: calm, clear and purposeful; keep BinaHub navy/gold and Plus Jakarta
Sans. Actual records and their meaning carry emphasis, not animated chrome.

Admin/reviewer/associate layouts: readable sidebar groups and metadata, named
controls, skip-to-content, mobile drawer focus/Escape/return and contained
notifications. Shared controls: mobile-safe input font, accessible search/filter
names/states, consistent button targets, navy text on gold, static review status.
Metrics: aligned figures, neutral optional icons, no hover translation. Table
headings use quiet normal case; screen-only rules exclude printed CV styling.

No API/database, auth/role, notification mutation, review/approval, profile,
entitlement, AI/provider, scoring or PDF access change. Existing status colors,
actual text/values, menu routes and role filtering remain. No dependency install.

Local validation: 30 combined app/AMS fixture cases, five viewports from1440 to
320px; reviewer/admin/associate plus app shell contexts. External URLs and writes
blocked. These are shared-layout/component tests, not all route content or live
authentication. 14 existing API/status/PDF/dependency contracts, frontend lint,
TypeScript and production build passed; final recheck recorded at release.

The original preview's relative Tailwind globs initially used the other repo's
cwd; corrected and baseline repeated. That artifact was not a product bug.
Mobile notification overflow was a real issue caught/fixed by the after-check.

The UI fixture lives only in scripts/ui-preview and never ships as an app route.
The app checkout holds the browser runner/screenshots and full implementation
note. Specialist inner sections, public AMS marketing/auth and PDF layouts were
not redesigned; do not describe this pass as a full WCAG audit or pentest.
No SQL/env, scheduler or production provider action required.
