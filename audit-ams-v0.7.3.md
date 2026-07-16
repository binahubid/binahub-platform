# Audit AMS v0.7.3 — Verifikasi Perbaikan dari v0.7.0

**Tanggal:** 16 Juli 2026 · **Commit:** `6c593f8 v0.7.3-hotfix-social-links-400`
**Metodologi:** Setiap temuan kritis di audit v0.7.0 dicek ulang langsung ke kode (bukan cuma percaya CHANGELOG), plus scan kode baru yang ditambahkan di v0.7.1–v0.7.3.

---

## ✅ Status 8 Temuan Kritis/Tinggi dari Audit v0.7.0

| # | Temuan v0.7.0 | Status di v0.7.3 | Bukti |
|---|---|---|---|
| 1.1 | Delete-before-verify saat upload CV → risiko CV hilang | ✅ **Fixed dengan benar** | Alur dipecah jadi `POST /cv` (dapat presigned URL, insert file *pending*) → frontend cek `uploadRes.ok` → baru panggil `POST /cv/confirm` yang soft-delete CV lama. CV lama **tidak disentuh** kalau upload storage gagal. |
| 1.2 | Import CV: sekuensial, tanpa transaksi, gagal parsial disembunyikan | ✅ **Fixed dengan benar**, tapi ada catatan proses (lihat §2) | Diganti jadi satu panggilan `POST /api/associate/import-cv` → RPC PL/pgSQL `import_cv_data` (atomic, satu transaksi DB beneran). Error dari RPC sekarang di-`return` ke user, tidak ditelan `.catch(() => {})` lagi. |
| 1.3 | `GET /api/files/view-path` publik tanpa auth | ✅ **Fixed dengan benar** | File `private` sekarang wajib token (Bearer header atau `?token=` untuk `<img>` tag) + ownership check (`owner_id`/`uploaded_by`/admin) sebelum redirect ke signed URL. File `public` (avatar) tetap terbuka — pemisahan ini masuk akal. |
| 1.4 | `POST /api/files` tidak cek `ownerId` | ✅ **Fixed dengan benar** | Guard `if (validation.data.ownerId !== user.id && user.role !== 'admin') return 403` ditambahkan sebelum insert. |
| 3.1 | Assignment status: tanpa validasi urutan transisi | ✅ **Fixed dengan benar** | `transitionMap` eksplisit (`invited→accepted/declined`, `accepted→in_progress/withdrawn`, `in_progress→completed/withdrawn`, `completed/reviewed/declined/withdrawn` = terminal untuk associate). Transisi ilegal ditolak 400. |
| — | Field `certifications` hasil parsing AI dibuang | ✅ **Fixed** | Sekarang bagian dari payload `import-cv` dan RPC `import_cv_data` (poin 6 di SQL). |
| — | IDOR di `/:id`, `/:id/download`, `/:id/view`, `DELETE /:id` (dari audit sebelumnya) | ✅ Masih terjaga, tidak regresi | — |
| — | Rate limiter register/login masih `Map` in-memory | ❌ **Belum diperbaiki** | `apps/api/src/middleware/rate-limit.ts` tidak berubah sama sekali sejak v0.7.0 — masih pakai `Map` per-instance, tetap tidak reliable di serverless (Vercel). Ini satu-satunya item dari daftar prioritas lama yang **belum disentuh**. |

**Kesimpulan bagian ini: 7 dari 8 temuan kritis/tinggi sudah benar-benar diperbaiki di level kode (bukan cuma diklaim di changelog) — kualitas perbaikannya juga bagus (guard clause tepat sasaran, atomic transaction beneran, bukan tambal sulam).** Satu yang tersisa (rate limiter) masih perlu dikerjakan sebelum campaign pendaftaran associate disebar luas.

---

## ⚠️ Temuan Baru / Perlu Perhatian di v0.7.1–v0.7.3

### A. [Sedang] `import_cv_data` RPC di-deploy lewat file lepas, bukan migration resmi
**File:** `supabase_setup_batch4.sql` (root repo)

Fungsi RPC atomic yang jadi tulang punggung fix 1.2 **tidak ditaruh di `packages/database/migrations/`** (tempat migration resmi lain seperti `001_add_assessments.sql`), melainkan file lepas di root dengan instruksi "salin dan jalankan di SQL Editor Supabase Anda". Ini risiko operasional, bukan bug kode:
- Tidak versioned/tracked seperti migration lain → gampang lupa dijalankan saat deploy ke environment baru (staging, DR, dsb.), atau saat ada developer baru setup lokal.
- Kalau RPC ini belum ter-apply ke database produksi, endpoint `import-cv` akan gagal dengan error dari Supabase (`function import_cv_data does not exist`) — untungnya sekarang errornya **akan terlihat** oleh associate (bukan silent fail seperti versi lama), tapi tetap perlu dipastikan sudah dijalankan di semua environment.

**Rekomendasi:** Pindahkan ke `packages/database/migrations/002_import_cv_data_rpc.sql` dan masukkan ke proses migration/deploy otomatis (CI atau `supabase db push`), bukan manual copy-paste.

### B. [Rendah] Simpan social links di onboarding masih silent-fail
**File:** `apps/web/src/app/onboarding/page.tsx` baris 396–409 (`handleCompleteOnboarding`)

Langkah 1 (profile), 3 (availability), dan 4 (import-cv) di alur "simpan sekaligus di akhir" sudah benar: kalau gagal, `throw` dan proses berhenti + tampil pesan error ke user. Tapi langkah 2 (simpan LinkedIn/website) masih pola lama:
```js
await fetch(`${apiUrl}/api/associate/social-links`, {...}).catch((e) => console.error(...));
```
Kalau simpan link sosial gagal (misal validasi Zod di server berbeda dari validasi frontend), user tetap diarahkan lanjut ke step berikutnya seolah semuanya tersimpan — tidak konsisten dengan 3 langkah lain di fungsi yang sama.

**Rekomendasi:** Samakan pola dengan langkah lain — cek response, kalau gagal tampilkan error (atau minimal toast warning "profil tersimpan, tapi link sosial gagal disimpan" — jangan diam-diam).

### C. [Info] Klaim "satu transaksi terpadu" di CHANGELOG v0.7.2 sedikit lebih optimis dari implementasi
CHANGELOG bilang penyimpanan onboarding "ditulis ke server sekaligus menggunakan transaksi terpadu". Kenyataannya di kode: ini **4 request API terpisah** berurutan (profile → social links → availability → import-cv), dan hanya panggilan terakhir (import-cv) yang benar-benar satu DB transaction. Tidak ada bug nyata di sini — errornya sudah ditangani per-langkah dengan baik (kecuali poin B) — tapi istilah "transaksi terpadu" agak menyesatkan buat developer lain yang baca changelog dan berasumsi seluruh onboarding rollback otomatis kalau ada kegagalan di tengah. Kalau availability berhasil tersimpan lalu import-cv gagal, user akan retry dari awal (klik "Selesai" lagi) — cek dulu apakah retry ini aman (idempotent) untuk profile & availability yang sudah tersimpan (kemungkinan besar aman karena keduanya pakai upsert), tapi baiknya dikonfirmasi eksplisit.

### D. [Info] Orphan `files` row kalau associate batalkan upload CV di tengah jalan
Sejak fix 1.1, file CV baru di-insert ke tabel `files` di step presign (sebelum upload ke storage selesai). Kalau user menutup tab / koneksi putus **setelah** presign berhasil tapi **sebelum** confirm dipanggil, akan tersisa baris `files` berstatus "pending" yang tidak pernah dikonfirmasi (tidak match dokumen manapun, CV lama tidak terganggu — jadi tidak ada risiko kehilangan data, cuma sampah data kecil). Tidak urgent, tapi bisa jadi utang teknis kalau menumpuk — pertimbangkan cron pembersihan file `pending` yang lebih tua dari, katakanlah, 1 jam.

---

## 📋 Daftar Prioritas yang Tersisa

1. **[Tinggi]** Rate limiter register/login — ganti dari in-memory `Map` ke solusi shared-state (Upstash Redis / Vercel Edge Config) sebelum campaign pendaftaran associate disebar via WhatsApp/email.
2. **[Sedang]** Pindahkan `supabase_setup_batch4.sql` (RPC `import_cv_data`) ke folder migration resmi + proses deploy otomatis — pastikan sudah benar-benar ter-apply di database produksi saat ini.
3. **[Rendah]** Samakan error handling penyimpanan social links di onboarding dengan 3 langkah lain di fungsi yang sama.
4. **[Rendah/opsional]** Cron pembersihan baris `files` berstatus pending yang tidak pernah dikonfirmasi.

Item lama lain dari audit v0.7.0 yang sifatnya UX/roadmap (generate CV standar BinaHub untuk admin, alur ganti-CV 1-langkah tanpa harus hapus manual dulu) belum saya cek ulang di sesi ini — beri tahu saya kalau mau saya verifikasi juga.
