# Audit Produksi AMS — v0.8.0

Tanggal audit: 22 September 2026  
Ruang lingkup: `apps/web`, `apps/api`, package domain/database/shared/validation/AI, autentikasi, role, file, CV, assignment, review, worker, notifikasi, dan dependency produksi.

## Ringkasan eksekutif

Kode v0.8.0 berstatus **release candidate**. Pemeriksaan statis lokal, typecheck, production build, dan dependency audit lulus. Versi ini belum boleh dinyatakan aktif di production hanya berdasarkan build lokal: dua migration wajib dijalankan, API/web harus dideploy, lalu smoke test terautentikasi harus lulus terhadap domain produksi.

Integrasi AMS dengan `app.binahub.id` sengaja belum diimplementasikan dalam versi ini. Arsitektur integrasi akan diputuskan setelah AMS yang berdiri sendiri terverifikasi, agar perbaikan keamanan tidak bercampur dengan perluasan scope.

## Temuan dan perbaikan

### 1. Autentikasi dan sesi

- Login/register diberi rate limit atomik lintas instance serverless.
- Respons login salah tidak membedakan email ada/tidak, sehingga mengurangi account enumeration.
- Logout memakai global sign-out.
- Callback OAuth menangani sesi yang sudah tersedia maupun perubahan auth; timeout kini menampilkan aksi pemulihan.
- Auth context mengakhiri loading walau pembacaan sesi gagal.
- Role `admin`, `reviewer`, dan `associate` mempunyai tujuan login serta route guard terpisah.

### 2. Otorisasi dan data sensitif

- Seluruh route admin memakai autentikasi dan `requireRole(['admin'])`.
- Workspace reviewer memakai endpoint sendiri dan hanya menerima data profesional yang diperlukan.
- Detail finansial tetap terisolasi dan tidak tersedia untuk reviewer/associate lain.
- Marketplace associate tidak mengekspos assignment draft.
- Public profile hanya tersedia untuk associate berstatus aktif dan memakai whitelist kolom.

### 3. File dan dokumen

- Akses file memeriksa ownership/role pada setiap tahap.
- Path storage harus cocok dengan owner dan kategori; nama file dinormalisasi.
- MIME dan ukuran divalidasi di server, bukan hanya berdasarkan ekstensi UI.
- URL aplikasi menyimpan referensi file stabil, bukan signed URL kedaluwarsa atau access token pada query string.
- Reviewer hanya dapat membaca dokumen associate yang masih `pending_review`.

### 4. CV dan AI

- PDF dan DOCX diekstrak sebelum dikirim ke provider AI.
- `.doc` lama ditolak karena parser DOCX tidak menjamin pembacaan format tersebut.
- File kosong, biner tak terbaca, dan payload terlalu besar dihentikan sebelum pemanggilan AI.
- Import hasil CV memakai RPC atomik/idempoten agar retry worker tidak menggandakan record.
- Tidak ada fallback data palsu dari nama file ketika ekstraksi gagal.

### 5. Assignment

- Admin create/update memakai validasi tipe, batas panjang, angka, tanggal, role, dan status.
- Status assignment serta assignee hanya dapat berpindah melalui transisi yang diizinkan.
- Jumlah associate minimal satu; form tidak lagi membuat assignment dengan kebutuhan nol.
- Associate hanya melihat opportunity aktif dan histori assignment miliknya.
- Apply menyimpan role pilihan dan melindungi dari aplikasi ganda.

### 6. Review

- Reviewer memiliki antrean, halaman detail, dan aksi keputusan yang benar-benar fungsional.
- Keputusan hanya dapat dibuat saat profil masih `pending_review`.
- Jika pencatatan audit keputusan gagal, status associate dikembalikan ke `pending_review`.
- Tautan detail reviewer tetap berada di namespace `/admin/reviews`, sehingga tidak terpental oleh route guard.

### 7. Worker dan notifikasi

- Worker melakukan claim sebelum memproses event, mencatat retry, dan memberi status gagal permanen setelah batas percobaan.
- Notifikasi mempunyai unique key recipient/type/reference agar retry tidak mengirim duplikat.
- CV parsing dan event submission tidak mengandalkan proses in-memory tunggal.

### 8. API perimeter dan observability dasar

- CORS memakai allowlist origin.
- Body maksimum 2 MB.
- Setiap respons mempunyai `X-Request-Id`; error 5xx menyertakan request ID tanpa detail database.
- Security headers aktif; respons auth memakai `no-store`.
- Health endpoint mempublikasikan versi 0.8.0 tanpa secret.
- Log server mempertahankan request ID dan konteks endpoint untuk investigasi.

### 9. UX/UI

- Halaman login memakai satu focal point, progressive disclosure untuk login email, status Google login, serta pesan error/sukses kontekstual.
- Reviewer hanya melihat navigasi review sehingga tidak terpapar menu admin yang tidak dapat dipakai.
- Loading, empty state, toast, dan tindakan utama diseragamkan pada alur yang diaudit.
- Komponen AI Search palsu dihapus agar UI tidak menjanjikan fungsi yang belum ada.

## Bukti verifikasi lokal

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm lint` | Lulus, 0 error dan 0 warning |
| `pnpm typecheck` | Lulus, 15/15 task |
| `pnpm build` | Lulus, 9/9 package; 38 halaman Next dihasilkan |
| `pnpm audit --prod --audit-level moderate` | Lulus, tidak ada kerentanan yang diketahui |

## Langkah deployment wajib

1. Backup database atau pastikan point-in-time recovery tersedia.
2. Jalankan `packages/database/migrations/006_atomic_rate_limits.sql`.
3. Jalankan `packages/database/migrations/007_notification_idempotency.sql`.
4. Deploy API v0.8.0 dan pastikan `/api/health` mengembalikan `version: 0.8.0`.
5. Deploy web v0.8.0 dengan `NEXT_PUBLIC_API_URL` dan konfigurasi Supabase yang benar.
6. Jalankan smoke read-only:

   ```powershell
   $env:AMS_API_URL = "https://api-ams.example.com"
   $env:AMS_ADMIN_EMAIL = "admin@example.com"
   $secret = Read-Host "Password admin AMS" -AsSecureString
   $env:AMS_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $secret).Password
   npm run test:smoke
   Remove-Item Env:AMS_API_URL,Env:AMS_ADMIN_EMAIL,Env:AMS_ADMIN_PASSWORD
   $secret = $null
   ```

7. Uji manual singkat: login admin, login reviewer, buka detail antrean reviewer, login associate, buka opportunity aktif, lalu logout dari masing-masing role.

## Kriteria siap production

AMS dapat dinyatakan siap production setelah seluruh langkah deployment di atas lulus dan tidak ada respons 5xx pada log selama smoke. Jika salah satu migration belum diterapkan, worker notification atau rate limiting belum dianggap aman untuk production meskipun UI dapat dibuka.
