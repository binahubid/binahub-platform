# Tim Konsultan BinaHub

AMS menjadi sumber keanggotaan dan persetujuan. App mengelola klien, checklist, proposal, tindak lanjut, dan serah terima. Riwayat perjanjian menyimpan snapshot yang disetujui, waktu, dan akun pelakunya.

## Penyiapan

Jalankan packages/database/migrations/014_consultant_team.sql di database AMS dan binahub-api/supabase/migrations/0093_consultant_ams_membership.sql di database APP/API. Jangan menukarkan database tujuan. Integrasi memakai env yang sama dengan T-BOS; tidak ada secret baru.

Rilis API APP dan API AMS sebelum UI baru. Pengujian lokal menggunakan akun, persetujuan, email, dan database sintetis. Undangan produksi tidak dikirim untuk pengujian otomatis.

## Admin AMS

1. Buka **Tim Konsultan → Undang anggota**.
2. Cari associate aktif, lalu pilih akunnya.
3. Tinjau dan sesuaikan draf perjanjian. Lengkapi ketentuan kompensasi yang benar-benar disepakati; tidak perlu mengarang nominal fee proyek.
4. Tandai bahwa isi sudah ditinjau, lalu pilih **Kirim undangan**.
5. Periksa status keanggotaan. Buka **Rincian** untuk melihat perjanjian dan riwayat.
6. Jika pembaruan portal belum tersinkron, pilih **Sinkronkan ulang**. Undangan dan persetujuan yang sudah tersimpan tetap tercatat ketika integrasi sementara tidak tersedia.

## Associate

1. Masuk ke AMS, lalu buka notifikasi undangan atau **Tinjau undangan** di beranda.
2. Baca perjanjian dan ketentuan kompensasi. Pilih persetujuan lalu **Setujui & Bergabung**, atau tolak undangan.
3. Pilih **Buka Portal Konsultan**. Menu tersedia di navigasi dan beranda selama keanggotaan aktif.
4. Tidak perlu membuat password App kedua. Tombol membuat tiket masuk baru berumur singkat dan sekali pakai. Keanggotaan tidak memiliki tanggal akhir otomatis.

## Akses dan pencabutan

Konsultan aktif dapat membaca informasi pekerjaan tim; perubahan pekerjaan dibatasi pada penanggung jawabnya. Keanggotaan tidak memberi akses dashboard admin. Jeda atau pengakhiran diperiksa kembali pada permintaan API, pembukaan portal, penukaran tiket, dan pengiriman email. Pesan portal yang masih mengantre dibatalkan saat pencabutan tersinkron; email yang sudah diterima penyedia tidak dapat ditarik kembali.

Nama dan email terikat pada identitas associate AMS. Perubahan email yang sudah terhubung memerlukan peninjauan admin; sistem menolak pemindahan identitas secara diam-diam.

## Pengujian

Jalankan node --test scripts/consultant-team.sql.test.mjs, lalu build API dan pnpm run test:api:contract. Uji SQL, otorisasi, antrean, dan tiket App berada di binahub-api/src/lib/consultant.
