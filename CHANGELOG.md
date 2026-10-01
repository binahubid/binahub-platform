# Changelog

Semua perubahan signifikan pada BinaHub AMS didokumentasikan di file ini.

## [Unreleased] - 2026-10-01

### Fixed

- Validasi input fee menerima angka rupiah bulat tanpa batasan kelipatan yang keliru; timeout undangan dicek ulang terhadap daftar penerima sebelum admin diarahkan untuk mengirim ulang.
- Permintaan ulang dari APP tidak lagi menganggap penawaran lama dengan fee berbeda sebagai keberhasilan; admin mendapat petunjuk untuk membatalkan penawaran lama terlebih dahulu.
- Modal onboarding hanya muncul untuk akun draft yang baru dibuat dan membaca dokumen serta status profil dari server, bukan progres lokal akun lain.
- SPK memakai nama legal PT Binahub Solusi Transformasi; undangan tanpa rincian fee tidak bisa diterima sampai admin memperbaiki datanya.
- Email penawaran menampilkan project, peran, batas respons, rincian kompensasi/transportasi/persiapan yang diisi, dan total sesuai record undangan.
- Pengiriman email dan sinkronisasi APP dijalankan paralel setelah undangan tersimpan agar respons admin lebih cepat; keduanya tetap dapat ditindaklanjuti lewat antrean jika gagal.
- Dashboard associate seluler menampilkan identitas dan keahlian secara ringkas tanpa notifikasi/avatar ganda serta tanpa ajakan CV berulang bagi profil lengkap; panduan CV hanya untuk akun draft baru yang memang belum terisi.

## [0.10.2] - 2026-09-30

### Added

- Pengingat manual melalui notifikasi aplikasi dan antrean email untuk associate yang belum mengirim profil, dengan jeda minimum 24 jam antar-pengingat.
- Tenggat respons undangan dan rincian fee per penerima (kompensasi wajib, transportasi serta persiapan opsional); email hanya memuat komponen yang diisi dan totalnya.
- Pembuatan project APP beserta modul T-BOS/LEP, atau pengaktifan modul yang belum ada pada project APP yang sudah aktif, dari satu alur assignment AMS tanpa bolak-balik ke APP.
- Migrasi `013_assignment_offer_terms.sql` untuk menyimpan komponen fee dan tenggat, memperbarui nama peran lama, serta menjaga batas posisi yang dapat diterima secara atomik di database.

### Changed

- Alur profil memperjelas langkah "Kirim profil untuk ditinjau", data wajib, dan catatan penolakan; onboarding akun lama yang sudah memiliki profil melewati permintaan unggah CV.
- Kebutuhan associate dihitung sebagai posisi diterima, bukan batas undangan; undangan tambahan dapat menjadi cadangan tetapi tidak dapat diterima setelah posisi penuh.
- Nama peran yang terlihat pengguna disederhanakan menjadi Observer dan Pembicara; istilah project digunakan pada alur penugasan.

### Security

- Undangan baru tidak dapat dikirim tanpa fee dan tenggat; fee penawaran terkunci setelah undangan dikirim agar email dan data kesepakatan tetap sama.
- Penurunan jumlah kebutuhan di bawah posisi yang sudah terisi ditolak oleh database.

## [0.10.1] - 2026-09-27

### Added

- Menambahkan kompensasi khusus per associate di dalam assignment yang sama, meliputi nominal, mata uang, satuan pembayaran, dan catatan kesepakatan yang dapat ditetapkan sebelum undangan dikirim.
- Menampilkan nilai kompensasi efektif pada dashboard admin, detail assignment associate, dan SPK sebelum associate menerima undangan.
- Mengirim notifikasi aplikasi dan email ketika admin menetapkan atau mengubah kompensasi khusus associate.
- Menambahkan migrasi `012_assignee_compensation.sql` dengan constraint konsistensi nominal, mata uang, satuan, serta panjang catatan.
- Menambahkan riwayat audit kompensasi otomatis yang menyimpan nilai sebelum dan sesudah perubahan, admin pengubah, serta waktu perubahan.

### Security

- Membatasi rincian kompensasi khusus hanya kepada admin dan associate pemilik assignment; identitas admin yang memperbarui nilai tidak diekspos melalui API associate.
- Mengunci perubahan kompensasi setelah associate menerima assignment agar kesepakatan tidak dapat diubah sepihak saat pekerjaan berjalan.

### Changed

- Menyelaraskan versi aplikasi, health API, halaman status, dan production smoke ke `0.10.1` agar hasil deployment dapat diverifikasi tanpa mismatch versi lama.

## [0.10.0] - 2026-09-27

### Added

- Menambahkan pemilihan program T-BOS/LEP langsung saat membuat assignment di AMS, menggunakan katalog APP bertanda tangan HMAC dan metadata program yang divalidasi server.
- Menghubungkan alur rekomendasi AI AMS dengan assignment program: admin memilih program, meninjau kandidat berperingkat, lalu mengundang associate dari satu pintu.

### Changed

- Assignment program yang dibuat dari AMS kini bersifat invite-only, langsung disinkronkan ke APP saat associate diundang, dan mengaktifkan akses program saat undangan diterima atau pekerjaan dimulai.
- Aksi sinkronisasi ulang dan rekonsiliasi status kini berlaku untuk semua assignment yang terhubung ke program APP, tidak hanya assignment yang awalnya dibuat dari APP.
- Mencegah assignment program ganda lintas sumber; jika kombinasi program dan modul sudah aktif, AMS membuka assignment yang sudah ada.

## [0.9.0] - 2026-09-25

### Added — Integrasi penugasan AMS dan APP

- Menambahkan endpoint server-to-server bertanda tangan HMAC agar APP dapat mencari associate aktif dan membuat penawaran assignment tanpa mengekspos data AMS ke browser.
- Menyinkronkan identitas associate dan perubahan status assignment ke APP melalui event queue yang idempoten dan dapat diulang ketika koneksi gagal.
- Menambahkan pintu masuk sekali pakai dari detail assignment AMS ke workspace APP, sehingga associate tidak perlu membuat atau mengingat akun kedua.
- Menambahkan outbox email notifikasi dengan Resend, idempotency key, preferensi penerima, retry worker, dan notifikasi untuk undangan, perubahan status, review profil, serta pengingat profil belum lengkap.
- Mengirim email penting langsung pada request normal dan menyediakan endpoint worker ber-secret sebagai jalur retry, sehingga pengiriman tidak bergantung pada sesi admin.
- Memulihkan delivery email yang terhenti dan mengembalikan seluruh kegagalan ke status retryable agar antrean tidak macet pada status processing.
- Menandai assignment sebagai gagal sinkronisasi setelah batas retry tercapai agar masalah terlihat dan dapat direkonsiliasi oleh admin.
- Menampilkan asal dan status sinkronisasi assignment pada dashboard admin, mengunci detail assignment yang dikelola APP, serta meneruskan status selesai/batal ke seluruh assignee agar akses APP ikut direkonsiliasi.
- Mencoba sinkronisasi APP langsung saat invite dan perubahan status, dengan event queue tetap dipertahankan sebagai retry agar akses terasa instan tanpa mengurangi ketahanan sistem.
- Menambahkan aksi admin **Sync ulang APP** untuk memperbaiki assignment terintegrasi yang tertahan tanpa menunggu scheduler cron.
- Menampilkan penyebab sinkronisasi yang aman dan spesifik saat retry gagal, serta menyamakan versi health API dengan rilis AMS agar deployment aktif mudah diverifikasi.
- Menormalisasi timestamp database AMS yang tidak memiliki penanda zona waktu menjadi ISO UTC sebelum payload HMAC dikirim, sehingga event assignment tidak lagi ditolak oleh validasi APP.
- Menambahkan field referensi program APP pada assignment AMS dan migrasi database `011_app_assignment_integration.sql`.

### Changed

- Halaman detail assignment menampilkan tombol workspace hanya untuk assignment APP yang sudah berjalan.
- Registrasi associate menjadwalkan sinkronisasi identitas dan satu pengingat kelengkapan profil setelah 72 jam apabila profil masih berstatus draft.
