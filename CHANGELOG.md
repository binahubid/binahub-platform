# Changelog

Semua perubahan signifikan pada BinaHub AMS didokumentasikan di file ini.

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
