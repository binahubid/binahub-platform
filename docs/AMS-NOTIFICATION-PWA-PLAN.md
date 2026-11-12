# Rencana Notifikasi dan Pemasangan AMS

Kajian disusun pada 12 November 2026. Bagian terakhir memuat langkah rilis dan uji perangkat untuk implementasi AMS dan App/API.

## Keputusan yang disarankan

Jadikan AMS satu aplikasi web yang dapat dipasang ke layar utama (PWA), dengan pusat notifikasi, push ke HP, dan email. Associate umum tetap memakai AMS yang sama. Anggota tim konsultan aktif mendapat tambahan notifikasi pekerjaan yang menjadi tanggung jawabnya; akses baca pekerjaan tim tidak berarti semua pekerjaan dikirim sebagai push.

Menggunakan portal konsultan tetap melalui AMS dan tiket SSO yang sudah ada. Tidak perlu memasang aplikasi kedua atau membuat password App kedua. Apabila sesi AMS habis, pengguna masuk kembali ke AMS lalu dikembalikan ke tujuan notifikasinya.

## Temuan dari sistem saat ini

| Bagian | Temuan kode | Dampak |
| --- | --- | --- |
| AMS di aplikasi | Pusat notifikasi dan jumlah belum dibaca sudah tersedia. Layout associate memeriksa jumlah tiap 60 detik saat halaman terlihat dan ketika kembali aktif. | Berguna saat AMS dibuka, tetapi belum menjadi notifikasi sistem HP. |
| Email AMS | Ada antrean, kunci pencegah duplikasi, percobaan kirim langsung, dan retry lewat event worker. Preferensi email pengguna diperiksa. | Fondasinya dapat dilanjutkan. Status diterima penyedia email belum membuktikan masuk inbox atau dibaca. |
| Undangan tim konsultan | Undangan membuat notifikasi AMS dan antrean email. Pengiriman email undangan lama dibatalkan jika undangan tidak lagi berlaku. | Mekanisme validasi ulang ini perlu berlaku juga pada push dan pengingat. |
| Penugasan klien dari App | Jalur penugasan memverifikasi keanggotaan AMS, menyimpan penanggung jawab, dan mencatat aktivitas. Belum ada pembuatan notifikasi AMS pada jalur tersebut. | Memasang PWA saja belum membuat konsultan tahu ada klien baru. Integrasi peristiwa penugasan harus ditambahkan. |
| PWA AMS | Pada sumber aplikasi yang diperiksa belum ditemukan manifest, service worker, atau pengelolaan langganan push. | Memerlukan perubahan frontend, API, dan database. |
| SLJ | Ada manifest, UI pemasangan, service worker, langganan per perangkat, VAPID, fungsi pengirim, dan skrip Supabase Cron. | Pola arsitektur bisa dipakai. Keaktifan konfigurasi produksi SLJ tidak dibuktikan hanya dari berkas ini. |

Sumber AMS: `apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/app/dashboard/notifications/page.tsx`, `apps/api/src/lib/notification-email.ts`, `apps/api/src/workers/event-processor.ts`, `apps/api/src/workers/routes.ts`, `apps/api/src/modules/consultant-team/routes.ts`, dan `packages/database/migrations/014_consultant_team.sql`.

Sumber App/API: `binahub-api/src/app/api/admin/consultants/route.ts`, `binahub-api/src/lib/consultant/ams-eligibility.ts`, serta migrasi SQL90, SQL92, dan SQL93. Sumber SLJ: `src/app/manifest.ts`, `src/components/pwa/PwaProvider.tsx`, `src/lib/web-push.ts`, `public/sw.js`, migrasi SQL22, dan `supabase/functions/send-user-reminders/index.ts`.

### Detail SLJ yang perlu disesuaikan

`public/sw.js` SLJ memeriksa `self.registration.setAppBadge` dan `clearAppBadge`. API resminya tersedia pada `navigator` / `WorkerNavigator`, bukan pada service worker registration. Karena dilindungi pengecekan keberadaan properti, jalur tersebut dapat terlewati tanpa menampilkan badge. Ini temuan pemeriksaan kode, bukan hasil uji HP.

Untuk AMS, gunakan API yang benar, deteksi dukungan perangkat, dan masukkan pembaruan badge ke `event.waitUntil`. Android memiliki perilaku badge dari notifikasi sistem; jangan menjanjikan angka unread yang identik pada semua launcher.

## Alur pengguna

1. Associate masuk ke AMS seperti biasa. Pada beranda tersedia kartu kecil **Akses AMS dari layar utama** dengan tombol **Pasang AMS** dan **Nanti**. Pengguna iPhone mendapat petunjuk pemasangan yang sesuai perangkat.
2. Setelah konteksnya jelas, tampilkan **Aktifkan notifikasi HP**: "Dapatkan pemberitahuan undangan dan penugasan tanpa harus membuka AMS." Dialog izin sistem hanya dipanggil setelah tombol ditekan.
3. Pengaturan menampilkan status yang terpisah: pemasangan, izin notifikasi, dan langganan perangkat. Tersedia **Periksa perangkat ini**, **Kirim notifikasi uji**, dan **Nonaktifkan di perangkat ini**. Notifikasi uji hanya dikirim setelah permintaan pengguna.
4. Ketuk notifikasi undangan untuk membuka perjanjian yang tepat. Ketuk notifikasi pekerjaan untuk menuju pekerjaan terkait melalui AMS dan SSO. Periksa kembali hak akses dan keadaan sumber sebelum menampilkan tujuan.
5. Pusat notifikasi memiliki **Semua**, **Belum dibaca**, dan **Perlu tindakan**. Membaca pemberitahuan tidak berarti menyetujui perjanjian atau menyelesaikan tugas. Undangan yang sudah ditarik tetap jelas riwayatnya dan tidak menampilkan tindakan yang sudah tidak berlaku.
6. Badge di dalam AMS mengikuti jumlah belum dibaca dari server. Badge ikon memakai kemampuan sistem HP. Daftar perlu tindakan tetap tersedia walaupun notifikasi HP sudah dihapus.

## Pemberitahuan yang perlu dibuat

| Peristiwa | Penerima | Jalur yang disarankan | Tujuan |
| --- | --- | --- | --- |
| Undangan/perjanjian penugasan program | Associate yang diundang | Pusat notifikasi, email sesuai preferensi, push bila diizinkan | Detail undangan |
| Undangan menjadi tim konsultan | Associate yang diundang, meskipun belum anggota tim | Pusat notifikasi, email sesuai preferensi, push bila diizinkan | Perjanjian tim konsultan |
| Klien atau pekerjaan baru ditugaskan | Konsultan aktif yang menjadi penanggung jawab | Pusat notifikasi, email sesuai preferensi, push bila diizinkan | Pekerjaan terkait melalui AMS |
| Jadwal konsultasi dibuat, diubah, atau dibatalkan | Penanggung jawab terkait | Pusat notifikasi dan push; email untuk perubahan penting | Detail jadwal |
| Pengingat undangan belum direspons | Penerima undangan yang masih berlaku | Pengingat terbatas, mengikuti preferensi | Undangan yang sama |
| Pengingat jadwal | Penanggung jawab yang masih ditugaskan | Push sesuai preferensi dan waktu jadwal | Jadwal terkait |
| Persetujuan/penolakan dan perubahan status kerja sama | Pengguna terkait dan admin yang memerlukan tindak lanjut | Pusat notifikasi; email/push sesuai kepentingan | Status dan riwayat |

Usulan awal pengingat undangan: satu kali setelah 24 jam, lalu satu kali setelah 72 jam jika masih menunggu. Jangan mewajibkan respons dalam batas waktu tersebut. Untuk jadwal, sediakan pengingat H-1 dan 1 jam sebelumnya. Ini konfigurasi awal yang disarankan, belum kebijakan yang diaktifkan. Kiriman di luar jam wajar dijadwalkan sesuai zona waktu; perubahan atau pembatalan jadwal yang mendesak diperlakukan terpisah.

Notifikasi pemasaran/promosi tidak dicampurkan ke pemberitahuan pekerjaan. Preferensi lama tetap dihormati; jangan otomatis mengaktifkan kembali email atau izin HP yang pernah dimatikan pengguna.

## Arsitektur pengiriman

1. Simpan perubahan bisnis dan peristiwa notifikasinya secara atomik. Jangan bergantung pada halaman admin yang tetap terbuka atau pemanggilan push dari frontend.
2. Gunakan tabel notifikasi AMS sebagai sumber bersama. Tiap peristiwa memiliki ID stabil dan kunci unik penerima + jenis + ID sumber + revisi. Retry tidak boleh menghasilkan undangan atau pengingat ganda.
3. Pertahankan catatan pengiriman email dan tambah catatan pengiriman push per perangkat. Satu perangkat gagal tidak boleh membuat keberhasilan perangkat lain menutupi kegagalannya. Bedakan mengantre, diterima layanan push, gagal, dibuka, dan ditindaklanjuti; layanan menerima pesan tidak membuktikan pengguna telah membacanya.
4. Tambahkan langganan push AMS yang terikat akun dan perangkat. Dukung beberapa HP/browser. Kunci VAPID dibuat khusus AMS; private key hanya di server. Jangan menyalin private key atau langganan SLJ.
5. Sambungkan peristiwa penugasan dari App/API ke AMS melalui integrasi server bertanda tangan yang sudah digunakan, dengan antrean keluar yang persisten, validasi penerima, pencegahan replay, dan deduplikasi. Kegagalan pengiriman notifikasi tidak boleh membatalkan penugasan yang sudah sah atau hilang diam-diam.
6. Lanjutkan event worker AMS yang sudah tersedia. Gunakan Supabase Cron dan Vault untuk memanggil worker, memproses pengingat, dan retry. Konfigurasi AMS harus diverifikasi tersendiri; cron laporan dan sales di API BinaHub tidak otomatis memproses antrean AMS. Tidak memerlukan n8n di laptop.
7. Terapkan klaim pengiriman dengan lease, retry terbatas dengan jeda bertambah, penonaktifan endpoint 404/410, dan status gagal akhir yang dapat diperiksa admin. Periksa ulang undangan, kepemilikan tugas, keanggotaan, serta preferensi sebelum setiap pengiriman.

## Privasi dan akses

- Tampilkan teks singkat pada layar terkunci, misalnya "Anda memiliki undangan penugasan baru di BinaHub." Rincian klien, jawaban asesmen, isi perjanjian, dan nominal kompensasi dibaca setelah masuk.
- Push pekerjaan konsultan hanya untuk penanggung jawab yang aktif. Konsultan lain tetap dapat membaca informasi tim sesuai hak portal yang sudah ada, tanpa menerima push setiap perubahan.
- AMS dan App adalah origin berbeda. Gunakan satu langganan pada AMS dan alur masuk portal yang terkontrol; jangan mencoba memakai service worker lintas domain.
- Saat logout, lepas ikatan langganan perangkat dari akun dan bersihkan badge. Lakukan pemeriksaan ulang saat akun berganti. Jangan hanya mengandalkan penghapusan penyimpanan browser.
- Jeda/akhir keanggotaan menghentikan notifikasi pekerjaan konsultan yang tertunda, tetapi tidak otomatis mematikan seluruh notifikasi AMS umum. Notifikasi yang telanjur diterima perangkat tidak dapat ditarik dengan jaminan.
- Jangan menyimpan halaman perjanjian, hasil peserta, respons API privat, atau token autentikasi sebagai cache offline. Halaman offline menjelaskan bahwa koneksi diperlukan untuk tindakan penting.

## Batasan perangkat

- iPhone/iPad: Web Push tersedia untuk web app yang ditambahkan ke layar utama pada iOS/iPadOS 16.4 atau lebih baru. Pengguna tetap harus mengizinkan notifikasi melalui interaksi langsung. Badge dapat dimatikan terpisah di pengaturan OS.
- Android: dukungan push bergantung browser dan izin sistem. Badge ikon mengikuti launcher dan notifikasi sistem; angka khusus dari Badging API tidak tersedia secara seragam.
- Izin, penghematan baterai, jaringan, browser, dan pengaturan OS dapat memengaruhi tampilan/waktu kirim. Email serta pusat notifikasi tetap tersedia sebagai pendamping. Memasang shortcut saja belum mengaktifkan push.

Rujukan resmi:

- [WebKit: Web Push untuk Home Screen web apps](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [WebKit: badge untuk Home Screen web apps](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/)
- [Chrome: Badging API dan perilaku Android](https://developer.chrome.com/docs/capabilities/web-apis/badging-api)
- [MDN: praktik penggunaan Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices)
- [MDN: WorkerNavigator.setAppBadge](https://developer.mozilla.org/en-US/docs/Web/API/WorkerNavigator/setAppBadge)

## Urutan implementasi

1. Satukan sumber notifikasi dan lengkapi pemicu pekerjaan App ke AMS; uji penerima, duplikasi, retry, dan pembatalan.
2. Tambahkan manifest, ikon AMS yang benar, service worker minimal, panduan pemasangan, dan layar pengaturan perangkat.
3. Tambahkan subscription dan push worker, integrasikan kanal email yang sudah ada, serta konfigurasi Supabase Cron/Vault AMS.
4. Tambahkan badge, deep link dengan pemulihan sesi, preferensi per kategori, dan pengingat terbatas.
5. Tambahkan status operasional yang mudah dibaca admin: menunggu respons, kanal aktif, pengiriman gagal, serta tindakan kirim ulang yang tidak menggandakan pesan.
6. Uji pada perangkat nyata lalu rilis bertahap ke akun uji, admin, dan associate yang bersedia mengaktifkan push. Jangan mengirim ulang seluruh undangan historis ketika fitur dinyalakan.

## Kriteria siap rilis

- Undangan program dan tim konsultan muncul pada penerima yang benar; konsultan menerima pekerjaan miliknya, bukan seluruh pekerjaan tim.
- Push tampil ketika halaman AMS tidak sedang dibuka pada Android dan PWA iPhone yang didukung dan sudah memberi izin.
- Penolakan izin, langganan kedaluwarsa, perangkat offline, kegagalan provider, dan preferensi email nonaktif mempunyai status yang benar, tanpa klaim palsu "sudah dibaca".
- Ketuk notifikasi menuju tujuan yang tepat dengan sesi aktif maupun sesi habis; pengguna tanpa kewenangan tidak memperoleh akses.
- Badge sinkron dengan jumlah belum dibaca pada platform yang mendukung; membaca tidak menandai tugas selesai.
- Logout, pergantian akun, beberapa perangkat, penugasan ulang, undangan ditarik, dan keanggotaan dijeda/diakhiri tidak membocorkan pekerjaan atau mengirim pengingat usang.
- Retry bersamaan, worker terhenti, dan pengiriman sebagian berhasil tidak menggandakan pesan ataupun menghilangkan retry perangkat yang gagal.
- Scheduler dan catatan pengiriman diperiksa di lingkungan AMS yang benar. Uji push/email nyata hanya memakai penerima yang secara khusus diizinkan.

## Penyiapan produksi

1. Buka **SQL Editor** di proyek Supabase AMS. Jalankan `packages/database/migrations/015_notification_delivery.sql`, lalu `packages/database/migrations/016_notification_scheduler.sql`. Job AMS terpasang dalam keadaan nonaktif.
2. Di proyek Supabase App/API BinaHub, jalankan `binahub-api/supabase/migrations/0094_consultant_notification_outbox.sql`. Antrean App memakai worker pemulihan laporan yang sudah berjalan.
3. Rilis API dan web AMS, lalu API BinaHub. Periksa bahwa manifest dan service worker AMS dapat dimuat. Job notifikasi memanggil endpoint API AMS, yang dideploy terpisah dari web AMS.
4. Buat pasangan kunci khusus AMS di terminal lokal repo AMS dengan `pnpm --filter @ams/api exec web-push generate-vapid-keys`. Simpan pasangan kunci untuk instalasi ini.
5. Di **Settings → Environment Variables** project Vercel API AMS, tambahkan `AMS_VAPID_PUBLIC_KEY`, `AMS_VAPID_PRIVATE_KEY`, dan `AMS_NOTIFICATION_WORKER_SECRET` untuk Production. Buat secret worker di terminal dengan `node -p "require('node:crypto').randomBytes(32).toString('hex')"`. Nilai `AMS_VAPID_SUBJECT` opsional dan defaultnya `mailto:admin@binahub.id`. Atur `AMS_PUSH_ENABLED=true` ketika siap memulai uji perangkat, lalu redeploy API AMS.
6. Di proyek Supabase **AMS**, buka **Integrations → Vault → Secrets → Add new secret**. Gunakan nama `ams_notification_worker_secret` dan nilai yang sama dengan `AMS_NOTIFICATION_WORKER_SECRET` di Vercel. Simpan private key VAPID dan secret worker di tempat tersebut sesuai fungsinya. [Panduan Vault](https://supabase.com/docs/guides/database/vault).
7. Di **SQL Editor AMS**, aktifkan job dengan `select ams_scheduler.set_notification_cron_enabled(true);`. Tunggu satu putaran cron, lalu jalankan `select ams_scheduler.notification_cron_status();`. Hasil yang diharapkan adalah `active: true`, `credentialConfigured: true`, dan `httpStatus: 200`. [Panduan Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).

Untuk jeda pengiriman terjadwal AMS, jalankan `select ams_scheduler.set_notification_cron_enabled(false);`. Untuk menutup pendaftaran push dan mematikan email otomatis baru dari perubahan pekerjaan konsultasi, kembalikan `AMS_PUSH_ENABLED=false` di API AMS dan redeploy.

## Uji perangkat setelah rilis

1. Di Android, buka AMS dengan Chrome, masuk ke akun uji, lalu pilih **Pengaturan → Notifikasi HP → Pasang AMS**. Di iPhone, gunakan **Bagikan → Tambah ke Layar Utama** lalu buka AMS dari ikon. [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
2. Pilih **Aktifkan notifikasi HP**, izinkan permintaan sistem, lalu pilih **Kirim notifikasi uji**. Tutup tampilan AMS dan cek panel notifikasi HP. Ketuk pesan untuk kembali ke pusat notifikasi.
3. Gunakan satu undangan dan penugasan untuk akun uji yang sudah disiapkan. Buka pemberitahuan saat sesi aktif dan sesudah masuk kembali. Periksa badge, filter **Perlu tindakan**, dan tujuan ke undangan atau pekerjaan terkait.
4. Alihkan penugasan ke konsultan uji lain dan ubah jadwal. Pastikan penerima sebelumnya tidak mendapat pengingat baru. Di admin, pilih **Notifikasi → Pantau pengiriman** untuk melihat status proses.
