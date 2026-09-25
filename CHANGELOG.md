# Changelog

Semua perubahan signifikan pada BinaHub AMS didokumentasikan di file ini.

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
- Menambahkan field referensi program APP pada assignment AMS dan migrasi database `011_app_assignment_integration.sql`.

### Changed

- Halaman detail assignment menampilkan tombol workspace hanya untuk assignment APP yang sudah berjalan.
- Registrasi associate menjadwalkan sinkronisasi identitas dan satu pengingat kelengkapan profil setelah 72 jam apabila profil masih berstatus draft.
