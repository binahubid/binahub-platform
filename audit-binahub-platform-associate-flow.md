# Audit: `binahubid/binahub-platform` — Alur Associate (Register → Profile → CV)

**Repo:** github.com/binahubid/binahub-platform
**Stack:** Next.js (apps/web) + Hono API di Vercel serverless (apps/api) + Supabase (Postgres + Auth + Storage)
**Fokus:** register, isi profil manual, upload CV, parsing CV otomatis, auto-delete CV lama
**Tanggal audit:** 13 Juli 2026

---

## Ringkasan Eksekutif

Struktur backend untuk auth dan CRUD profil (experience, education, skills, dst) sudah cukup solid dan konsisten di-scope per user. Tapi **fitur inti yang jadi prioritas kamu — upload CV, parsing otomatis ke profil, dan auto-delete CV lama — praktis tidak berfungsi di production**, bukan karena logic AI-nya salah, tapi karena **frontend memanggil endpoint dan skema field yang berbeda dari yang disediakan backend**. Selain itu ditemukan beberapa **celah keamanan IDOR (Insecure Direct Object Reference)** pada endpoint file yang perlu segera ditutup karena menyangkut dokumen pribadi (CV, KTP, dll).

| Kategori | Jumlah Temuan Kritis | Jumlah Temuan Sedang/Minor |
|---|---|---|
| Fungsional (UX inti yang kamu minta) | 4 | 3 |
| Keamanan | 3 | 2 |

---

## 🔴 BAGIAN 1 — Bug Fungsional Kritis (langsung mempengaruhi UX yang kamu minta)

### 1.1 Upload CV benar-benar rusak end-to-end (endpoint & skema tidak nyambung)

**File:** `apps/web/src/app/dashboard/profile/components/step-documents.tsx` (dan duplikatnya di `page.tsx` untuk foto profil)

Frontend upload CV melakukan 3 langkah, dan **langkah 1 & 3 salah total**:

```js
// Frontend memanggil:
POST /api/files/presign          // ❌ endpoint ini TIDAK ADA di backend
POST /api/files { fileName, fileType, fileSize, storagePath, documentType }  // ❌ field salah
```

```js
// Backend yang sebenarnya ada:
POST /api/files/presigned-url    // beda nama path
// body wajib: { fileName, fileType, fileSize, ownerId, ownerType, category }

POST /api/files
// body wajib (fileRegistrationSchema): { ownerId, ownerType, category, path, originalName, mime, size }
```

Tidak ada satupun field yang cocok (`fileName` vs `originalName`, `storagePath` vs `path`, `documentType` vs `category`, dan `ownerId`/`ownerType` sama sekali tidak dikirim). Akibatnya:
- Langkah 1 (`/api/files/presign`) akan **404** karena route-nya tidak ada.
- Kalaupun itu diperbaiki, langkah 3 (`POST /api/files`) akan selalu **400 "Data tidak valid"** karena validasi Zod gagal.
- **User tidak akan pernah berhasil upload CV lewat halaman profile sama sekali.**

Yang ironis: backend justru **sudah punya endpoint khusus yang benar dan aman** untuk ini — `POST /api/files/associate/:id/cv` (lihat `apps/api/src/modules/files/routes.ts` baris 290) — lengkap dengan validasi tipe file, ukuran, pengecekan kepemilikan (`user.id !== associateId && role !== 'admin'`), insert ke tabel `files` **dan** `associate_documents`, plus event `CVUploaded`. **Endpoint ini sama sekali tidak pernah dipanggil oleh frontend** — jadi ini kerja backend yang sia-sia (dead code).

**Rekomendasi:** Ubah `step-documents.tsx` untuk memanggil `POST /api/files/associate/:id/cv` (bukan `/api/files/presign` + `/api/files`). Ini sekaligus menyelesaikan masalah kepemilikan/keamanan karena endpoint ini sudah punya guard yang tepat.

---

### 1.2 Auto-delete CV lama saat diganti — fiturnya **belum ada sama sekali**, bahkan di level skema database

Ini requirement spesifik yang kamu sebut, dan setelah ditelusuri sampai ke schema:

- Endpoint upload CV (baik yang benar `/associate/:id/cv` maupun yang salah dipakai sekarang) **hanya melakukan INSERT** baris baru ke `files` dan `associate_documents` setiap kali upload — tidak ada langkah "hapus/soft-delete CV lama" di manapun.
- Lebih dalam lagi: tabel `associate_documents` (lihat `packages/database/src/schema.ts` baris 163) **tidak punya kolom `deleted_at`** sama sekali — beda dengan tabel `files` yang punya. Artinya secara desain database pun, tidak ada mekanisme untuk soft-delete dokumen lama di tabel ini.
- Dua tabel (`files` dan `associate_documents`) menyimpan data CV secara terpisah dan **tidak pernah disinkronkan**. Endpoint `DELETE /api/files/:id` yang dipakai tombol hapus di UI hanya soft-delete di tabel `files`, tapi baris terkait di `associate_documents` (yang dipakai untuk tampilan daftar dokumen & untuk AI parsing) **tetap ada selamanya**.

Efek nyata: setiap kali associate ganti CV, akan menumpuk banyak baris CV lama yang tidak pernah hilang — baik dari sisi storage (biaya) maupun dari sisi data (bisa membingungkan AI parsing karena ambigu CV mana yang aktif).

**Rekomendasi:**
1. Tambah kolom `deleted_at` di `associate_documents`, atau pakai constraint "1 CV aktif per associate" (unique partial index).
2. Di endpoint upload CV, sebelum insert baris baru: soft-delete (atau hard-delete dari storage) CV lama milik associate yang sama untuk `category = 'cv'`.
3. Idealnya dibungkus dalam 1 transaction agar tidak ada race condition kalau user upload dua kali cepat berturut-turut.

---

### 1.3 "Isi profil otomatis dari CV" cuma mengisi 1 dari 5 field yang di-parse AI

**File:** `apps/web/src/app/dashboard/profile/page.tsx` — fungsi `handleParseCV`

Backend AI (`packages/ai/src/providers/base.ts`) sebenarnya sudah mem-parsing CV jadi struktur lengkap:
```ts
interface ParsedCV {
  name, headline, ...
  skills: ParsedSkill[]
  experience: ParsedExperience[]
  education: ParsedEducation[]
  certifications, languages, ...
}
```

Tapi di frontend, hasil parsing ini **hanya dipakai untuk mengisi satu field**:
```js
if (parsed.name && editProfile) {
  setEditProfile({ ...editProfile, full_name: parsed.name });
}
```

`skills`, `experience`, `education`, `certifications`, `languages` yang sudah susah payah di-parse AI **dibuang begitu saja**, padahal endpoint-endpoint POST untuk masing-masing (`/api/associate/experiences`, `/educations`, `/skills`, dst) sudah tersedia dan berfungsi baik. Ini bertentangan langsung dengan requirement "bisa isi profile otomatis dengan CV".

**Rekomendasi:** Setelah `parse-cv` sukses, tampilkan hasil parsing sebagai preview yang bisa dikonfirmasi user ("AI menemukan 3 pengalaman kerja, 2 pendidikan, 8 skill — pakai semua?"), lalu panggil endpoint create experience/education/skill secara batch. Ini juga lebih baik dari sisi UX dibanding auto-overwrite tanpa konfirmasi.

---

### 1.4 Halaman `/onboarding` yang dijanjikan di dokumen ternyata cuma redirect kosong

**File:** `apps/web/src/app/onboarding/page.tsx`

```tsx
useEffect(() => { router.replace('/dashboard'); }, [router]);
```

Sesuai `docs/UX-JOURNEY.md`, alur onboarding 8-langkah terpandu (Personal Info → Professional Info → Experience → Education → Skills → Upload CV → Portfolio → Review) adalah **"the most important phase"**. Tapi implementasinya ternyata langsung redirect ke dashboard. Kelihatannya step-step onboarding sudah dipindah/digabung jadi tab-tab di `/dashboard/profile` (`step-profile.tsx`, `step-experience.tsx`, `step-skills.tsx`, `step-documents.tsx`, `step-availability.tsx`) — tapi **tidak ada portfolio step**, dan alur "Welcome Screen → 8 step wizard → Complete 🎉 dengan Profile Strength %" yang dideskripsikan di dokumen **tidak terlihat diimplementasikan** sebagai pengalaman terpandu untuk associate baru. User baru mendarat langsung di dashboard tanpa dituntun.

**Rekomendasi:** Kalau memang keputusan produknya sudah pindah ke tab-based profile (bukan wizard onboarding terpisah), update `docs/UX-JOURNEY.md` supaya tidak menyesatkan tim. Kalau belum, ini gap besar yang perlu didiskusikan dengan Pak Bilal karena mempengaruhi kesan pertama associate baru — sesuai filosofi dokumen kalian sendiri.

---

## 🔴 BAGIAN 2 — Temuan Keamanan (Broken Access Control / IDOR)

### 2.1 KRITIS: `GET /api/files/:id/view` bisa diakses **tanpa login sama sekali**

**File:** `apps/api/src/modules/files/routes.ts` baris 183

```js
fileRoutes.get('/:id/view', async (c) => {   // <- tidak ada authMiddleware!
  ...
  return c.redirect(data.signedUrl);
});
```

Semua route file lain (`GET /:id`, `GET /:id/download`, `DELETE /:id`) pakai `authMiddleware`, tapi route `/:id/view` ini lupa ditambahkan. Siapapun yang tahu/menebak ID file (UUID, jadi relatif sulit ditebak tapi bisa bocor lewat log, share link, dsb) bisa langsung membuka CV, KTP, atau dokumen pribadi lain **tanpa perlu login**.

### 2.2 KRITIS: Tidak ada pengecekan kepemilikan di `GET /:id`, `GET /:id/download`, `DELETE /:id`

Route-route generic file ini (baris 126–244) hanya mengecek "user sudah login", **bukan** "user ini pemilik file ini". Bandingkan dengan endpoint CV khusus (`/associate/:id/cv`) yang sudah benar melakukan `if (user.id !== associateId && user.role !== 'admin')`.

Dampak nyata: associate A yang login bisa:
- Download CV/KTP/dokumen pribadi associate B kalau tahu file ID-nya (`GET /api/files/{id}/download`)
- **Menghapus** dokumen associate B (`DELETE /api/files/{id}`) — ini destructive, bukan cuma baca data
- Melihat daftar semua file associate lain lewat `GET /api/files?owner_id=<id-lain>` (baris 250) yang juga tidak divalidasi

**Rekomendasi:** Tambahkan pengecekan `file.owner_id === user.id || file.uploaded_by === user.id || user.role === 'admin'` di keempat endpoint ini (view, download, get, delete, list). Ini prioritas tertinggi untuk diperbaiki sebelum go-live karena menyangkut kebocoran data pribadi (KTP, dokumen pajak, dst — sesuai `docs/UX-JOURNEY.md` bagian Documents).

### 2.3 SEDANG: Endpoint `POST /api/files` (register generic) tidak validasi `ownerId` sesuai user

Body request punya field `ownerId` bebas yang tidak dicek terhadap `user.id`. User bisa mendaftarkan file dengan `ownerId` milik orang lain — berpotensi menyisipkan data "dokumen palsu" ke profil associate lain (kalau dikombinasikan dengan bug lain, walau saat ini terselamatkan tidak sengaja oleh bug endpoint mismatch di 1.1).

### 2.4 MINOR: Response `POST /api/ai/parse-cv` membocorkan detail internal

**File:** `apps/api/src/modules/ai/index.ts`

Response sukses maupun error menyertakan objek `debug` berisi status HTTP internal, error signed-URL Supabase, bahkan `String(err)` (stack/exception mentah) langsung ke client. Untuk endpoint yang dipakai user biasa (bukan admin/dev tool), ini sebaiknya di-strip di production — cukup log di server, jangan dikirim ke response.

### 2.5 MINOR: Rate limiting pakai in-memory Map, sementara API di-deploy sebagai Vercel serverless

**File:** `apps/api/src/middleware/rate-limit.ts` + `apps/api/vercel.json`

`rateLimit()` menyimpan counter di variabel module-level (`Map`). Di lingkungan serverless (Vercel functions), setiap invocation berpotensi jalan di instance/container berbeda tanpa state yang di-share — sehingga rate limit pada `/api/auth/register` dan `/api/auth/login` **kemungkinan besar tidak efektif** membatasi brute-force di production. Perlu dipindah ke store terpusat (Redis/Upstash, atau tabel Postgres) kalau memang perlu proteksi brute-force yang serius.

---

## 🟡 BAGIAN 3 — Bug Minor / Reliabilitas

### 3.1 Registrasi tidak rollback kalau insert profile gagal
`apps/api/src/modules/auth/index.ts` baris 55–78: kalau insert ke `associates` atau `associate_profiles` gagal, error cuma di-`console.error`, sementara response tetap `{ success: true, message: 'Registrasi berhasil...' }`. User bisa punya akun Supabase Auth valid tapi tanpa baris associate — untung ada auto-create fallback di `GET /me` (baris 127–184) yang cukup defensif, tapi baiknya kegagalan ini dilaporkan/di-retry, bukan silently swallowed.

### 3.2 Tombol "Buat Akun" di halaman register tidak pernah menampilkan status loading
`apps/web/src/app/auth/register/page.tsx` — `setLoading(true)` tidak pernah dipanggil di `handleSubmit`, jadi user bisa klik submit berkali-kali sebelum request pertama selesai (potensi double-submit / race condition minor).

### 3.3 Upload foto profil kena bug yang sama persis dengan 1.1
`page.tsx` baris 188 — juga memanggil `/api/files/presign` yang tidak ada, dan pakai `presignData.data.storagePath` padahal field dari backend namanya `path`. Foto profil kemungkinan besar juga gagal ter-upload.

### 3.4 Kolom "Lupa Password" cuma placeholder
Tombol menampilkan pesan "Fitur ini akan segera tersedia" — bukan bug, tapi worth ditambahkan ke roadmap karena akan jadi titik keluhan user riil begitu ada yang lupa password.

---

## ✅ Yang Sudah Bagus (perlu diapresiasi juga)

- CRUD profile (experience, education, skill, certification, dst) **konsisten** men-scope query pakai `associate_id = user.id`, tidak ada IDOR di jalur ini.
- Middleware admin (`requireRole(['admin'])`) di `associate/routes.ts` diletakkan dengan urutan registrasi yang benar sehingga endpoint approve/reject/suspend/reactivate memang ter-proteksi dari associate biasa.
- Endpoint khusus CV (`/api/files/associate/:id/cv`) yang backend buat sudah menerapkan pola aman yang benar — tinggal disambungkan ke frontend.
- Validasi tipe & ukuran file untuk CV (PDF/DOC/DOCX, maks 10MB) konsisten di backend.
- Global error handler tidak membocorkan stack trace ke response 500 (`app.ts`).

---

## Prioritas Perbaikan yang Disarankan

1. **(Kritis, keamanan)** Tutup IDOR di `apps/api/src/modules/files/routes.ts` — tambahkan auth + ownership check di `/:id/view`, `/:id/download`, `/:id`, `DELETE /:id`, dan filter `owner_id` di list endpoint.
2. **(Kritis, fungsional)** Perbaiki `step-documents.tsx` agar memanggil endpoint CV yang sudah benar (`/api/files/associate/:id/cv`) alih-alih endpoint yang salah/tidak ada.
3. **(Kritis, fungsional)** Implementasikan auto-delete/soft-delete CV lama saat CV baru diupload — termasuk migrasi skema `associate_documents` untuk mendukung ini.
4. **(Tinggi, UX)** Manfaatkan seluruh hasil parsing AI (experience, education, skills) untuk auto-fill profil, bukan cuma nama.
5. **(Sedang)** Putuskan status alur onboarding wizard vs tab-based profile, lalu selaraskan dokumen dan implementasi.
6. **(Sedang)** Pindahkan rate limiting ke store persisten kalau target deploy tetap serverless.
7. **(Rendah)** Bersihkan `debug` payload dari response `parse-cv`, perbaiki bug loading state tombol register, dan foto profil.

Kalau mau, saya bisa langsung bantu implementasikan perbaikan untuk item #1–#3 (yang paling kritis dan langsung berdampak ke UX yang kamu prioritaskan) — tinggal bilang mau mulai dari yang mana.
