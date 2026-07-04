# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-07-04

### Added
- **Database — 7 new tables**:
  - `assignments` — project/penugasan untuk associate
  - `assignment_assignees` — junction table assignee per assignment (status: invited, applied, accepted, rejected, completed, withdrawn)
  - `admin_preferences` — notifikasi & theme settings admin
  - `associate_reviews` — review workflow (approve/reject dengan notes)
  - `associate_assessments` — penilaian performa associate oleh admin
  - `associate_development_plans` — rencana pengembangan karir (JSONB: recommended_actions, learning_paths)
  - `associate_tasks` — task harian associate (user-scoped CRUD)
- **API — Auth**:
  - `POST /api/auth/register` — register + auto-create associate record
  - `POST /api/auth/login` — login via Supabase
  - `GET /api/auth/me` — current user + profile (admin excluded from associate creation)
  - Role-based redirect: admin → `/admin`, associate → `/dashboard`
- **API — Associate**:
  - Full CRUD: profile, experiences, educations, certifications, portfolios, skills, languages, availability, social links, emergency contacts
  - `GET /api/associate/me` — returns assignments + my_status, assessments, development_plan
  - `GET /api/associate/tasks` — user-scoped task list
  - `POST/PATCH/DELETE /api/associate/tasks` — task CRUD
  - `GET /api/associate/notifications` — notification dari assignment_assignees
  - `GET /api/associate/notifications/count` — total notif count
  - `POST /api/associate/submit` — submit profile for review
- **API — Admin**:
  - `GET /api/admin/associates` — list dengan search, status filter, pagination (admin users excluded)
  - `GET /api/admin/associates/:id` — detail associate
  - `PATCH /api/admin/associates/:id/review` — approve/reject
  - `GET /api/admin/associates/:id/cv` — CV generation data
  - `GET/PATCH /api/admin/assignments` — CRUD assignments
  - `POST /api/admin/assignments/:id/assignees` — invite assignee
  - `DELETE /api/admin/assignments/:id/assignees/:assigneeId` — remove assignee
  - `GET/POST/PATCH/DELETE /api/admin/assessments` — CRUD assessments
  - `GET/POST/PATCH/DELETE /api/admin/development-plans` — CRUD development plans
  - `GET /api/admin/notifications` — admin notifications
  - `GET /api/admin/notifications/count` — notif count
  - `GET /api/admin/stats` — dashboard statistics
  - `GET /api/admin/capabilities` — capability analytics
  - `GET /api/admin/reports/summary` — reports summary
  - `GET /api/admin/growth` — growth data
  - `GET /api/admin/activity` — activity log (4 sources enriched)
  - `PATCH /api/admin/users/:id/role` — user role management
- **Web — Admin Portal**:
  - Admin layout: dark navy sidebar, functional search (⌘K shortcut + dropdown), mobile hamburger, dynamic role label
  - Admin dashboard: `Promise.allSettled` (single endpoint failure doesn't break page)
  - Admin associates list: search, tabs (All/Active/Under Review/Draft), pagination, dropdown aksi
  - Admin associate detail: breadcrumb, share profile, Reviews tab, document download, roles display
  - Admin assignments: full CRUD dengan toast error handling, invite modal
  - Admin assignment detail: assignee list, invite flow
  - Admin assessments: CRUD dengan modal form, table responsive
  - Admin development plans: CRUD dengan modal form, table responsive
  - Admin notifications: dropdown modal di header + full page (filter: Semua/Mendaftar/Diterima/Ditolak)
  - Admin reviews: inline approve/reject dengan notes textarea
  - Admin reports: export CSV/JSON
  - Admin activity: enriched activity log, refresh button
  - Admin users: 3 sections (Admin/Reviewer/Associate), role dropdown per user
  - Admin settings: notification preference toggles, sign out, system info
  - Admin analytics: Capability Analytics (charts dari real API)
- **Web — Associate Portal**:
  - Dashboard: stat cards real data (Visibility Status, Opportunity Match, Capability Score, Availability)
  - Dashboard: 9 criteria completion calculation
  - Profile: 5 tabs (Profil, Pengalaman, Keahlian, Ketersediaan, Dokumen) — global edit mode
  - Assignments: list + detail dengan apply/status update flow
  - Tasks: real API calls, user-scoped
  - Notifications: full page + badge di header, read/unread via localStorage
  - Assessments: view assessments dari admin
  - Development Plan: view development plan dari admin
  - Capability: radar chart proficiency levels
  - Reviews: view reviews
  - CV generation: client-side print
- **UI Components**:
  - Toast system: `ToastProvider` + `useToast()`, 4 types (success/error/warning/info), auto-dismiss 4s
  - Responsive grids: `grid-cols-1 sm:grid-cols-2/3` pattern
  - Tables: `overflow-x-auto` + `min-w-[640-700px]` untuk horizontal scroll
- **SQL Migrations**:
  - `001_add_assessments.sql` — associate_assessments, associate_development_plans, associate_tasks + RLS policies

### Changed
- **Admin associates list**: Dropdown aksi menggunakan `position: fixed` (fix terpotong oleh `overflow-x-auto`)
- **Admin logo**: Menggunakan `logo.png` (bukan hardcoded "b") — konsisten dengan associate
- **Associate profile**: Headline digantikan oleh bidang (`profile.roles`) + keahlian (`profile.expertises`)
- **Dashboard stat cards**: Menggunakan data real dari API (Visibility Status, Opportunity Match, Capability Score, Availability)
- **Associate tasks**: Dari localStorage placeholder → real API calls (`/api/associate/tasks`)
- **Associate `/me` endpoint**: Sekarang return assignments + my_status, assessments, development_plan
- **Admin search**: Menggunakan profile subquery (Supabase PostgREST limitation — `.or()` tidak support nested columns)
- **Associate API endpoints**: Semua menggunakan `.eq('id', user.id)` bukan `.eq('user_id', user.id)`
- **Dashboard layout**: `NEXT_PUBLIC_API_URL` fallback dari `localhost:3000` → `localhost:4000`
- **Associate notifications route**: `/notifications` & `/notifications/count` dipindahkan sebelum `requireRole(['admin'])` middleware — fix 403 error untuk associate
- **DB schema**: `notifications` table dihapus dari `schema.ts` — menggunakan `assignment_assignees` sebagai sumber notifikasi
- **Development plans**: Menggunakan JSONB columns (`recommended_actions`, `learning_paths`) bukan separate tables
- **Capability score**: Dihitung dari skill proficiency: beginner=25, intermediate=50, advanced=75, expert=95, averaged
- **Completeness criteria**: 9 kriteria di dashboard/admin (skills & expertises split), 8 di profile page

### Fixed
- **Admin dashboard**: Menggunakan `Promise.allSettled` (bukan `Promise.all`) — satu endpoint gagal tidak memblok seluruh page
- **Admin assignment detail**: Infinite re-fetch loop — `toast` & `headers` object dari useEffect dependency array diganti dengan `getHeaders()` useCallback
- **Admin notifications dropdown**: Read/unread tracking via localStorage (`admin_notif_read_ids`) — fix badge count tidak akurat
- **Associate notifications badge**: Read/unread tracking via localStorage (`assoc_notif_read_ids`)
- **Associate notifications**: Endpoint `/notifications` & `/notifications/count` accessible untuk role associate (bukan hanya admin)
- **Associate notifications**: Query semua status (bukan hanya `invited`) — fix notifikasi tidak muncul
- **Admin associates list**: Dropdown aksi terpotong oleh `overflow-x-auto` — fix dengan `position: fixed` + `getBoundingClientRect()`
- **Admin logo**: Dari hardcoded "b" → `logo.png` — konsisten dengan associate
- **Typecheck**: Lulus untuk `@ams/api` dan `@ams/web`

---

## [0.2.0] — 2026-06-28

### Added
- **Database**: Rich data model (12 tables: associates, profiles, experiences, educations, certifications, portfolios, skills, languages, availability, social links, emergency contacts, preferences, documents, reviews)
- **Validation**: Zod schemas untuk semua entities (Register, Login, Profile, Experience, Education, Certification, Portfolio, Skill, Language, Availability, Social Links, Emergency Contact, Preferences, Document Upload, Review)
- **Domain**: Business rules untuk rich profile completeness calculation
- **apps/api (Hono)**:
  - Auth module (register, login, logout, me)
  - Associates module (CRUD profile, experiences, educations, certifications, portfolios, skills, languages, availability, social links, emergency contacts, preferences; full profile upsert)
  - Upload module (CV, certificate, document delete)
  - Admin module (list associates dengan search/filter/pagination, view detail, review workflow, stats)
  - AI module (CV parsing endpoint dengan OpenAI GPT-4o-mini)
  - Auth middleware (Bearer token verification via Supabase)
- **apps/web (Next.js 15)**:
  - Auth context (Supabase client-side auth)
  - Landing page
  - Register page
  - Login page
  - Associate Dashboard (profile progress, status, quick actions)
  - Associate Profile (full rich form: data diri, experiences, educations, certifications, portfolios, skills, languages — add/remove inline)
  - Admin Dashboard (stats cards, navigation)
  - Admin Associates List (search, status filter, pagination, table)
  - Admin Associate Detail (view profile, documents, review workflow dengan approve/reject)
  - AppShell layout (responsive nav, auth state)
- **Config**: Updated `@ams/config` dengan semua environment variables
- **Database**: Seed script dengan sample data

---

## [0.1.0] — 2026-06-20

### Added
- Monorepo setup (pnpm workspaces + Turborepo)
- Packages: shared, domain, validation, database, ui, ai, config
- Docs: PRD, DESIGN, ERD, API
