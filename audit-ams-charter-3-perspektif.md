# Audit AMS (ams.binahub.id) vs Project Charter — Sprint 1

**Basis evaluasi:** Project Charter BinaApps AMS (Bilal Dwi Nugraha, Faisal Alfarizi)
**Metode:** Code-level audit terhadap repo `binahubid/binahub-platform` (yang men-deploy ams.binahub.id)
**Catatan penting:** Audit ini dilakukan dengan membaca source code, **bukan** klik-langsung di browser (tidak ada akses browser live di sesi ini). Status di bawah adalah hasil menelusuri apa yang benar-benar akan terjadi kalau tombol/alur itu dijalankan. Disarankan 1 sesi quick manual test (~15 menit) untuk konfirmasi visual, khususnya poin 🔴.

**Legenda:** ✅ Sesuai charter &nbsp; ⚠️ Ada tapi bermasalah/tidak lengkap &nbsp; ❌ Tidak berfungsi / tidak ada

---

## 1️⃣ Perspektif Associate (User)

Dibandingkan dengan **Success Scenario** Charter langkah 1–7:

| # | Langkah di Charter | Status | Catatan |
|---|---|---|---|
| 1 | Associate menerima email/WA dari BinaHub | ⚠️ | Tidak ada fitur sistem untuk kirim undangan register (email/WA) ke calon associate. Fitur "invite" yang ada di admin panel hanya untuk mengundang associate **yang sudah terdaftar** ke sebuah assignment/project — beda konteks. Proses undang saat ini 100% manual di luar sistem. |
| 2 | Buka halaman pendaftaran | ✅ | `/register` → `/auth/register` jalan normal. |
| 3 | Buat akun pakai email pribadi | ✅ | Register via Supabase Auth + validasi password (min. 8 karakter) berfungsi. |
| 4 | Melengkapi profil profesional | ✅ | CRUD experience/education/skill/certification semua berfungsi dan aman (scoped per user). |
| 5 | **Mengunggah CV** | ❌ | **Tidak berfungsi.** Frontend memanggil endpoint yang salah (`/api/files/presign`, seharusnya `/api/files/presigned-url`) dengan field yang tidak cocok dengan skema backend. Upload akan gagal (404 lalu 400). |
| 6 | **Sistem bantu isi profil dari CV** | ⚠️ | AI parsing di backend sudah bisa ekstrak nama, skill, pengalaman, pendidikan, sertifikasi — tapi frontend cuma mengisi **nama saja** ke form. 90% hasil parsing dibuang. (Ini pun tidak akan pernah ke-trigger di production selama poin 5 masih rusak, karena parsing butuh CV yang sudah tersimpan.) |
| 7 | Associate mengirimkan profil | ✅ | Endpoint submit ada dan berfungsi (mengubah status ke `pending_review`). |

**Temuan tambahan di luar 7 langkah:**
- Halaman `/onboarding` (yang di Charter/dokumen internal digambarkan sebagai wizard 8-langkah) ternyata cuma redirect kosong ke `/dashboard` — associate baru mendarat tanpa dituntun.
- Fitur "hapus otomatis CV lama saat diganti" belum ada — bahkan tabel `associate_documents` di database tidak punya kolom untuk soft-delete. CV lama menumpuk selamanya.
- Upload foto profil kena bug yang sama persis dengan upload CV (endpoint & field mismatch).
- **Keamanan:** endpoint `GET /api/files/:id/view` bisa diakses **tanpa login**, dan endpoint download/hapus file lain tidak mengecek kepemilikan — associate lain berpotensi melihat/menghapus dokumen pribadi (CV, KTP) associate lain.

**Kesimpulan associate:** Langkah paling krusial di Charter (upload CV → auto-fill profil) adalah bagian yang **paling rusak**. Associate baru saat ini praktis tidak bisa menyelesaikan Success Scenario end-to-end tanpa upload CV manual gagal.

---

## 2️⃣ Perspektif Admin

Dibandingkan Ruang Lingkup Sprint 1 bagian Admin:

| Kebutuhan Charter | Status | Catatan |
|---|---|---|
| Melihat daftar associate | ✅ | `GET /api/admin/associates`, lengkap dengan skor "completeness" profil per associate — bagus, ini fitur ekstra yang bagus, sejalan dengan prinsip "database talent terstruktur". |
| Membuka profil associate | ✅ | `GET /api/admin/associates/:id` — data lengkap (experience, education, skill, dst). |
| Melakukan pencarian data | ⚠️ | Search by nama/email jalan, tapi ada bug kecil: saat search aktif, parameter `limit`/`offset` (pagination) diabaikan — bisa jadi masalah kalau hasil pencarian banyak. |
| Approve/reject associate | ⚠️ | **Ada 2 jalur approve yang tidak sinkron:** (a) `PATCH /admin/associates/:id/review` — yang dipakai di UI, mencatat ke tabel review tapi **tidak** memicu event notifikasi/sync. (b) `POST /associate/:id/approve` — memicu event notifikasi tapi **tidak** dipakai UI sama sekali (dead code). Efeknya: pipeline notifikasi approval (`AssociateApproved` → email ke associate) **tidak pernah jalan** di alur yang sebenarnya dipakai. (Catatan: email service-nya sendiri juga masih `TODO` di kode, belum diimplementasi.) |
| Unduh/generate CV standar BinaHub | ✅ (partial) | Ada halaman generate CV dari data profil (`admin/associates/[id]/cv`) — tapi ini CV yang di-generate ulang dari data terstruktur, bukan file PDF asli yang diupload associate. Wajar untuk fitur "Dynamic CV Generator" di roadmap, tapi perlu dipastikan Pak Bilal tahu ini beda dari "CV asli associate". |

**Temuan tambahan:**
- Filter dokumen "sudah dihapus" di halaman detail associate (`documents.filter(d => !d.deleted_at)`) sebenarnya **tidak pernah efektif**, karena kolom `deleted_at` memang tidak ada di tabel dokumen — konsisten dengan temuan di sisi associate soal CV lama yang tidak pernah terhapus.
- Dashboard admin (`/stats`) sudah menghitung metrik berguna: total associate, pending review, profil belum lengkap, CV diupload hari ini — bagus untuk operasional harian, meski akurasi "CV uploaded today" jadi meragukan selama upload CV sendiri rusak.

**Kesimpulan admin:** Fondasi admin (lihat, cari, buka profil) sudah solid dan sejalan Charter. Tapi ada retak di alur approval (2 jalur tidak sinkron) dan data yang ditampilkan (jumlah CV/dokumen) bisa menyesatkan karena mengandalkan fitur yang belum utuh di sisi associate.

---

## 3️⃣ Perspektif Manajemen (Pak Bilal)

Dibandingkan **Tujuan Project** dan **Definition of Success**:

| Kriteria Charter | Status | Catatan |
|---|---|---|
| "Input Once. Use Everywhere." | ⚠️ | Prinsipnya sudah terlihat di desain schema (associate → project → assignment semua rujuk 1 sumber data associate) — arsitekturnya benar. Tapi karena CV upload & auto-fill rusak, associate **belum bisa** "input sekali" secara efisien; mereka harus isi manual semua field satu-satu, bertentangan langsung dengan prinsip inti ini. |
| Portal dapat diakses & associate bisa daftar+login | ✅ | Berfungsi. |
| Associate bisa mengisi profil, data tersimpan baik | ✅ (manual) / ❌ (CV) | Manual entry berfungsi baik. Tapi jalur "cepat" (upload CV → auto-isi) — yang justru paling penting untuk mengurangi friksi pendaftaran massal — tidak berfungsi. |
| Admin bisa lihat semua data associate | ✅ | Berfungsi baik, bahkan dengan fitur completeness score yang bagus. |
| Portal siap dipakai untuk pendaftaran massal via email/WA | ⚠️ | Secara teknis portal-nya bisa dipakai, tapi **belum ada fitur invite otomatis** dari sistem, dan risiko besar: kalau associate diundang massal sekarang, mayoritas akan **stuck di langkah upload CV** — berpotensi menciptakan kesan buruk di gelombang pertama associate (padahal ini justru momen paling penting untuk kesan pertama, sesuai penekanan dokumen internal kalian sendiri soal onboarding). |
| Fondasi mudah dikembangkan ke roadmap berikutnya | ✅ | Struktur modular (associate/admin/files/ai/reviews terpisah rapi), event-queue based architecture (`event_queue`, `event-processor.ts`) untuk async processing — desain ini **sudah tepat** untuk roadmap Project Management, Assignment Letter, Performance Evaluation, AI Talent Matching. Ini kabar baik: fondasi jangka panjangnya kuat, masalah saat ini lebih ke bug eksekusi di detail, bukan salah arsitektur. |
| AI membantu otomatisasi, bukan gantikan keputusan manusia | ✅ | Sesuai — AI parsing CV cuma usul isian, approve/reject tetap manual oleh admin. Prinsip ini dipegang dengan benar secara desain. |

**Kesimpulan manajemen:** **Arsitektur dan fondasi jangka panjang sudah dibangun dengan benar** sesuai visi Charter — ini kabar baik untuk keputusan strategis ke depan. Tapi **Sprint 1 belum bisa dinyatakan "berhasil"** menurut Definition of Success sendiri, karena jalur upload CV (yang justru disebut eksplisit di Success Scenario sebagai langkah 5–6) tidak berfungsi. Ini bukan masalah arsitektur besar — perbaikannya relatif sempit (salah endpoint + field, bukan salah desain) — tapi berdampak besar ke pengalaman associate pertama.

---

## Ringkasan Satu Halaman (untuk dibaca cepat)

🟢 **Yang sudah kuat:** akun & login, isi profil manual, admin lihat/cari data, arsitektur jangka panjang, prinsip AI-assist.

🔴 **Yang menghalangi Definition of Success Sprint 1:**
1. Upload CV gagal total (mismatch endpoint/field frontend↔backend)
2. Auto-fill profil dari CV cuma isi nama, sisanya kebuang
3. Auto-delete CV lama belum ada (bahkan di skema DB)
4. Dua jalur approve admin yang tidak sinkron → notifikasi approval associate tidak pernah terkirim

🟡 **Perlu didiskusikan (bukan bug, tapi gap terhadap Charter):**
- Belum ada fitur invite/undangan otomatis dari sistem
- Wizard onboarding 8-langkah yang dijanjikan dokumen internal ternyata jadi stub kosong

**Rekomendasi urutan perbaikan sebelum undang associate secara massal:** perbaiki 4 poin 🔴 dulu (estimasi ini bug yang tergolong "sempit tapi dalam" — bukan re-arsitektur, jadi realistis dikejar cepat), baru pertimbangkan gelombang undangan pertama.
