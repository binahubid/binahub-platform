# BinaApps AMS — Agent Rules

## Teknologi Stack
- **Frontend**: Next.js 15 App Router, Tailwind CSS, Supabase Auth
- **Backend**: Hono (REST API), Supabase Auth, Drizzle ORM
- **Monorepo**: pnpm workspaces + Turborepo
- **Validation**: Zod (shared between packages)
- **AI**: OpenAI (CV parsing via @ams/ai package)

## Struktur Penting
- `packages/domain/` — business rules (pure logic, no infra)
- `packages/validation/` — Zod schemas, shared API+Web
- `packages/database/` — Drizzle schema, migrations
- `packages/shared/` — types, validators, utils (existing)
- `packages/ai/` — OpenAI provider, CV parsing prompt
- `apps/api/src/modules/` — domain-based API modules
- `apps/web/src/app/` — Next.js App Router pages

## API Routes (apps/api)
- `POST /api/auth/register` — Register new account (Supabase Auth + create associate)
- `POST /api/auth/login` — Login (Supabase Auth)
- `GET /api/auth/me` — Get current user + associate profile
- `GET /api/associates/me` — Get full associate profile (Drizzle)
- `PUT /api/associates/full` — Update full associate profile (Drizzle)
- `POST /api/associates/submit` — Submit profile for review
- `GET /api/associate/me` — Get associate profile (Supabase, existing)
- `POST /api/associate/submit` — Submit for review (Supabase, existing)
- `GET /api/admin/associates` — List associates (admin)
- `GET /api/admin/associates/:id` — View associate detail (admin)
- `PATCH /api/admin/associates/:id/review` — Review associate (admin)
- `GET /api/admin/stats` — Dashboard statistics
- `POST /api/ai/parse-cv` — AI CV parsing (OpenAI)
- `POST /api/files/*` — File upload with presigned URLs
- `GET /api/reviews/*` — Review management

## Web Routes (apps/web)
- `/auth/login` — Login page (Supabase Auth)
- `/auth/register` — Register page (Supabase Auth)
- `/dashboard` — Associate dashboard (profile progress)
- `/dashboard/profile` — Edit profile form
- `/dashboard/documents` — Upload CV, certificates, portfolio
- `/admin` — Admin dashboard (stats)
- `/admin/associates` — List all associates (search, filter)
- `/admin/associates/[id]` — View associate detail, review

## Database Schema (12 tables)
- associates, associate_profiles, associate_experiences, associate_educations
- associate_certifications, associate_portfolios, associate_skills
- associate_languages, associate_availability, associate_social_links
- associate_emergency_contacts, associate_preferences
- associate_documents, reviews

## Aturan
- Business rules jangan di apps/api — tempatkan di packages/domain
- Zod schema jangan di apps/api — tempatkan di packages/validation atau packages/shared/validators
- Gunakan workspace protocol (`workspace:*`) untuk dependency antar package
- Jangan tambah komentar yang tidak perlu ke dalam code
- API ada 2 approach: Drizzle ORM (apps/api/src/modules/associates/) dan Supabase client (apps/api/src/modules/associate/routes.ts) — keduanya bisa jalan di route berbeda
