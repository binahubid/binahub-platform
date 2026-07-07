# BinaApps AMS — Agent Rules

## Teknologi Stack
- **Frontend**: Next.js 15 App Router, Tailwind CSS, Supabase Auth (client-side)
- **Backend**: Hono (REST API) on Vercel (Node), Supabase Auth + Postgres
- **Monorepo**: pnpm workspaces + Turborepo
- **Validation**: Zod (shared via `@ams/shared/validators`)
- **AI**: OpenAI-compatible provider (CV parsing via `@ams/ai` package, `pdf-parse`)

## Struktur Penting
- `packages/domain/` — business rules (pure logic; saat ini: `associate.ts`)
- `packages/shared/` — types, validators, utils (Zod schemas ada di sini, BUKAN `packages/validation`)
- `packages/validation/` — re-export dari `@ams/shared` (layer tipis, hampir redundant)
- `packages/ai/` — OpenAI provider, CV parsing prompt, PDF text extraction
- `packages/ui/` — `cn()` helper (belum dipakai apps/web)
- `apps/api/src/` — Hono API (entry `src/index.ts`, app `src/app.ts`)
  - `src/modules/auth/` — register, login, logout, me + `middleware/auth.ts` (authMiddleware, requireRole, optionalAuth)
  - `src/modules/associate/routes.ts` — endpoint associate (self-service + admin) via Supabase client (service role)
  - `src/modules/admin/index.ts` — endpoint admin (stats, associates, assignments, assessments, dll)
  - `src/modules/ai/index.ts` — `POST /api/ai/parse-cv`
  - `src/modules/files/routes.ts` — presigned upload, file registry, CV upload
  - `src/modules/reviews/routes.ts` — review management
  - `src/workers/` — event queue processor (protected: admin only)
  - `src/middleware/rate-limit.ts` — in-memory rate limiter (auth routes)
  - `src/lib/database.ts` — Supabase admin client (service role; `getDb()`)
- `apps/web/src/app/` — Next.js App Router pages
  - `auth/login`, `auth/register`, `auth/callback`
  - `dashboard/*` — associate area; `admin/*` — admin area
  - root `/login`, `/register`, `/profile` = redirect stubs ke `/auth/*` / `/dashboard/*`

## Pendekatan Database
- **API pakai Supabase JS client (service role)** lewat `getDb()` di `apps/api/src/lib/database.ts`.
- BUKAN Drizzle ORM di runtime (meskipun `packages/database` ada, tidak dipakai app).
- RLS di-bypass karena service role → keamanan bergantung pada `authMiddleware` + `requireRole` di API.

## API Routes (apps/api)
- `POST /api/auth/register` — Register (Supabase Auth + create associate + slug)
- `POST /api/auth/login` — Login (Supabase Auth) — rate-limited
- `POST /api/auth/logout` — Logout (revoke via service role)
- `GET /api/auth/me` — Current user info
- `GET /api/associate/me` — Full associate profile (auto-create if missing)
- `PUT /api/associate/profile` — Update profile
- `POST /api/associate/submit` — Submit for review
- `GET|POST|PUT|DELETE /api/associate/experiences` — Experience CRUD
- `GET|POST|PUT|DELETE /api/associate/educations` — Education CRUD
- `GET|POST|DELETE /api/associate/skills` — Skills
- `GET|POST|DELETE /api/associate/languages` — Languages
- `GET|POST|PUT|DELETE /api/associate/certifications` — Certifications
- `POST|DELETE /api/associate/portfolios` — Portfolios
- `GET|PUT /api/associate/availability` — Availability
- `GET|POST|PUT|DELETE /api/associate/social-links` — Social links
- `GET|PUT /api/associate/emergency-contact` — Emergency contact
- `GET|PUT /api/associate/preferences` — Preferences
- `GET /api/associate/assignments` / `/:id` / `POST /:id/apply` / `PATCH /:id/status` — Assignments
- `GET /api/associate/notifications` / `/count` — Notifications (derived from assignees)
- `GET|POST|PATCH|DELETE /api/associate/tasks` — Tasks
- `GET /api/associate/slug/:slug` — Public profile by slug
- Admin (requires role `admin`): `/api/admin/stats`, `/associates`, `/associates/:id`, `/associates/:id/review|approve|reject|suspend|reactivate`, `/associates/:id/cv`, `/assignments` (CRUD + invite + assignees), `/assessments`, `/development-plans`, `/capabilities`, `/activities`, `/reports/summary`, `/growth`, `/notifications`, `/users`, `/preferences`
- `POST /api/ai/parse-cv` — AI CV parsing (auth required)
- `POST /api/files/presigned-url`, `POST /api/files`, `GET /api/files/:id`, `/:id/download`, `/:id/view`, `DELETE /:id`, `POST /api/files/associate/:id/cv` — File management
- `GET|POST|PUT /api/reviews` — Reviews (admin/reviewer)
- `POST /api/workers/process-events` — Trigger event processor (admin only)
- `GET /api/health` — Health check

## Web Routes (apps/web)
- `/` — Landing page
- `/auth/login`, `/auth/register`, `/auth/callback` — Auth (Supabase)
- `/dashboard` — Associate dashboard (profile progress, assignments, capability)
- `/dashboard/profile` — Edit profile (tabbed: profile, experience, education, skills, documents, dll)
- `/dashboard/assignments`, `/dashboard/tasks`, `/dashboard/reviews`
- `/dashboard/capability`, `/dashboard/assessments`, `/dashboard/development`
- `/dashboard/notifications`, `/dashboard/settings`
- `/admin` — Admin dashboard
- `/admin/associates`, `/admin/associates/[id]`, `/admin/associates/[id]/cv`
- `/admin/assignments`, `/admin/assignments/[id]`
- `/admin/reviews`, `/admin/assessments`, `/admin/development-plans`
- `/admin/analytics`, `/admin/reports`, `/admin/activity`
- `/admin/notifications`, `/admin/users`, `/admin/settings`
- `/status` — Health check page

## Database Schema (Supabase / Postgres)
- associates, associate_profiles, associate_experiences, associate_educations
- associate_certifications, associate_portfolios, associate_skills
- associate_languages, associate_availability, associate_social_links
- associate_emergency_contacts, associate_preferences
- associate_documents, associate_reviews, associate_tasks
- associate_assessments, associate_development_plans
- assignments, assignment_assignees
- files, event_queue, search_sync_log, admin_preferences
- (SQL migration: `packages/database/schema.sql` + `packages/database/migrations/*.sql`)

## Aturan
- Business rules jangan di apps/api — tempatkan di `packages/domain`
- Zod schema jangan di apps/api — tempatkan di `packages/shared/validators` (bukan `packages/validation`)
- Gunakan workspace protocol (`workspace:*`) untuk dependency antar package
- Jangan tambah komentar yang tidak perlu ke dalam code
- Jangan commit vendor npm (mis. `openai/`, `typescript/`) ke dalam `packages/ai` — resolve via `node_modules`
- Untuk Supabase di API: gunakan `getDb()` (service role) dari `lib/database.ts`. Buat client anon hanya saat butuh user-scoped op (mis. `verifyToken`).
- Error: jangan bocorkan `error.message` mentah ke client — route return sendiri untuk 4xx, 500 ditangani `app.onError`.
- Auth routes (`/login`, `/register`) wajib pakai `rateLimit`.

## Deployment
- `vercel.json` (root): build `@ams/web...` + `@ams/api...`, output `apps/web/.next`, framework nextjs.
- API di-deploy sebagai Vercel Node project terpisah (`apps/api/vercel.json`: build tsup → `dist/`).
- Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OPENAI_API_KEY` (+ opsional `OPENAI_API_BASE`, `OPENAI_MODEL`), `NEXT_PUBLIC_*` untuk web.
