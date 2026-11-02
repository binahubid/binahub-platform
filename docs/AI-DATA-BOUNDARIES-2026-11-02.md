# R05 — minimisasi data AI AMS

AMS/API0.11.2, 2 November2026; web tetap0.10.2. Tidak ada migrasi database,
env baru, perubahan role/izin, harga, worker atau proses persetujuan profil.

## Ranking kandidat

`rankCandidates` hanya mengirim judul/lingkup, peran dan kualifikasi kandidat
(roles, expertises, skills, bio). Nama klien, nama kandidat, ID database,
kontak, field tambahan dan URL tidak diperlukan untuk ranking.

Setiap kandidat diberi `candidate-N` per pemanggilan. Referensi dan skor respons
divalidasi; ID asing/duplikat atau skor tidak valid diabaikan. ID asli dipasang
kembali dari record server. Model tidak menjadi sumber identitas. Alasan yang
ditampilkan dibatasi dan tidak memuat referensi sementara. Kandidat kosong
tidak memicu request AI.

Prompt dipersiapkan sebelum memilih client: batas yang sama berlaku untuk
managed gateway BinaHub dan jalur legacy langsung. Tidak ada fallback yang
melewati provider yang dimatikan admin; HMAC dan kebijakan retry tetap.

## Parsing CV: pengecualian yang diperlukan

Parsing CV bertujuan mengisi profil dari dokumen pengguna. Nama, email, telepon,
riwayat kerja dan tautan portofolio di CV masih dapat dikirim ke provider untuk
ekstraksi. Jalur ini **bukan anonim**. Pola kredensial (termasuk label dalam teks
JSON ter-escape) dihapus sebelum request. `OpenAIProvider` yang sama dipakai oleh
managed/direct dan percobaan fallback CV, sehingga pemilihan provider tidak
menghilangkan batas ini. Default/normalisasi field profil dipertahankan.

Helper insight generik memakai allowlist kualifikasi/ringkasan dan skor numerik,
bukan seluruh objek profil. Summarize membatasi pola kontak/URL/kredensial.
Keduanya bukan pengganti kebijakan privasi untuk penggunaan baru.

## Keterbatasan

Redaksi menggunakan identitas yang diketahui dan pola, bukan DLP/NER lengkap.
Nama/alamat dalam teks bebas, format kontak tersamarkan, atau rahasia yang
tidak sesuai pola masih bisa lolos. Jangan menambahkan kontak/dokumen sensitif
ke bio/lingkup. Patch tidak menghapus data yang pernah dikirim atau memverifikasi
retensi/pelatihan pada provider. Gateway AMS hanya transport bertanda tangan;
deployment AMS lama tetap perlu diperbarui agar memakai proyeksi ranking ini.

## Bukti lokal

- `test:ai:privacy`: 4 tes sintetis, termasuk kredensial JSON, CV tetap mengisi
  identitas yang diperlukan, ranking memakai refs dan input asal tidak berubah.
- `test:ai-managed`: HMAC, request CV/ranking dan larangan bypass/duplikasi.
- `test:ai-router`: LapakVIP overload ke OpenRouter, normalisasi JSON dan schema.
- Kontrak dependency/validator/API, lint, tipe API dan build API/web dipertahankan.
  Frozen lockfile memakai pnpm9.15.0 melalui Corepack, bukan pnpm global.
- Semua tes memakai mock/loopback dan data sintetis, bukan provider berbayar,
  database/akun produksi atau email nyata. CI mencakup tes privasi baru.

Deploy bersama API BinaHub0.47.4. Periksa versi hasil deployment dan lakukan
validasi terkontrol dengan data sintetis; push/build lokal bukan bukti produksi
sudah aktif. Tidak ada pentest Strix baru pada batch ini.
