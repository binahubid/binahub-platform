# Associate CV print/PDF

AMS0.11.4 / web0.10.4 - 2 November2026.

The only generated PDF surface found in the bounded AMS apps/packages source
inventory is the admin standard CV print page. Reports export CSV/JSON. Uploaded
CVs, certificates and portfolio PDFs are not generated documents and are unchanged.

`apps/web/src/app/admin/associates/[id]/cv/page.tsx` keeps the authorized API fetch
and print action. `cv-document.tsx` renders all existing profile sections, with the
same protected photo component. `cv-document.module.css` defines A4 typography,
safe breaks, a repeating original-logo table header and native page counters.
Admin navigation/offset are removed only while printing. No new access is granted.

Use current Chrome/Edge. In print settings choose A4, keep scale at100%/default,
and disable browser headers/footers so URL/date/page labels are not duplicated.
CSS margin boxes provide the document's own numbered confidentiality footer.
Other browsers can differ in support for paged-media margin boxes.

`pnpm test:pdf` runs three source contracts in CI. Short/two-page and long/five-page
synthetic CVs were separately rendered from the actual component with Chromium,
rasterized, and reviewed, including the repeated header and all profile sections.
No production CV, photo request, Supabase call or provider quota was used.

This is a print design change, not a rewrite of uploaded files, privacy policy,
validation, matching or CV parsing. No API release, SQL/env or scheduler change.
