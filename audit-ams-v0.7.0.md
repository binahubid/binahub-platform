# Audit AMS v0.7.0 — `binahubid/binahub-platform`

**Tanggal audit:** 16 Juli 2026 · **Commit:** `c7701b8 update v0.7.0` · **Basis evaluasi:** Project Charter BinaApps AMS (Bilal Dwi Nugraha / Faisal Alfarizi)
**Fokus:** (1) Associate onboarding — register, profil, CV; (2) Assignment lifecycle — invite → accept/reject → kerja → submit → review

> Catatan konteks: repo ini sudah punya 2 audit sebelumnya (`audit-binahub-platform-associate-flow.md`, tertanggal 13 Juli / v0.4–0.5) yang menemukan bug kritis di upload CV, auto-delete, dan IDOR. Audit ini **memverifikasi ulang dari kode aktual v0.7.0** — beberapa sudah diperbaiki, beberapa belum, dan ada temuan baru dari fitur yang ditambahkan di v0.6.0–v0.7.0.

---

## 🚦 Ringkasan Cepat (buat developer yang buru-buru)

| # | Item | Status v0.7.0 | Severity |
|---|---|---|---|
| 1 | Upload CV: endpoint frontend↔backend nyambung | ✅ **Fixed** | — |
| 2 | Auto-delete CV lama saat upload baru | ✅ **Fixed** (server-side, di dalam endpoint upload) | — |
| 3 | Auto-fill profil dari hasil parsing CV | ✅ **Fixed**, dengan preview & konfirmasi | — |
| 4 | Field `certifications` hasil parsing AI tidak pernah dipakai | 🟡 **Baru ditemukan** | Sedang |
| 5 | Delete-before-verify saat upload CV → risiko CV hilang permanen jika upload storage gagal | 🔴 **Baru ditemukan** | **Kritis** |
| 6 | Import CV: 8+ request sekuensial tanpa transaksi/rollback, gagal parsial disembunyikan | 🔴 **Baru ditemukan** | **Kritis** |
| 7 | `GET /api/files/view-path` — tanpa auth, tanpa ownership check | 🔴 **Baru ditemukan** | **Kritis** |
| 8 | `POST /api/files` (register file generik, dipakai sertifikat & portofolio) tidak verifikasi `ownerId` = user pemanggil | 🔴 **Baru ditemukan** | **Kritis** |
| 9 | IDOR di endpoint file lama (`/:id`, `/:id/download`, `/:id/view`, `DELETE /:id`) | ✅ **Fixed** — sudah ada ownership check konsisten | — |
| 10 | Rate limiter berbasis in-memory `Map` — tidak efektif di serverless | 🔴 **Belum diperbaiki** | Tinggi |
| 11 | `PATCH /api/associate/assignments/:id/status` tanpa validasi transisi state machine | 🟡 **Baru ditemukan** | Sedang |
| 12 | Halaman `/onboarding` | ✅ Sudah dibangun penuh (bukan stub kosong lagi) | — |
| 13 | Admin: generate CV standar BinaHub dari data associate | ⚪ **Belum ada** (charter tandai opsional utk Sprint 1) | Info |
| 14 | Storage file lama tidak dihapus fisik saat soft-delete CV (hanya soft-delete DB) | 🟡 Minor — biaya storage menumpuk | Rendah |

---

## 🔴 BAGIAN 1 — Temuan Kritis Baru

### 1.1 Upload CV: old file dihapus *sebelum* dipastikan file baru berhasil tersimpan
**File:** `apps/api/src/modules/files/routes.ts` baris 356–477 (`POST /associate/:id/cv`)

Urutan operasi saat ini:
1. Soft-delete semua CV lama di tabel `files` (baris 394–401)
2. **Hard-delete** baris CV lama di `associate_documents` (baris 403–407) — permanen, tidak bisa di-undo
3. Baru setelah itu buat presigned URL (baris 410–412) dan insert record file baru (419–435)

Masalahnya: frontend (`step-documents.tsx` baris ~108) melakukan `PUT` ke `presignedUrl` **tanpa mengecek status response**:
```js
await fetch(presignData.data.presignedUrl, { method: 'PUT', ... }); // hasil tidak dicek sama sekali
```
Kalau `createSignedUploadUrl` gagal, atau PUT ke storage gagal (koneksi putus, file kena reject storage provider, dll), associate akan kehilangan CV lama secara permanen padahal CV baru **tidak pernah benar-benar tersimpan**. Ini persis kebalikan dari requirement "hapus otomatis cv saat cv diganti" — yang diminta adalah replace yang aman, bukan delete-first-and-hope.

**Rekomendasi:**
- Balik urutan: upload dulu ke storage → verifikasi sukses (cek `res.ok` di frontend + idealnya verifikasi keberadaan objek di backend) → baru soft-delete yang lama.
- Atau bungkus dalam DB transaction dan simpan CV lama sampai file baru dikonfirmasi ter-upload (mis. lewat webhook/second call `PATCH .../confirm`).

### 1.2 Import hasil parsing CV: tanpa transaksi, kegagalan parsial disembunyikan dari user
**File:** `apps/web/src/app/dashboard/profile/page.tsx` baris 296–421 (`executeImport`)

Alurnya: hapus semua experience/education/skill/language lama satu per satu (`.catch(() => {})` — error ditelan diam-diam) → lalu insert semua data baru satu per satu (`.catch(e => console.error(...))` — error cuma masuk console, tidak pernah sampai ke user). Di akhir, apa pun hasilnya, selalu muncul toast **"Profil berhasil diperbarui dengan data CV yang baru!"**.

Efek nyata: kalau koneksi putus di tengah loop, atau salah satu insert gagal validasi (misal tanggal format salah dari hasil parsing AI), associate akan:
- Kehilangan data lama (sudah terhapus)
- Tidak dapat semua data baru (sebagian gagal insert)
- **Tidak tahu ada yang salah**, karena UI bilang sukses

Ini juga N+M sequential API calls (bisa 15-20+ request berurutan untuk CV dengan banyak pengalaman kerja) — lambat dan makin besar window kegagalan di tengah jalan.

**Rekomendasi:** Buat satu endpoint backend `POST /api/associate/import-cv` yang menerima seluruh payload dan mengeksekusinya dalam satu DB transaction (rollback penuh kalau ada yang gagal), balikan hasil sukses/gagal yang jujur ke frontend.

### 1.3 `GET /api/files/view-path` — endpoint publik tanpa autentikasi maupun ownership check
**File:** `apps/api/src/modules/files/routes.ts` baris 126–146

```ts
fileRoutes.get('/view-path', async (c) => {   // ⚠️ tidak ada authMiddleware
  const path = c.req.query('path');
  ...
  const { data } = await db.storage.from('ams-files').createSignedUrl(path, 3600);
  return c.redirect(data.signedUrl);
});
```
Siapa pun yang tahu (atau menebak/mendapat bocoran) `storage path` sebuah file — termasuk CV, KTP, sertifikat, dokumen pribadi lain — bisa mendapatkan signed URL download tanpa login sama sekali. Ini beda dari endpoint `/:id/view` yang sudah benar (ownership check ada di baris 221–256).

**Rekomendasi:** Tambahkan `authMiddleware` + ownership check yang sama seperti endpoint `/:id/view`, atau hapus endpoint ini kalau memang tidak dipakai lagi (cek dulu apakah masih direferensikan di frontend).

### 1.4 `POST /api/files` (endpoint registrasi file generik) tidak memverifikasi kepemilikan `ownerId`
**File:** `apps/api/src/modules/files/routes.ts` baris 83–120

Endpoint ini aktif dipakai untuk upload lampiran sertifikasi & portofolio (lihat CHANGELOG v0.6.0). Body `ownerId`/`ownerType` dikirim mentah-mentah dari client dan langsung di-insert tanpa pengecekan apakah `user.id === ownerId` (atau admin). Associate A yang login bisa, secara teknis, mengirim `ownerId` = associate B lalu mendaftarkan file ke profil B (menempel dokumen palsu/sampah ke profil orang lain), karena tidak ada guard sama sekali di jalur ini — beda dengan endpoint CV khusus (`/associate/:id/cv`) yang sudah benar mengecek `user.id !== associateId && role !== 'admin'`.

**Rekomendasi:** Tambahkan pengecekan yang sama persis seperti di endpoint CV: `if (user.id !== validation.data.ownerId && user.role !== 'admin') return 403`.

---

## 🟠 BAGIAN 2 — Sudah Diperbaiki Sejak Audit Sebelumnya (verifikasi baris kode)

| Temuan lama | Bukti fix di v0.7.0 |
|---|---|
| Upload CV 404/400 karena field & path tidak nyambung | `step-documents.tsx` sekarang memanggil langsung `POST /api/files/associate/${id}/cv`, cocok dengan backend |
| Auto-delete CV lama belum ada sama sekali | `routes.ts` baris 394–407 sekarang soft-delete `files` + hard-delete `associate_documents` sebelum insert baru (tapi lihat 1.1 — urutannya masih berisiko) |
| Parsing CV cuma isi field `name` | `executeImport()` sekarang import `fullName, phone, city, headline, bio, experience[], education[], skills[], languages[]` dengan preview & konfirmasi user dulu |
| IDOR di `GET /:id`, `/:id/download`, `/:id/view`, `DELETE /:id` | Semua sekarang punya `if (data.owner_id !== user.id && data.uploaded_by !== user.id && user.role !== 'admin') return 403` |
| Halaman `/onboarding` cuma redirect kosong | Sudah jadi flow lengkap (`checklist.tsx`, `context.tsx`, multi-step) |
| Worker routes tanpa auth (`process-events`) | Sudah dilindungi `authMiddleware` + `requireRole(['admin'])` (v0.4.0) |
| `/logout` error karena salah client Supabase | Sudah pakai service-role client yang benar (v0.4.0) |

**Yang belum diperbaiki:**
- **Rate limiter** (`apps/api/src/middleware/rate-limit.ts`) masih pakai `Map` in-memory per-instance. Di Vercel serverless, tiap invocation berpotensi girang instance baru tanpa state bersama → limit `max` per `windowMs` **tidak benar-benar ditegakkan** lintas request, terutama untuk endpoint register/login yang rawan brute-force atau spam pendaftaran palsu. Kalau butuh cepat: pindahkan ke Redis/Upstash atau ke rate-limiting bawaan Supabase/Vercel edge config.

---

## 🟡 BAGIAN 3 — Temuan Baru Terkait Fitur Assignment (v0.6.0–v0.7.0)

### 3.1 `PATCH /api/associate/assignments/:id/status` tidak menjaga urutan state machine
**File:** `apps/api/src/modules/associate/routes.ts` baris 1527–1579

Endpoint menerima status apa saja dari `['accepted', 'declined', 'in_progress', 'completed', 'withdrawn']` dan langsung `UPDATE` tanpa mengecek status *sebelumnya*. Associate yang masih di status `invited` bisa langsung PATCH ke `completed` lewat DevTools/Postman, melewati `accepted` → `in_progress`. Tidak berbahaya secara keamanan (hanya mempengaruhi data milik sendiri), tapi merusak integritas data laporan progres yang ditampilkan di dashboard admin (progress bar 5 langkah yang baru dibangun di v0.7.0 justru bisa jadi tidak akurat).

**Rekomendasi:** Tambah whitelist transisi valid per status saat ini (mis. `invited → accepted|declined`, `accepted → in_progress|withdrawn`, `in_progress → completed`), tolak transisi lain dengan 400.

### 3.2 Status `reviewed` (dipakai fitur review admin baru) tidak ada di endpoint associate — cek konsistensi
Console review admin (v0.7.0) mengubah status ke `reviewed` atau kembali ke `in_progress` untuk revisi (lihat CHANGELOG). Pastikan endpoint admin yang menangani ini (`PATCH /api/admin/assignments/:id/assignees/:aid`, baris 715) memang tidak overlap/race dengan endpoint associate di atas — kalau associate submit ulang laporan (`completed`) di saat bersamaan admin sedang mereview, siapa yang menang tidak diatur eksplisit (no optimistic locking / version check).

### 3.3 Admin bisa invite associate berkali-kali ke assignment yang sama?
`POST /api/admin/assignments/:id/invite` (baris 601) hanya cek "semua associate sudah diinvite" secara agregat (baris 632), tapi tidak terlihat unique constraint di level DB pada `(assignment_id, associate_id)` untuk `assignment_assignees`. Perlu dicek langsung ke schema — kalau tidak ada, race condition (double-click invite) bisa menghasilkan baris duplikat.

---

## 📋 BAGIAN 4 — Audit 3 Perspektif vs Project Charter

### 👤 Perspektif Associate (Pengguna)
Charter minta: *register → buat akun → lengkapi profil → upload CV → sistem bantu isi profil dari CV → kirim profil*.

| Item Charter | Status | Catatan |
|---|---|---|
| Registrasi & login email pribadi | ✅ Berfungsi | `apps/web/src/app/auth/register` |
| Upload CV mudah | ✅ Berfungsi (single-click, drag pattern jelas) | Tapi lihat risiko 1.1 di atas — kalau gagal di tengah, CV bisa hilang tanpa pesan error yang jujur |
| Isi profil otomatis dari CV | ✅ UX sudah bagus — preview + konfirmasi sebelum overwrite | Field `certifications` hasil AI dibuang percuma (temuan 1.4/§1) |
| Edit profil manual | ✅ Berfungsi, 7 langkah step editor | — |
| Hapus otomatis CV lama saat ganti | ⚠️ Ada, tapi urutan operasinya berisiko (§1.1) | Dari sisi associate: **tidak terlihat** ada tombol "ganti CV" langsung — associate harus hapus manual dulu (klik ikon sampah) baru bisa upload baru. Charter minta pengalaman "mulus"; alur 2 langkah (hapus → upload) ini kurang mulus dibanding "pilih file baru langsung replace". |
| Terima/tolak assignment | ✅ Ada (`apply`, `status` PATCH) | Tapi tanpa validasi urutan (§3.1) — associate bisa mengacaukan status sendiri secara tidak sengaja |
| Lapor & submit hasil kerja | ✅ v0.7.0 menambahkan formulir laporan visual (foto lapangan + ringkasan) | Fitur baru, styling bagus, belum ada bukti test end-to-end untuk file besar (attachment laporan) |

### 🛠️ Perspektif Admin
Charter minta: *lihat daftar associate, buka profil, cari data, (opsional) generate CV standar*.

| Item Charter | Status | Catatan |
|---|---|---|
| Lihat daftar & cari associate | ✅ v0.7.0 menambahkan "smart search" gabungan (nama/email/skill/kota/dll) | Peningkatan nyata dari versi sebelumnya |
| Buka detail profil associate | ✅ Ada, termasuk breadcrumb & share profile | — |
| Download dokumen associate | ✅ Ada tombol download di detail | Tapi terekspos lewat celah §1.3 kalau path bocor — cek juga apakah tombol "share profile" (baru) memakai endpoint publik ini |
| Generate CV standar BinaHub dari data associate | ❌ Belum ada | Charter tandai ini opsional untuk Sprint 1 ("apabila memungkinkan"), jadi bukan blocker — tapi worth di-planning untuk sprint berikut karena masuk roadmap "Dynamic CV Generator" |
| Kelola assignment (buat, invite, assignee) | ✅ Redesain besar di v0.7.0 — kanban card, progress 5-langkah, review console | UX admin jauh lebih baik dari versi lama; state-machine di baliknya perlu diperkuat (§3) |
| Rekomendasi kandidat berbasis AI (fitur baru v0.7.0) | ✅ Ada (`rankCandidates`, 1–100%) | Fitur baru di luar scope charter awal — nilai tambah, tapi pastikan skor AI tidak dipakai sebagai satu-satunya dasar keputusan (charter eksplisit: "AI membantu, bukan menggantikan pengambilan keputusan manusia" — perlu dicek copy UI-nya tidak menyesatkan admin seolah skor = keputusan final) |

### 🏢 Perspektif Manajemen (Project Owner / IT Lead)
Charter minta fondasi *"Input Once. Use Everywhere."*, basis data terpusat, siap dikembangkan untuk roadmap (Project Management, Assignment Letter, Performance Evaluation, Dynamic CV Generator, AI Talent Matching).

- **Prinsip "Input Once. Use Everywhere."** — sebagian besar terpenuhi: data profil, skill, pengalaman dipakai lintas modul (dashboard, admin, capability radar, rekomendasi AI). Tapi ada duplikasi sumber data antara tabel `files` dan `associate_documents` yang **tidak sepenuhnya tersinkron** (soft-delete di satu sisi, hard-delete di sisi lain) — ini melanggar semangat "satu sumber kebenaran" dan berisiko jadi utang teknis saat modul berikutnya (mis. Dynamic CV Generator) butuh baca data dokumen.
- **Kesiapan untuk roadmap berikutnya:**
  - *AI-assisted Talent Matching* — pondasinya sudah mulai dibangun lebih awal dari rencana (fitur `rankCandidates` di v0.7.0), bagus untuk kecepatan tapi pastikan tidak mendahului kematangan data (banyak field masih opsional/belum divalidasi wajib, hasil rekomendasi AI bisa bias kalau data profil belum lengkap).
  - *Assignment Letter & Performance Evaluation* — modul assignment sudah cukup matang jadi fondasi (assignee lifecycle, review workflow ada), tapi state machine yang longgar (§3.1) sebaiknya dirapikan dulu sebelum modul evaluasi performa dibangun di atasnya — supaya data historis assignment yang jadi dasar evaluasi tidak tercemar transisi status yang tidak valid.
- **Risiko keamanan yang perlu perhatian segera dari IT Lead** (§1.3, §1.4): dua celah *broken access control* pada endpoint file yang menyimpan dokumen pribadi (CV, kemungkinan KTP/sertifikat) — ini kategori risiko yang biasanya perlu ditutup sebelum onboarding associate dalam jumlah besar melalui kampanye email/WhatsApp (Success Scenario poin 1 di charter), karena volume data pribadi yang tersimpan akan naik cepat begitu campaign jalan.
- **Rate limiter tidak efektif** relevan langsung dengan Success Scenario: begitu link pendaftaran disebar luas via WhatsApp/email, endpoint register jadi target realistis untuk spam/bot tanpa proteksi yang benar-benar jalan di lingkungan serverless.

---

## ✅ Prioritas Perbaikan yang Disarankan (urut dari paling mendesak)

1. **[Kritis-Keamanan]** Tutup `GET /api/files/view-path` (§1.3) dan tambah ownership check di `POST /api/files` (§1.4) — dua-duanya menyangkut dokumen pribadi associate.
2. **[Kritis-Data]** Perbaiki urutan delete-then-upload di endpoint upload CV (§1.1) agar tidak ada window kehilangan data.
3. **[Kritis-UX/Data]** Pindahkan proses import hasil parsing CV (§1.2) ke satu endpoint backend transactional, hentikan pesan "berhasil" palsu saat ada kegagalan parsial.
4. **[Tinggi]** Ganti rate limiter in-memory dengan solusi yang benar-benar shared-state di serverless, sebelum campaign pendaftaran associate diluncurkan.
5. **[Sedang]** Tambahkan validasi transisi status assignment (§3.1) dan cek unique constraint invite (§3.3).
6. **[Sedang]** Manfaatkan field `certifications` hasil parsing AI yang sekarang dibuang (§1.4 di ringkasan tabel).
7. **[Rendah]** Sederhanakan alur ganti CV di sisi associate jadi satu langkah (upload langsung replace, bukan hapus-dulu-baru-upload) agar sesuai semangat "UX harus mulus" di charter.
8. **[Info/Roadmap]** Rencanakan modul generate CV standar BinaHub untuk admin di sprint berikutnya (item opsional charter, belum ada implementasinya).
