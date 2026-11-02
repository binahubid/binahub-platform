# Dependency readiness - AMS0.11.1 / web0.10.2

2 November2026. Completes the prepared31October dependency patch as readiness
item R01. Existing uncommitted Next/Hono/Zod/OpenAI upgrades were reviewed and
retained, not reset. This record is local evidence, not a production deployment.

## Scope

- Next/config15.5.28, Hono4.13.14, Node adapter2.1.3, Zod4.6.7 and OpenAI6.
  Keep the existing web major, managed AI protocol and workspace boundaries.
- Preserve parsed CV defaults using prefault, and string-keyed unknown file
  metadata with Zod4. The new version field is operational metadata only.
- Patch all active tooling paths: minimatch11.0.1, esbuild0.28.1,
  browserslist4.28.7, baseline-browser-mapping2.11.0, selector-parser6.1.5.
  esbuild is a build dependency here; no migration or dev server is executed.
- Keep official pnpm9.15.0 pinned. The globally installed launcher can delegate
  to another version and ignore root overrides; use Corepack with the explicit
  version for install/audit. Nested package scripts must resolve that same pnpm.
  No global package manager was replaced. CI activates the exact version first.
- A lint-process-only facade bridges legacy callable minimatch consumers.
  Next15 FlatCompat is loaded through its supported CommonJS entry so ESM does
  not request a removed minimatch default export. No old matcher, vendor edits,
  advisory suppression, disabled rule or install hook is introduced.

## Verification

Full audit fell from9 advisories (2 high,6 moderate,1 low) to0; production-only
audit also reports0. Four dependency/lint contracts, eight shared validator
contracts and four built Hono app contracts pass. The latter use only synthetic
config and an exact fake rate-limit RPC; other outbound requests are rejected.
Health, malformed auth input, missing auth on private routes, CORS and request
headers retain their contracts. No real database/provider is contacted.

Builds for shared/validation, AI, API and Next web pass. API typecheck, full lint,
the existing LapakVIP→OpenRouter fallback/normalization self-test and signed
managed CV/ranking/no-bypass self-test pass. drizzle-kit version loading succeeds
with patched esbuild; db:generate/push/seed are not executed. Frozen-lockfile
installation with scripts disabled also succeeds. CI repeats synthetic checks
with dummy web configuration, no production secrets and read-only Git permissions.

Sources: [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[esbuild CORS](https://github.com/advisories/GHSA-67mh-4wv8-2f99),
[esbuild Windows](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr),
[browserslist memory](https://github.com/advisories/GHSA-c83g-rgw3-j3cx),
[browserslist parsing](https://github.com/advisories/GHSA-73wf-gq98-2v4g),
[baseline mapping](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv),
[selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
These are dependency advisories, not proof of reachable production exploits.

## Unchanged operational boundaries

No SQL/schema, role/consent policy, production credential, paid AI call, real
email, cleanup, scheduler activation or commercial change. API and web have
separate deployments; verify both deployed versions and their actual health
after release. Router self-tests prove synthetic failover, not that a specific
production API key has balance or every model is available. A0-advisory audit
is not an independent Strix pentest or a general security certification.
