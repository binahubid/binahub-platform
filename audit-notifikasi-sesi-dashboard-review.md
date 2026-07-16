# Audit Fitur: Notifikasi, Sesi Login, Dashboard & Sistem Review — AMS v0.7.3

**Tanggal:** 16 Juli 2026 · **Commit:** `6c593f8 v0.7.3-hotfix-social-links-400`
**Scope:** Notifikasi (admin & associate), persistensi sesi login, dashboard, dan alur review admin atas hasil kerja associate.

---

## 🚦 Ringkasan Cepat

| Area | Kondisi | Severity |
|---|---|---|
| Notifikasi associate: sumber data | Hanya undangan assignment — bukan tabel notifikasi sungguhan | **Tinggi** |
| Notifikasi associate: **tidak ada alert saat admin selesai mereview** | Associate tidak pernah diberi tahu hasil laporan mereka disetujui/diminta revisi | **Kritis** |
| Notifikasi admin: **tidak ada alert saat associate submit laporan** | Admin harus cek manual satu-satu, tidak ada sinyal "ada laporan menunggu review" | **Kritis** |
| Notifikasi admin: badge count "unread" tidak pernah berkurang | Bukan penghitung unread sungguhan, cuma total kejadian historis | **Tinggi** |
| Notifikasi associate: badge count pakai localStorage device-specific | Ganti device/browser → hitungan tidak akurat | **Sedang** |
| N+1 query di endpoint notifikasi admin & associate | Puluhan-ratusan round-trip DB per load | **Sedang (performa)** |
| Sesi login bertahan setelah browser ditutup | ✅ Sudah benar secara default (Supabase `persistSession`) | — |
| Multiple Supabase client instance di berbagai halaman | Anti-pattern resmi tidak didukung Supabase, berisiko auth state tidak sinkron | **Sedang** |
| Tidak ada penanganan token expired (401) di frontend | Sesi bisa terlihat "putus" di tengah pemakaian tanpa auto-recovery | **Sedang** |
| Tidak ada Next.js middleware / SSR guard | Proteksi rute murni di client, halaman sempat "kosong" sebelum redirect | **Rendah** |
| Halaman detail assignment associate: status `reviewed` **tidak punya tampilan sama sekali** | Associate yang laporannya sudah disetujui tidak lihat konfirmasi, cuma teks mentah "reviewed" | **Tinggi** |
| Dashboard admin (`/stats`): tidak ada KPI "laporan menunggu review" | Selaras dengan gap notifikasi — tidak ada sinyal apa pun di manapun | **Tinggi** |
| Dashboard admin: hitung profil belum lengkap dengan loop JS atas seluruh baris | Tidak scalable seiring jumlah associate bertambah | **Rendah** |

---

## 1️⃣ Notifikasi — Associate

**File:** `apps/api/src/modules/associate/routes.ts` baris 1642–1742

### Temuan 1.1 [Kritis] Tidak ada notifikasi saat admin selesai mereview laporan
Endpoint `GET /api/associate/notifications` **hanya membaca tabel `assignment_assignees`** dan membangun notifikasi jenis `invitation` dari situ. Tidak ada logika apa pun yang membuat entri notifikasi baru ketika admin mengubah `evidence_reviewer_notes` / status assignee jadi `reviewed` atau balik ke `in_progress` untuk revisi (endpoint `PATCH /api/admin/assignments/:id/assignees/:aid`, sudah dicek — endpoint itu **tidak menyentuh `notification_read_at` sama sekali**).

Akibatnya: associate memang **bisa melihat** catatan revisi kalau mereka buka sendiri halaman detail assignment (lihat temuan 4.2), tapi **tidak pernah diberi tahu** bahwa ada review baru yang perlu mereka lihat. Ini persis kebalikan dari yang diminta: *"admin harus bisa memberikan review saat associate menyelesaikan assignmentnya"* — memberikan review-nya sudah bisa, tapi **associate tidak tahu review itu ada** kecuali mereka rutin cek manual satu per satu assignment.

**Rekomendasi:** Buat tabel `notifications` sungguhan (lihat rekomendasi arsitektur di bagian akhir) dan insert baris baru setiap kali `evidence_reviewer_notes`/status berubah di endpoint admin tersebut.

### Temuan 1.2 [Sedang] N+1 query pada list notifikasi
Untuk setiap baris undangan (maks 50), dilakukan 1 query tambahan `SELECT` ke tabel `assignments` di dalam loop `for` (baris 1655–1659) — bukan satu query `IN (...)` sekali jalan. Bisa sampai 51 round-trip DB untuk satu kali buka halaman notifikasi.

### Temuan 1.3 [Sedang] Penghitung "unread" ganda dan tidak konsisten
- Backend: `GET /notifications/count` (baris 1707) menghitung baris `assignment_assignees` dengan `notification_read_at IS NULL` — ini sumber kebenaran server yang valid.
- Tapi **frontend** (`apps/web/src/app/dashboard/layout.tsx`, fungsi `fetchNotifCount`) melakukan pengurangan tambahan: `total dari server − jumlah ID di localStorage key 'assoc_notif_read_ids'`. Ini dua mekanisme "sudah dibaca" yang berjalan sendiri-sendiri dan tidak saling sinkron:
  - Kalau associate login dari HP baru / browser lain, localStorage kosong → badge menampilkan angka yang salah (bisa lebih tinggi dari yang sebenarnya, atau tidak konsisten dengan device lain).
  - Pengurangannya murni aritmatika jumlah (`Math.max(0, total - readIds.length)`), tidak mencocokkan ID spesifik — jadi kalau ada notifikasi unread baru yang belum pernah dilihat di device manapun, angkanya tetap bisa keliru dikurangi oleh sisa `readIds` lama yang tidak relevan.

**Rekomendasi:** Hapus mekanisme localStorage ini, percaya sepenuhnya pada `notification_read_at` di server (yang sudah benar), dan pastikan `POST /notifications/:id/read` dipanggil setiap kali associate membuka notifikasi (bukan disimpan lokal).

---

## 2️⃣ Notifikasi — Admin

**File:** `apps/api/src/modules/admin/index.ts` baris 1054–1229

### Temuan 2.1 [Kritis] Tidak ada notifikasi/alert saat associate submit laporan (`completed`)
Query `GET /api/admin/notifications` hanya mengambil assignee dengan status `['accepted', 'in_progress']` (diterima), `'declined'` (ditolak), dan `'applied'` (melamar sendiri). **Status `'completed'` — yaitu momen persis associate menekan tombol submit laporan akhir — tidak pernah muncul di feed notifikasi admin.**

Ini adalah gap paling kritis dari sisi alur yang diminta: *"associate mengsubmit hasil kerja ... kemudian admin akan mereview hasil pekerjaanya."* Admin tidak mendapat sinyal apa pun bahwa ada laporan baru masuk yang menunggu direview — mereka harus secara proaktif membuka setiap assignment satu per satu untuk mengecek apakah ada yang statusnya berubah jadi "Laporan Dikirim". Untuk BinaHub yang associate-nya akan terus bertambah (sesuai roadmap Charter), ini akan jadi bottleneck operasional nyata: laporan bisa "hilang" tanpa terlihat berhari-hari.

### Temuan 2.2 [Tinggi] Badge count admin bukan unread counter — cuma total historis
`GET /api/admin/notifications/count` (baris 1200) menjumlahkan **semua** assignee dengan status `applied` + `accepted` + `declined` yang pernah di-invite admin tersebut — tanpa filter waktu atau status "read". Tidak ada cara untuk menandai notifikasi admin sebagai "sudah dibaca" (tidak ada endpoint `POST /admin/notifications/:id/read` sama sekali). Efeknya: begitu ada associate yang menerima 1 undangan, badge itu akan **selamanya** menghitungnya sebagai bagian dari angka, tidak akan pernah turun — jadi kalau admin lihat "12", itu tidak bermakna "12 hal baru yang belum dilihat", melainkan cuma total kejadian sepanjang masa. Tidak berguna sebagai indikator actionable.

### Temuan 2.3 [Sedang] N+1 query, lebih parah dari sisi associate
Untuk 3 kategori (`accepted`, `declined`, `applied`), masing-masing sampai 20 baris, dan **setiap baris memicu 2 query tambahan** (nama assignment + nama profil associate) di dalam loop. Total bisa sampai **~120 query berurutan** untuk satu kali load notifikasi admin. Ini akan terasa lambat begitu jumlah associate & assignment bertambah — dan menjadi lebih buruk lagi karena endpoint ini kemungkinan dipanggil polling berkala (pola yang sama seperti di sisi associate, `setInterval` 30 detik).

**Rekomendasi gabungan 2.1–2.3:** Sama seperti temuan 1.1 — solusi jangka panjang yang benar adalah tabel `notifications` nyata dengan kolom `recipient_id`, `type`, `read_at`, `created_at`, yang di-insert lewat event/trigger (assignment invite, associate accept/decline, **associate submit laporan**, **admin selesai review**) — bukan di-derive on-the-fly dari tabel lain dengan N+1 loop.

---

## 3️⃣ Sesi Login (Persistensi Setelah Browser Ditutup)

**File:** `apps/web/src/context/AuthContext.tsx`, `apps/web/src/app/auth/login/page.tsx`, `apps/web/src/app/dashboard/layout.tsx`

### ✅ Kabar baik: requirement utama sudah terpenuhi
`AuthContext.tsx` membuat Supabase client dengan opsi default (`persistSession: true`, `autoRefreshToken: true` adalah default `@supabase/supabase-js`). Ini artinya sesi login **memang tersimpan di `localStorage`** dan akan otomatis di-refresh saat user membuka kembali aplikasi — user **tidak perlu login ulang** setelah menutup browser, selama mereka tidak logout manual, tidak membersihkan data browser, dan refresh token belum kedaluwarsa (biasanya cukup lama, minggu–bulan). Tidak ditemukan override ke `sessionStorage` atau konfigurasi yang mematikan ini.

### Temuan 3.1 [Sedang] Banyak instance Supabase client terpisah — pola yang secara resmi tidak didukung
Ditemukan `createClient()` dipanggil ulang secara independen di **4 tempat berbeda**: `AuthContext.tsx`, `auth/login/page.tsx`, `auth/register/page.tsx`, `auth/callback/page.tsx` — bukan satu instance yang di-share lewat context/lib. Supabase secara eksplisit memperingatkan "Multiple GoTrueClient instances detected... may cause unexpected behavior" karena tiap instance punya listener & mekanisme auto-refresh sendiri yang bisa saling tumpang tindih.

Efek praktis yang mungkin muncul: setelah `signInWithPassword()` dipanggil dari client instance di halaman login, lalu `router.push('/dashboard')` (navigasi client-side, bukan reload penuh) — `AuthContext` (instance client yang berbeda) mengandalkan event broadcast lintas-instance untuk update state `user`/`accessToken`-nya. Ini biasanya jalan, tapi merupakan area yang tidak dijamin stabil oleh Supabase sendiri dan berpotensi menyebabkan race condition sesekali (mis. sempat ke-redirect balik ke halaman login walau baru saja berhasil login, atau data awal dashboard sempat kosong).

**Rekomendasi:** Buat satu file `lib/supabase-client.ts` yang mengekspor satu instance client, lalu import instance yang sama di semua halaman (login, register, callback, `AuthContext`).

### Temuan 3.2 [Sedang] Tidak ada penanganan token kedaluwarsa (401) di frontend
Tidak ditemukan satu pun tempat di frontend yang secara eksplisit menangani response `401` dari API (misal: coba refresh token lalu retry request, atau redirect rapi ke login dengan pesan "sesi berakhir"). Access token JWT dari Supabase biasanya berumur pendek (default 1 jam); kalau `autoRefreshToken` sempat gagal/telat (tab di-background lama, koneksi sempat putus, dll), request API yang sedang berjalan akan gagal dengan 401 tanpa mekanisme pemulihan — user bisa mengalami tampilan error/kosong di tengah sesi aktif yang terasa seperti "logout mendadak", padahal secara teknis sesi Supabase-nya sendiri masih valid.

**Rekomendasi:** Buat helper `apiFetch()` terpusat yang otomatis: cek response 401 → panggil `supabase.auth.refreshSession()` → retry sekali → kalau tetap gagal baru redirect ke login.

### Temuan 3.3 [Rendah] Tidak ada Next.js middleware/proteksi rute di level server
Tidak ada `middleware.ts` dan tidak memakai `@supabase/ssr`. Proteksi `/dashboard` dan `/admin` murni dilakukan di client lewat `useEffect` yang redirect setelah `loading` selesai (lihat `dashboard/layout.tsx` baris ~112–117). Ini bukan celah keamanan besar (karena semua data tetap lewat API yang punya `authMiddleware` sendiri), tapi menyebabkan sekilas "flash" halaman kosong/loading sebelum redirect terjadi, dan berarti halaman-halaman ini secara teknis bisa di-crawl/di-render kosong oleh siapa saja tanpa login.

---

## 4️⃣ Dashboard

### Temuan 4.1 [Tinggi] `GET /api/admin/stats` tidak punya KPI "laporan menunggu review"
**File:** `apps/api/src/modules/admin/index.ts` baris 12–51

Dashboard admin menampilkan: total associate, pending review (profil), aktif, draft, baru minggu ini, profil belum lengkap, total dokumen, CV upload hari ini. **Tidak ada satu pun angka untuk "berapa assignment/laporan kerja yang sedang menunggu direview admin."** Ini konsisten dengan gap notifikasi di §2.1 — artinya di **seluruh aplikasi**, tidak ada satu tempat pun (dashboard maupun notifikasi) yang secara proaktif memberi tahu admin bahwa ada pekerjaan associate yang perlu direview. Admin harus tahu sendiri untuk membuka menu assignment dan mengecek manual.

**Rekomendasi:** Tambahkan card KPI "Laporan Menunggu Review" (`COUNT(*) FROM assignment_assignees WHERE status = 'completed'`) di halaman utama admin — ini quick win, satu query tambahan saja.

### Temuan 4.2 [Rendah] Perhitungan "profil belum lengkap" mengambil seluruh baris ke memori
Baris 24–31: `SELECT bio, phone, photo_url FROM associate_profiles` **tanpa filter/limit**, lalu di-loop di JavaScript untuk menghitung yang kosong. Untuk skala saat ini (puluhan–ratusan associate) tidak masalah, tapi tidak scalable — harusnya pakai `count` dengan filter `.or('bio.is.null,phone.is.null,photo_url.is.null')` langsung di query SQL/PostgREST.

---

## 5️⃣ Sistem Review (Admin Mereview Hasil Kerja Associate)

Ini area yang paling berkaitan langsung dengan yang Anda minta. Mekanisme intinya (endpoint `PATCH /api/admin/assignments/:id/assignees/:aid`, status `completed → reviewed` atau `completed → in_progress` untuk revisi) **sudah ada dan berfungsi** (sudah diverifikasi juga di audit sebelumnya soal state machine-nya). Tapi ada gap di sisi *visibilitas hasilnya*:

### Temuan 5.1 [Tinggi] Halaman detail assignment associate tidak punya tampilan untuk status `reviewed`
**File:** `apps/web/src/app/dashboard/assignments/[id]/page.tsx`

Ada blok tampilan khusus untuk status `invited`, `accepted`, `in_progress` (baris 383, 409, 432 — termasuk kotak kuning "Revisi Diperlukan" kalau ada `evidence_reviewer_notes`), dan `completed` (baris 530). **Tidak ada blok untuk status `reviewed`** — yaitu status akhir setelah admin **menyetujui** laporan. Label status di baris 301 pun tidak memetakan `reviewed` ke teks yang rapi (`'Diundang' / 'Diterima' / 'Berjalan' / 'Laporan Dikirim'`, sisanya jatuh ke `: myStatus` — jadi tampil sebagai teks mentah `"reviewed"`).

Praktiknya: associate yang laporannya **sudah disetujui admin** — momen yang seharusnya jadi penutup positif dari seluruh alur assignment — malah tidak mendapat halaman konfirmasi/ucapan selesai yang layak, hanya teks status mentah tanpa konten body yang jelas.

**Rekomendasi:** Tambahkan blok UI untuk `myStatus === 'reviewed'` — tampilkan catatan approval dari admin (kalau ada), tanggal disetujui, dan mungkin rating/badge "Assignment Selesai ✅" untuk menutup alur dengan baik. Ini melengkapi loop yang selama ini terputus di sisi notifikasi (§1.1).

### Temuan 5.2 [Info] Dua sistem "review" yang berbeda perlu dibedakan dengan jelas
Perlu dicatat untuk tim dev: aplikasi ini punya **dua konsep review yang sama sekali berbeda** tapi mirip penamaan:
1. `associate_reviews` — review **profil associate saat pendaftaran** (approve/reject associate baru), dipakai di `admin/associates` list & `admin/stats` (`pending_review`).
2. `assignment_assignees.status/evidence_reviewer_notes` — review **hasil kerja per assignment** (yang jadi fokus pertanyaan Anda).

Keduanya tidak saling terhubung dan menggunakan mekanisme penyimpanan feedback yang berbeda (tabel terpisah vs kolom langsung di baris assignee). Tidak ada bug dari percampuran ini yang saya temukan, tapi worth didokumentasikan supaya developer baru tidak salah asumsi saat baca kode "review" di grep.

---

## ✅ Rekomendasi Arsitektur Jangka Menengah

Akar dari sebagian besar temuan di atas (§1.1, §1.2, §2.1, §2.2, §2.3, §4.1) adalah **tidak adanya tabel `notifications` sungguhan**. Semua "notifikasi" saat ini adalah hasil derive on-the-fly dari tabel `assignment_assignees`, yang punya keterbatasan struktural:
- Tidak bisa merepresentasikan event yang bukan perubahan status assignee (mis. review admin, CV berhasil diparsing, dsb.)
- Satu baris = satu status "read", jadi tidak bisa membedakan "sudah baca notifikasi undangan" vs "sudah baca notifikasi hasil review" kalau keduanya terjadi di assignee yang sama.
- Memaksa N+1 query karena tidak ada tabel notifikasi yang sudah didenormalisasi/berisi judul-pesan siap pakai.

**Skema yang disarankan:**
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,        -- associate atau admin
  recipient_role text NOT NULL,      -- 'associate' | 'admin'
  type text NOT NULL,                -- 'invitation' | 'accepted' | 'declined' | 'submitted' | 'reviewed' | 'revision_requested'
  title text NOT NULL,
  message text NOT NULL,
  link text,
  reference_id uuid,                 -- assignment_id / assignee_id terkait
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```
Di-insert lewat event queue yang sudah ada (`event_queue` + `event-processor.ts`) — tambahkan handler baru untuk event `AssociateSubmitted` (sudah ada tipe-nya di worker tapi belum jelas dipakai untuk notifikasi in-app) dan event baru `AssignmentReviewed`. Dengan begini, satu query sederhana `WHERE recipient_id = ? AND read_at IS NULL` menyelesaikan masalah performa DAN kelengkapan notifikasi sekaligus — tanpa N+1, tanpa localStorage tambahan, dan mencakup event submit/review yang saat ini hilang.
