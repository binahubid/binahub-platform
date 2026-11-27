# Rancangan Referral Associate BinaHub

## Tujuan pilot

Associate dapat memperkenalkan calon klien dan mengetahui hasil perkenalannya di AMS. Admin tetap mengelola penugasan dan penawaran. Satu peluang memiliki satu referral yang tervalidasi sehingga laporan dan imbalan bisa ditelusuri.

## Alur untuk associate dan calon klien

1. **Ambil tautan dari AMS.** Associate aktif membuka menu Referral lalu menyalin link ke situs BinaHub atau kode singkat. Tautan memakai kode acak yang bisa diganti jika perlu. Pesan pengantar bisa disalin untuk dibagikan oleh associate.
2. **Calon klien memilih jalurnya.** Navigasi situs membawa referensi yang tervalidasi ke Rekomendasi Program, Diagnosis Tim, Self Diagnostic Individu, Inquiry, dan pemesanan konsultasi. Halaman katalog meneruskan referensi saat pengunjung memulai salah satu jalur.
3. **Referral terlihat saat mengisi kontak.** Jika pengunjung datang dari tautan yang valid, formulir menampilkan bahwa referensi sudah tercatat dan field hanya bisa dibaca. Tanpa tautan, pengunjung boleh memasukkan kode secara manual. Kode yang salah diberi umpan balik agar bisa diperbaiki atau pengisian dilanjutkan.
4. **Calon klien mengirim formulir atau menyelesaikan booking.** Sistem mencatat jalur masuk dan mencocokkannya ke calon klien atau peluang yang ada. Admin meninjau atribusi jika datanya bertabrakan atau kontaknya sudah tercatat.
5. **Associate memantau dan menindaklanjuti.** Di AMS, associate melihat rujukan yang tercatat atas namanya. Ia dapat menyimpan catatan kontak, tanggal cek kembali, atau meminta admin membantu. Admin menugaskan peluang ke konsultan melalui alur yang sudah berjalan.

## Aturan atribusi yang diusulkan

| Situasi | Perlakuan |
| --- | --- |
| Tautan aktif dibuka | Catat referral valid pertama selama 30 hari sebagai usulan jendela pilot. Pertahankan konteks ketika pengunjung pindah halaman atau domain milik BinaHub. |
| Tautan associate lain dibuka sebelum pengiriman | Pertahankan referral pertama yang masih valid. Koreksi setelah konfirmasi admin, dengan alasan yang dicatat. |
| Pengunjung pindah perangkat, menghapus data browser, atau datang langsung | Tampilkan isian kode manual saat kontak diserahkan. Admin bisa mengonfirmasi asal rujukan dengan persetujuan calon klien jika kode hilang. |
| Kode dimasukkan dari formulir | Validasi di server. Field terkunci setelah validasi. Nama dan email associate tetap berada di AMS. |
| Kontak atau organisasi sudah menjadi peluang aktif | Kaitkan perkembangannya ke peluang yang sudah ada. Admin meninjau apakah referral ini membawa kebutuhan baru yang memenuhi syarat. |
| Orang yang sama memakai lebih dari satu jalur | Simpan riwayat jalur masuk di bawah satu rujukan. Status peluang dan imbalan dihitung sekali. |
| Booking dibuat melalui Cal.com | Jika konteks dapat diteruskan dari tautan BinaHub, cocokkan dengan ID booking dan kontak dari integrasi yang ada. Booking langsung tanpa kode masuk daftar rekonsiliasi admin. |
| Associate menonaktifkan kode atau berhenti aktif | Tautan baru tidak bisa mencatat rujukan. Riwayat yang sudah tervalidasi tetap bisa ditinjau admin. |

Gunakan ID kunjungan BinaHub yang sudah ada untuk menjaga kesinambungan perjalanan. Simpan validasi rujukan dan atribusi akhir di server. Hitungan kunjungan dapat digunakan untuk mengukur minat. Prospek baru dibuat ketika ada pengisian atau booking yang benar-benar tercatat.

## Tampilan dan monitoring

| Associate | Admin BinaHub |
| --- | --- |
| Tautan, kode, dan tindakan salin | Daftar affiliate yang aktif dan kode yang terkait |
| Daftar rujukan sendiri dengan nama organisasi atau nama yang boleh ditampilkan, jalur masuk, tanggal masuk, tahap, dan tindakan berikutnya | Antrean rujukan baru, konflik, kontak ganda, referensi manual, dan peluang tanpa pemilik |
| Filter jalur dan status. Ringkasan rujukan masuk, terverifikasi, dalam pembahasan, dan berhasil | Jumlah kunjungan, pengisian selesai, prospek valid, meeting, proposal, dan transaksi aktif per jalur atau associate |
| Catatan follow-up dan pengingat pribadi untuk kontak yang mengizinkan tindak lanjut | Penugasan, koreksi atribusi, motif penolakan, dan riwayat perubahan serta imbalan |

Tahap rujukan mengikuti peluang di App BinaHub. Gunakan status pengenalan **Masuk → Terverifikasi → Dalam pembahasan → Disepakati → Selesai** dengan alasan jika ditutup. Imbalan punya status terpisah untuk **Ditinjau**, **Disetujui**, dan **Dibayarkan**. Associate hanya melihat status dan ringkasan kontak yang boleh dibagikan. Hasil diagnosis, jawaban, PDF, dan isi diskusi konsultan tetap berada di sistem asal dengan akses yang sudah berlaku.

## Manfaat untuk pilot

- **Untuk calon klien.** Arahkan ke jalur yang tepat, dengan opsi sesi awal untuk membahas kebutuhan dan langkah berikutnya. Nilai manfaat bisa diberikan tanpa mengubah harga katalog.
- **Untuk associate.** Beri pelacakan yang transparan, pengakuan atas perkenalan yang tervalidasi, dan opsi imbalan satu kali jika perkenalan menghasilkan transaksi yang sudah dibayar sesuai kebijakan CEO.
- **Untuk BinaHub.** Hubungkan asal peluang dengan hasil penjualan dan lihat jalur mana yang paling sering menghasilkan pembahasan. Admin dapat memprioritaskan tindak lanjut berdasarkan kebutuhan, kesiapan, dan tahap klien.

Pilot memakai persetujuan admin untuk klaim yang sama, rujukan diri sendiri, dan rujukan atas klien yang sudah aktif. Aturan nominal, pembayaran parsial, pembatalan, pengembalian dana, serta kapan hak imbalan timbul perlu keputusan CEO sebelum ada penawaran imbalan.

## Urutan implementasi setelah rancangan disetujui

1. Kode associate, tautan, propagasi lintas situs, validasi field manual dan otomatis, serta pencatatan jalur masuk.
2. Daftar referral dan catatan tindak lanjut di AMS, serta antrean verifikasi dan rekonsiliasi untuk admin.
3. Tautkan status transaksi dan sistem imbalan setelah aturannya disetujui. Gunakan pilot dengan beberapa associate untuk menguji alur tautan, cross-device, kontak ganda, booking dan perubahan status.
