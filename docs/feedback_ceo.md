# Panduan Perbaikan: 27 Feedback CEO

Dokumen ini berisi daftar lengkap 27 poin feedback perbaikan hasil meeting dengan CEO untuk pembaruan sistem **BinaApps AMS**.

---

### Bagian 1: Landing Page & Onboarding

| No | Komponen (Existing) | Perbaikan & Penyesuaian (Feedback CEO) |
|---|---|---|
| **1** | Satu profil profesional untuk seluruh perjalanan associate Anda. | **Sistem Kelola profil profesional Associate BinaHub** |
| **2** | Profil Anda aktif dan ditampilkan kepada klien. | **Profil Anda telah aktif** |
| **3** | Platform yang mendukung associate dari pendaftaran hingga karir senior berkembang. | **Platform yang mendukung associate mulai dari pendaftaran, penugasan, dan evaluasi diri.** |
| **4** | Siap untuk assignment. | **Siap untuk penugasan** |
| **5** | BinaHub AMS adalah platform untuk mengelola profil profesional... | **BinaHub AMS (Associate Management System) adalah platform untuk mengelola profil profesional, portofolio, dan peluang penugasan/proyek bagi associate yang terdaftar di database BinaHub.** |
| **6** | Bergabung dengan ribuan associate... Gratis selamanya... | **Bergabung dengan para profesional lain yang telah memulai membangun karir mereka di ekosistem BinaHub.** |
| **7** | Zona waktu. | **Tambahkan pilihan Zona waktu Saudi dan Australia.** |
| **8** | Pilih peran utama Anda di BinaHub. | **Pilih maksimal 7 peran utama yang ingin Anda kontribusikan di BinaHub.** |
| **9** | Daftar Peran Utama (Roles). | **Hapus peran yang di-highlight merah, dan tambahkan:**<br>• Tour Leader<br>• Project Manager<br>• EO (Event Organizer)<br>• MC (Master of Ceremony)<br>• Game Master<br>• Photographer<br>• Videographer<br>• Affiliate Marketer<br>• AI Consultant |
| **10** | Bidang Keahlian Utama (Expertises). | **Bidang Keahlian Utama (maksimal pilih 5):**<br>• Leadership Development<br>• Team Development<br>• Learning & Facilitation<br>• Coaching & Mentoring<br>• Assessment & Talent<br>• Organization Development<br>• Performance & Execution<br>• Business Consulting<br>• Learning Design<br>• Measurement & Analytics<br>• AI & Digital Transformation<br>• Spiritual & Character Development |
| **11** | Pertahankan progres Anda! | **Tingkatkan & update progres Anda!** |

---

### Bagian 2: Pengelolaan Profil & Dokumen

| No | Komponen (Existing) | Perbaikan & Penyesuaian (Feedback CEO) |
|---|---|---|
| **12** | Tes Kemampuan. | **Tes ini akan dibutuhkan nanti, bukan sekarang. Jadi di-hide aja dulu.** |
| **13** | Sertifikasi & Kredensial. | **Gunakan model upload file pendukung berbentuk PDF / PNG / JPG.** |
| **14** | Portofolio & Hasil Karya. | **Berikan opsi upload screenshot testimoni/foto/dokumentasi serta tautan sosial media atau portofolio hasil proyek.** |

---

### Bagian 3: Portal Admin & Fitur Pencarian

| No | Komponen (Existing) | Perbaikan & Penyesuaian (Feedback CEO) |
|---|---|---|
| **15** | Di admin: CV Diupload. | **Masih tertulis "0" saat CV diunggah. Check & fix bugs upload registry.** |
| **16** | Fitur Associates di Admin. | **Tambahkan fitur pencarian berdasarkan keahlian (saat ini baru bisa mencari berdasarkan nama saja).** |

---

### Bagian 4: Pengelolaan Assignment (Penugasan)

| No | Komponen (Existing) | Perbaikan & Penyesuaian (Feedback CEO) |
|---|---|---|
| **17** | Assignment: Judul *. | **Ubah label "Judul *" menjadi "Nama Proyek".** |
| **18** | Role yang Dibutuhkan. | **Ubah input text (koma) menjadi pilihan checkbox (pilih centang, bisa beberapa role sekaligus).** |
| **19** | Durasi. | **Tambahkan input angka untuk durasi mandays (hari kerja).** |
| **20** | Jumlah Dibutuhkan. | **Ganti label/kolom menjadi "Kompensasi".** |
| **21** | Publikasi Assignment. | **Hanya associate yang diundang yang bisa melihat assignment. AI harus menyortir berdasarkan kualifikasi yang dibutuhkan dan diranking.** |
| **22** | Detail Undangan Proyek. | **Seluruh informasi proyek dari admin harus terlihat lengkap sebelum associate memutuskan terima/tolak. Ketika tombol "Terima" diklik, harus muncul modal surat perjanjian yang wajib dibaca, lengkap dengan checkbox persetujuan kontrak. Tombol "Terima" di dalam modal hanya aktif jika checkbox dicentang.** |
| **23** | Penyelesaian Tugas. | **Associate harus mengunggah bukti penyelesaian tugas untuk direview oleh admin. Nanti admin yang dapat mengklik selesai atau mengembalikannya jika perlu revisi/data tambahan.** |

---

### Bagian 5: Pusat Bantuan & Navigasi Sidebar

| No | Komponen (Existing) | Perbaikan & Penyesuaian (Feedback CEO) |
|---|---|---|
| **24** | Pusat Bantuan di Admin. | **Email ke IT support / chat WA.** |
| **25** | Pusat Bantuan di Associate. | **Saat ini belum ada. Tambahkan menu bantuan dengan opsi email ke IT support / chat WA.** |
| **26** | Menu Penilaian & Pengembangan. | **Sembunyikan sementara menu Assessment, Development Plan, dan Capability dari sidebar Associate (termasuk tes asesmen).** |
| **27** | Menu Tugas (Task) di Associate. | **Dihapus dari menu sidebar.** |

---

### Bagian 6: Aturan Desain Tambahan (Aesthetics Constraint)
- **Batasan Border Radius (Rounded)**:
  - Kurangi tingkat kebulatan border-radius di seluruh halaman profil associate agar tidak terlalu melingkar.
  - Batas maksimal untuk border-radius adalah **12px** (`rounded-xl` di Tailwind CSS). Hindari penggunaan `rounded-2xl` (16px) atau `rounded-3xl` (24px) pada container card halaman profil.
