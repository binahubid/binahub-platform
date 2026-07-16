# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [0.7.4] — 2026-07-16

### Added
- **Rate Limiter Serverless dengan Shared-State (Postgres-Backed)**:
  - Mengubah implementasi `rateLimit` di `apps/api/src/middleware/rate-limit.ts` dari in-memory `Map` menjadi database-backed `rate_limits` table lookup.
  - Hal ini menjamin pembatasan jumlah percobaan login & registrasi yang 100% andal di arsitektur serverless (seperti Vercel) karena state tersimpan secara persisten di database.
- **Migration SQL Terintegrasi**:
  - Membuat berkas migrasi resmi `002_import_cv_data_rpc.sql` di `packages/database/migrations/` berisi registrasi RPC `import_cv_data` dan pembuatan tabel `rate_limits` beserta kebijakan keamanannya (RLS) demi ketertiban pelacakan skema DB.

### Changed
- **Pembersihan Alur Onboarding**:
  - Menghapus pemanggilan API `POST /api/associate/social-links` selama finalisasi onboarding secara penuh. Karena kolom media sosial tidak dirender atau diminta pada antarmuka onboarding, penghapusan ini mempercepat loading Step Akhir sekaligus melenyapkan log bad request (400) secara tuntas.

## [0.7.3] — 2026-07-16

### Fixed
- **Perbaikan Pemetaan Kunci JSON Pengalaman Kerja (import_cv_data RPC)**:
  - Mengubah pemetaan nama kunci JSON pada Pl/pgSQL RPC `import_cv_data` dari `company` menjadi `organization` agar selaras dengan skema database dan state frontend, melenyapkan error *not-null constraint violation*.
- **Pembersihan Otomatis URL Sosial Media Onboarding**:
  - Menyematkan sanitasi URL otomatis di frontend onboarding yang menjamin setiap masukan LinkedIn/Website memiliki prefiks protokol `https://` guna menghindari kegagalan validasi Zod (status 400) di backend.

## [0.7.2] — 2026-07-16

### Added
- **Fitur Tambah & Edit Riwayat Manual di Onboarding**:
  - Menambahkan formulir inline interaktif di `step-history.tsx` untuk menambah baru dan mengubah (*edit*) riwayat pengalaman kerja serta pendidikan secara manual selama onboarding.

### Changed
- **Penyimpanan Onboarding Kolektif di Akhir (Deferred Onboarding Save)**:
  - Mengubah UX onboarding agar melakukan transisi halaman secara instan (hanya di tingkat client) untuk langkah 1, 2, dan 3.
  - Memindahkan seluruh proses penyimpanan data onboarding ke langkah akhir (Step 4) sehingga data ditulis ke server sekaligus menggunakan transaksi terpadu (menghemat puluhan request API menjadi satu alur loading).
- **Animasi Loading Premium & Interaktif**:
  - Mendesain overlay animasi penyimpanan onboarding yang premium dengan glowing pulse aura, spinner modern, indicator bar, serta ulasan teks status real-time ("Menyimpan data diri...", "Menyinkronkan riwayat...", dll).
- **Perbaikan Garis Koneksi Stepper Onboarding**:
  - Membatasi garis penghubung vertical oranye pada panel navigasi kiri onboarding agar terkunci dari pusat lingkaran pertama ke pusat lingkaran terakhir saja, mencegah garis meluber ke bawah.

### Fixed
- **Solusi Foto Profil Crash (Leading Slash Cleanup)**:
  - Menghilangkan penambahan leading slash (`/`) saat meregistrasikan URL foto profil di `step-review-profile.tsx` untuk menjaga konsistensi dengan database files.
  - Menambahkan pembersihan otomatis leading slash pada API `GET /api/files/view-path` di backend untuk menjamin kompatibilitas lookup basis data dan resolusi gambar yang bebas crash bagi akun lama maupun baru.

## [0.7.1] — 2026-07-16

### Added
- **Endpoint Konfirmasi Unggah CV Transaksional**:
  - Menambahkan endpoint `POST /api/files/associate/:id/cv/confirm` di backend Hono untuk melakukan validasi pasca-unggah, pendaftaran dokumen CV ke `associate_documents`, soft-delete data lama di `files`, serta memicu event `CVUploaded` secara aman.
- **Endpoint Impor Hasil Parsing CV Tunggal**:
  - Menambahkan REST API endpoint `POST /api/associate/import-cv` di backend Hono untuk memfasilitasi integrasi parsing yang transaksional.
- **Dukungan Sertifikasi Hasil Parsing AI**:
  - Memperluas skema Drizzle dan pemetaan parser data AI agar memproses data `certifications` hasil pembacaan CV ke basis data secara otomatis.

### Changed
- **Impor CV Atomik & Cepat**:
  - Mengubah logika `executeImport` di frontend `web/dashboard/profile/page.tsx` dari loop sequential REST request yang lambat dan rawan kegagalan parsial menjadi satu panggilan API transaksional `POST /api/associate/import-cv` (rollback otomatis terjamin via database Pl/pgSQL RPC `import_cv_data`).
- **Validasi Transisi Status Tugas (State Machine)**:
  - Memperketat validasi status tugas pada endpoint `PATCH /assignments/:id/status` di backend Hono untuk membatasi transisi status tugas (`invited`, `accepted`, `in_progress`, `completed`, `reviewed`, `declined`, `withdrawn`) agar sesuai dengan flowchart bisnis penugasan dan mencegah loncatan status ilegal.

### Security
- **Proteksi IDOR Pendaftaran Berkas**:
  - Menambahkan validasi otorisasi di endpoint `POST /api/files` untuk menjamin bahwa `ownerId` berkas harus cocok dengan user yang sedang terautentikasi (`user.id`) atau pengguna adalah `admin`.
- **Proteksi Berkas Privat**:
  - Mengetatkan akses pada endpoint pengalihan berkas `GET /api/files/view-path`. Berkas dengan visibilitas `private` (seperti CV/PDF) kini wajib memiliki token otentikasi di query/header dan lolos validasi kepemilikan berkas (owner/admin) sebelum diizinkan mengunduh, sementara berkas `public` (seperti foto avatar) tetap dapat diakses publik.

## [0.7.0] — 2026-07-15

### Added
- **Pencarian Associates Cerdas (Smart Search)**:
  - Menggabungkan kolom pencarian nama/email dan filter keahlian di `web/admin/associates/page.tsx` menjadi satu kolom input pintar (*smart search*).
  - Mengintegrasikan logika pencarian dinamis di backend Hono untuk mencocokkan nama, email, bio, kota, negara, peran, bidang kompetensi, keahlian, serta status ketersediaan.
- **Rekomendasi Kecocokan Kandidat Berbasis AI (1-100%)**:
  - Menambahkan fungsi pencocokan LLM `rankCandidates` di `@ams/ai` menggunakan client OpenAI untuk membandingkan spesifikasi proyek vs profil associate.
  - Menambahkan REST API endpoint baru `GET /api/admin/assignments/:id/recommendations` di Hono admin modules.
  - Merancang antarmuka laci/modal undang associate di admin assignments agar mengurutkan kandidat dari skor tertinggi, menampilkan persentase kecocokan AI, dan memuat kutipan kalimat rekomendasi secara visual.
- **Formulir Pelaporan Pekerjaan Ramah Gen-X**:
  - Merombak UI/UX pelaporan pada detail penugasan Associate menjadi alur berurutan yang sangat visual (Langkah 1: Upload Foto Dokumentasi Lapangan, Langkah 2: Ringkasan & Lampiran Dokumen Laporan Akhir) untuk mempermudah kalangan Gen-X.
- **Redesain Antarmuka Tim Assignment & Konsol Tinjau Laporan**:
  - Merombak daftar tim di admin assignments menjadi layout card interaktif dengan garis diagram progres horizontal 5 langkah yang interaktif (*invited*, *accepted*, *in_progress*, *completed*, *reviewed*).
  - Menampilkan foto dokumentasi lapangan, ringkasan tertulis laporan akhir, dan tombol berkas unduhan laporan utama.
  - Menyediakan konsol penilaian admin untuk menyetujui laporan (`reviewed`) atau meminta revisi (`in_progress`) beserta catatan feedback yang tersimpan dinamis.
  - Menghapus pemilih dropdown status manual yang redundan.
  - Memperbaiki foto profil associate yang crash di tim assignment admin.

### Fixed
- **Penyelesaian Simpan Ketersediaan (Availability Save)**:
  - Memperbarui Zod schema di `packages/shared/src/validators/associate.ts` agar menerima field *snake_case* dan memperluas ketersediaan enum.
  - Memperbarui handler Hono `handleUpsertAvailability` di `apps/api/src/modules/associate/routes.ts` untuk membaca field *snake_case* dari form onboarding dan profil, lalu menyimpannya ke database.
- **Perbaikan Relasi Query Tim Assignment**:
  - Mengubah struktur query relasi di backend Hono untuk melakukan JavaScript-based merge demi mem-bypass ketiadaan foreign key di tabel `assignment_assignees`, mengembalikan performa data tim yang dinamis.

## [0.6.0] — 2026-07-15

### Added
- **Attachment Upload di Sertifikasi (Feedback 13)**:
  - Mengintegrasikan dialog pemilihan berkas PDF/PNG/JPG/WebP langsung pada form sertifikasi baru dan edit sertifikasi di `StepCertifications`.
  - Mengunggah berkas sertifikat secara otomatis ke bucket storage lewat presigned URL API `/api/files/presigned-url` dan mendaftarkannya ke database registry `files`.
  - Menyimpan dan menampilkan dokumen sertifikat secara terlampir dan interaktif.
- **Media Upload & Link Sosmed di Portofolio (Feedback 14)**:
  - Memperluas component `StepPortfolio` untuk mendukung upload screenshot/foto/dokumentasi proyek dan testimoni (PDF/PNG/JPG/WebP/MP4) maksimal 50MB.
  - Memperluas tautan portofolio agar menerima link sosial media proyek, portofolio eksternal (Behance/GitHub), maupun tautan postingan LinkedIn.
- **Menu Pusat Bantuan IT Support & WhatsApp (Feedback 24 & 25)**:
  - Menambahkan sidebar menu Pusat Bantuan interaktif di Sidebar Admin (`admin/layout.tsx`) dan Sidebar Associate (`dashboard/layout.tsx`).
  - Menyediakan akses cepat satu-klik untuk menghubungi WA Support (`https://wa.me/628123456789`) dan kirim email IT Support (`support@binahub.com`) langsung dari navigasi utama.

### Changed
- **Sembunyikan Modul Tes Kemampuan (Feedback 12)**:
  - Menyembunyikan dan menonaktifkan modul asesmen Tes Kemampuan dari checklist onboarding (`checklist.tsx`) dan context data onboarding (`context.tsx`).

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
