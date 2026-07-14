# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [0.5.0] — 2026-07-14

### Added
- **Fitur Portofolio & Sertifikasi Baru**:
  - Menambahkan component input `StepPortfolio` untuk menambahkan link/tautan hasil karya proyek beserta judul dan deskripsi singkat.
  - Menambahkan component input `StepCertifications` untuk mengelola sertifikat profesional lengkap dengan Nama, Penerbit, ID, dan Link Kredensial.
  - Mengintegrasikan kedua form pengisian tersebut ke dalam alur editor profil (meningkatkan langkah edit dari 5 menjadi 7 langkah).
  - Menyediakan visual rendering premium untuk **Sertifikasi Profesional** & **Portofolio** di halaman Ringkasan Profil (`ProfileView`).
- **Banner Status Verifikasi Profil & Tombol Submit (Submit for Review)**:
  - Menyediakan banner status dinamis di dashboard utama Talent Associate berdasarkan status database (`draft`, `pending_review`, `suspended`).
  - Mengintegrasikan badge status akun (`Draft`, `Under Review`, `Active`, `Suspended`) langsung di bawah nama profil pada **Hero Banner Halaman Profil** (`ProfileView`).
  - Menyediakan tombol pintas **"Kirim Profil untuk Direview oleh Admin"** (khusus saat berstatus `draft`) langsung di dalam **Hero Banner Halaman Profil** (`ProfileView`) tepat di atas tombol ubah profil untuk kenyamanan akses instan.
- **Notifikasi Penyambutan Onboarding Otomatis**:
  - Menyisipkan notifikasi sistem virtual *"Selamat Datang di BinaHub! 👋"* di API `/api/associate/notifications` begitu pengguna selesai mengisi nama dari onboarding.

### Fixed
- **Sinkronisasi Persentase Kelengkapan Profil**:
  - Memperbaiki perbedaan perhitungan persentase kelengkapan profil antara dashboard (sebelumnya 70%) dan edit profil (sebelumnya 80%).
  - Kedua halaman kini mengevaluasi 10 komponen terstandar yang sama persis (Nama, CV, Pengalaman, Pendidikan, Keahlian, Peran, Foto, Ketersediaan, Sertifikasi, Portofolio) sehingga persentase kelengkapan sinkron tepat 100% saat profil lengkap.
- **Resolusi Crash Avatar User**:
  - Menambahkan helper dynamic image handler di dashboard dan header untuk memetakan path relatif gambar ke backend port secara dinamis (`http://localhost:4000/uploads/...`) guna menghindari blank-circle avatar.
- **Notifikasi Popover Header**:
  - Mengubah tautan bel notifikasi header menjadi popover interaktif yang menandai status dibaca secara instan melalui API tanpa memindahkan halaman (no redirection).
  - Menghubungkan custom event listener `'update-notif-count'` untuk menyinkronkan jumlah notifikasi sidebar secara realtime.

## [0.4.0] — 2026-07-07

### Fixed
- **Worker routes unauthenticated** (`apps/api/src/workers/routes.ts`): `POST /api/workers/process-events` sekarang dilindungi `authMiddleware` + `requireRole(['admin'])` — sebelumnya endpoint terbuka tanpa auth
- **`/logout` broken** (`apps/api/src/modules/auth/index.ts`): pakai `getDb()` (service role) → `auth.admin.signOut(userId)` berdasarkan `user.id` dari token, bukan `getAnonClient().auth.admin.signOut()` yang throw error
- **No global error handler** (`apps/api/src/app.ts`): tambah `app.onError` (500 generic, tidak bocor `error.message`) + `app.notFound` (404 JSON) — sebelumnya error stack bocor ke client
- **Race condition `/api/associate/me`** (`apps/api/src/modules/associate/routes.ts`): auto-create associate pakai `upsert` (`onConflict: 'id'` + `onConflict: 'associate_id'`) + `.maybeSingle()` — sebelumnya `insert` + `.single()` throw saat concurrent request
- **Worker `extractTextFromFile` placeholder** (`apps/api/src/workers/event-processor.ts`): sekarang panggil `extractTextFromPDF` dari `@ams/ai` — sebelumnya return string placeholder (tidak parse PDF sungguhan)
- **`ToastProvider` missing di dashboard** (`apps/web/src/app/dashboard/layout.tsx`): wrap layout dengan `ToastProvider` — sebelumnya `useToast()` throw runtime error di 7 halaman dashboard (profile, assignments, tasks, notifications, dll)
- **Magic number profile ring** (`apps/web/src/app/dashboard/page.tsx`): `351.86` → konstanta `PROFILE_RING_CIRC = 2 * Math.PI * 56`
- **Capability Snapshot radar tidak berubah** (`apps/web/src/app/dashboard/page.tsx`): dashboard pakai `data.capability_scores` (field tidak pernah ada di API response) → selalu all-zero → radar flat. Fix: hitung dari `data.skills.map()` berdasarkan `proficiency` (sama seperti halaman detail `/dashboard/capability`)
- **`hasCV` salah hitung** (`apps/web/src/app/dashboard/page.tsx`): `documents.length > 0` → cek semua dokumen (bukan tipe CV). Fix: `documents.find(d => d.type === 'cv')` — AI recommendation sekarang tidak lagi menampilkan “Upload CV” jika CV sudah terunggah
- **Skill type mismatch** (`apps/web/src/app/dashboard/page.tsx`): `level?: number` → `proficiency?: string` — sebelumnya `capabilityScore` selalu fallback 50 karena field `level` tidak ada di API response
- **Emoticons di profile & dashboard** (`apps/web/src/app/dashboard/profile/page.tsx`, `apps/web/src/app/dashboard/page.tsx`): ganti ✉️📱📍🌐📅👤🕐💼📋🛠⏳ dengan SVG icons (Heroicons) — deskripsi lebih profesional, konsisten dengan design system

### Security
- **Rate limiting** (`apps/api/src/middleware/rate-limit.ts`, baru): in-memory rate limit (10 req / 15 menit, IP + path keyed) diterapkan ke `POST /api/auth/register` & `POST /api/auth/login` — mitigasi brute-force dasar. Catatan: in-memory reset per cold start di Vercel serverless; untuk produksi skala penuh pindah ke Upstash Redis

### Changed
- **`AGENTS.md` rewrite**: disinkronkan dengan stack aktual — hapus klaim Drizzle ORM (runtime pakai Supabase JS client), struktur path benar, semua routes terdokumentasi, rules update
- **Repo cleanup — vendor bloat removal**: ~1628 file vendored (`packages/ai/openai/`, `packages/ai/typescript/`, `packages/ai/@anthropic-ai/`, `packages/ai/@ams/`) dihapus dari git tracking + `.gitignore` rules. Paket tetap resolve via `node_modules`
- **Repo cleanup — orphaned/duplicate paths removed**: `api/`, `apps/src/`, `apps/drizzle/`, `apps/api/api/`, `apps/api/drizzle/`, `apps/api/src/lib/supabase.ts` (dead), `apps/web/src/lib/api.ts` (dead), `apps/web/src/lib/supabase.ts` (dead), `apps/web/src/lib/onboarding-api.ts` (dead)

### Added — UI Components
- `apps/web/src/components/ui/button.tsx` — 5 varian (primary/secondary/ghost/danger/gold), 3 size, loading state + spinner, `aria-busy`, focus ring accessible
- `apps/web/src/components/ui/spinner.tsx` — 3 size + `FullPageSpinner`
- `apps/web/src/components/ui/empty-state.tsx` — icon + title + description + optional CTA
- `apps/web/tailwind.config.js` — token semantic baru: `brand`, `gold`, `surface` (backward-compatible, tidak override `binahub.*`), shadow presets (`card`, `card-hover`, `soft`), timing function `smooth`

### Changed — UI Modernization (CSS-only, non-breaking)
- **Pola visual konsisten** diterapkan di seluruh app:
  - Eyebrow label `text-xs uppercase tracking-[0.18em] text-[#D9A441]` di atas page title (admin dashboard, associates, assignments, profile)
  - Card hover lift: `hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200` (stat-card, stat-box, profile-completion-card, dashboard stats)
  - Active state sidebar: `font-semibold ring-1 ring-inset` (dashboard + admin layout, desktop & mobile)
  - Tab pills active: gradient `from-[#0B2C6B] to-[#0A255A]` + shadow-sm (profile page, 5 lokasi)
  - InfoCard icon bg: `bg-white border border-slate-200` → `bg-[#0B2C6B]/5` (konsisten dengan brand)
  - Search dropdown icons: SVG icons (Assignment/Skill/Profile) menggantikan emoticon
  - Primary button: `bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] shadow-lg shadow-[#0B2C6B]/20` (login, register, Hero CTA, Navbar Daftar, admin assignments)
  - StatusBadge: ring border + dot pulse animation untuk `pending_review`
  - StatCard: trend arrow indicator + gradient icon background
  - Table: `overflow-hidden` + header `backdrop-blur-sm` (admin associates list)
- **Halaman yang ditingkatkan**: landing Hero & Navbar, auth login & register, admin dashboard (header + StatBox), admin associates list (header + table), admin assignments (header + button), dashboard page (5 stats card), dashboard profile (header + save button + tab pills), dashboard & admin layout (sidebar active state)

### Notes
- Semua perubahan UI bersifat **CSS-only** (className) — tidak ada perubahan logic/data flow, tidak ada hydration risk
- Typecheck lulus: `@ams/api`, `@ams/web`, `@ams/ai`, + 6 packages lain
- Tidak ada fitur/fungsi yang dihapus atau diubah alurnya — semua perbaikan non-breaking
- Catatan deploy: worker route kini admin-only — jika ada cron job eksternal yang hit `/api/workers/process-events` tanpa auth akan 401. Sesuaikan cron (Bearer token admin) atau buat endpoint terpisah dengan API key secret

---

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
