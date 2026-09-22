# Audit Alur CV End-to-End — v0.8.1

Tanggal audit: 22 September 2026  
Cakupan: upload PDF/DOCX, penyimpanan privat, konfirmasi dokumen, ekstraksi teks, parsing AI, review manusia, impor transaksional, dan pembacaan profil.

## Kesimpulan

Alur kode CV sudah diaudit dari browser sampai database dan seluruh temuan kritis yang ditemukan telah diperbaiki. Pemeriksaan lokal lint, typecheck, dan build harus lulus sebelum rilis ini ditutup. Status produksi tetap **menunggu migration 008, deployment v0.8.1, dan satu UAT mutasi memakai akun associate khusus**; build lokal tidak membuktikan koneksi storage, provider AI, dan database produksi secara bersamaan.

## Alur yang diverifikasi

1. Associate yang sudah login memilih PDF atau DOCX berukuran maksimal 10 MB.
2. API memeriksa ownership, MIME, ukuran, dan nama berkas lalu membuat signed upload URL privat.
3. Browser mengunggah binary langsung ke bucket `ams-files`.
4. Endpoint konfirmasi memeriksa file database dan keberadaan objek storage. CV baru didaftarkan dahulu; CV lama baru dinonaktifkan setelah pendaftaran baru berhasil.
5. Setelah konfirmasi berhasil, UI meminta analisis melalui endpoint terautentikasi. Hanya jalur ini yang memicu parser untuk unggahan baru sehingga worker dan browser tidak memanggil AI bersamaan. Parser mengekstrak teks PDF/DOCX dan menghentikan file kosong, scan tanpa teks, atau format yang tidak dapat dibaca.
6. Provider AI hanya menerima teks maksimal 200.000 karakter. Respons JSON divalidasi berdasarkan tipe, enum, panjang, jumlah item, URL, dan tanggal.
7. Hasil parsing disimpan sebagai draft pada dokumen. Worker tidak lagi menimpa profil secara otomatis.
8. Associate melihat hasil terlebih dahulu. Data tanpa tanggal mulai pengalaman tidak diberi tanggal palsu dan harus dilengkapi pengguna.
9. Setelah persetujuan manusia, payload divalidasi kembali dan RPC mengganti profil/riwayat dalam satu transaksi database.
10. Profil, pengalaman, pendidikan, skill, bahasa, sertifikasi, LinkedIn, dan website dibaca kembali melalui endpoint associate.

## Temuan yang ditutup

- Deploy API gagal karena inferensi TypeScript Supabase menghasilkan tipe `never` pada `app_metadata`.
- CV lama dapat dihapus sebelum dokumen pengganti berhasil didaftarkan.
- API dapat mengembalikan sukses walau registrasi dokumen gagal.
- Worker sebelumnya dapat mengimpor hasil AI langsung tanpa review manusia.
- Parser sinkron dan worker dapat berlomba memanggil AI untuk dokumen yang sama.
- Respons AI dipercaya melalui `JSON.parse` tanpa validasi struktur dan batas.
- Prompt sebelumnya berpotensi menginferensikan atribut pribadi sensitif.
- Dashboard membuat tanggal pengalaman/pendidikan palsu ketika AI tidak menemukan tanggal.
- Industri pengalaman, nama panggilan, LinkedIn, dan website belum ikut tersimpan saat impor.
- UI dokumen masih dapat menerima `.doc`, sedangkan backend hanya dapat memproses DOCX.
- Endpoint AI belum mempunyai rate limit khusus dan timeout provider yang terukur.

## Batas yang disengaja

- PDF hasil scan/foto belum memakai OCR. Pengguna harus memakai PDF berbasis teks atau DOCX.
- Format Word lama `.doc` tidak didukung.
- Parsing AI bersifat bantuan; data tidak dianggap benar sebelum ditinjau associate.
- Data yang tidak tertulis di CV tidak dibuat-buat. Pengalaman tanpa tanggal mulai harus dilengkapi manual.

## Gate produksi

1. Jalankan `packages/database/migrations/008_harden_cv_import.sql` di Supabase.
2. Deploy API dan web v0.8.1.
3. Pastikan health API menampilkan v0.8.1 dan jalankan smoke produksi read-only.
4. Dengan akun associate UAT khusus, unggah satu PDF teks dan satu DOCX; pastikan preview tampil, data belum berubah sebelum konfirmasi, impor berhasil setelah konfirmasi, dan refresh menampilkan semua field.
5. Ulangi konfirmasi atau parsing dokumen yang sama; pastikan tidak ada riwayat ganda dan respons memakai hasil cache.
6. Uji PDF scan tanpa teks; sistem harus menolak secara jelas tanpa mengubah profil.

Produksi dapat dinyatakan lulus untuk fitur CV hanya setelah keenam gate tersebut selesai.

Runner opt-in untuk gate 4–5:

```powershell
$env:AMS_API_URL = "https://api-ams.binahub.id"
$env:AMS_ASSOCIATE_EMAIL = "akun-uat-associate@example.com"
$secret = Read-Host "Password associate UAT" -AsSecureString
$env:AMS_ASSOCIATE_PASSWORD = [System.Net.NetworkCredential]::new("", $secret).Password
$env:AMS_CV_FILE = "C:\path\cv-uat.pdf"
$env:AMS_CV_MUTATION_TEST = "true"
npm run test:cv
Remove-Item Env:AMS_API_URL,Env:AMS_ASSOCIATE_EMAIL,Env:AMS_ASSOCIATE_PASSWORD,Env:AMS_CV_FILE,Env:AMS_CV_MUTATION_TEST
$secret = $null
```

Runner ini sengaja mutatif: CV dan koleksi profil akun UAT akan diganti. Jangan gunakan akun associate nyata.
