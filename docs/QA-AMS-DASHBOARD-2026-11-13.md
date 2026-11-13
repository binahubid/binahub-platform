# AMS dashboard and profile photo refresh

Scope: responsive associate/admin dashboard, shared workspace panels, photo
framing, protected photo loading, profile shortcuts, and the second boot logo.
Brand assets, permissions, APIs, agreements, and notification delivery retain
their existing sources and policies.

## Design

- Navy work summary with actual assignment/review counts and a gold completion
  ring based on existing profile data. No added synthetic statistics.
- Four shortcuts with quiet blue, teal, gold, and violet icon backgrounds.
  Very narrow phones use two columns; larger phones use four. Tablets and
  desktops use a separate shortcut panel beside the summary.
- Shared `ams-panel` surface across workspace pages. Existing form, table,
  status, and empty-state behavior is preserved.
- Profile photo uses a fixed square wrapper with an absolutely positioned,
  full-size image and `object-fit: cover`. Intrinsic portrait dimensions cannot
  enlarge a grid track or shrink the frame. Private files use the existing
  authenticated signing endpoint, including admin lists and assignment teams.
- A missing photo displays initials. Resolution state is tied to both source
  and session so a changed source cannot briefly display the previous photo.
- The second boot image is the original `intro2.png`, including its tagline,
  with transparency preserved and no enclosing logo card.

## Verification

Browser fixtures use local synthetic accounts, portrait artwork, and intercepted
API requests. They do not sign in to production, update real profiles, or send
messages. The fixtures cover:

- Dashboard, profile, and admin assignments at 320, 390, 768, and 1366 pixels;
  no horizontal page overflow and no overlapping assignment actions.
- Portrait fills a square frame, authenticated photo URL resolution, and an
  unavailable image falling back to initials.
- Availability shortcut selects the correct profile section. Profile editing,
  assignment form opening, password visibility, and PWA manifest checks.
- Notifications, settings, capability, assessments, development, and consultant
  membership screens on mobile.
- A four-skill capability chart stays square inside a 320-pixel page; a
  one-skill profile uses the readable list without an empty radar chart.
- Repository lint, web production build/type checking, and the three existing
  private CV print contracts.

The mechanical design detector found no primary findings. Existing advisory
items were two bouncing profile toasts (removed in this change) and the public
landing grid utility, which is outside this workspace refresh.

These checks verify synthetic rendering and navigation. They do not replace
testing the installed PWA on a physical phone or a production permission audit.

## Release gate follow-up

GitHub's dependency audit rejected the first UI commit because the pre-existing
Hono and Node adapter versions now have published advisories. Update only Hono
to4.13.16, the adapter to2.1.6, and their lockfile references. The existing
moderate audit threshold and CI checks are retained.

References: [Hono security release](https://github.com/honojs/hono/releases/tag/v4.13.16)
and [Node adapter advisory](https://github.com/honojs/node-server/security/advisories/GHSA-jpvv-r467-5p4w).

After the patch, the frozen pnpm9.15 install, dependency audit (no known
advisories), four dependency compatibility contracts, API build/typecheck, and
nine API contracts pass. Contracts intercept outbound requests with synthetic
data. No production exploit requests or Strix scan were run; the local Docker
engine was unavailable. This is dependency patch verification, not a claim
that the entire application has been penetration tested.
