'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

type Tab = 'skk' | 'privasi';

export default function SKKPage() {
  const [activeTab, setActiveTab] = useState<Tab>('skk');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="BinaHub" width={28} height={28} className="h-7 w-auto" priority />
            <span className="text-base font-semibold text-[#0B2C6B]">BinaHub</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('skk')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'skk'
                ? 'bg-[#0B2C6B] text-white shadow-md shadow-[#0B2C6B]/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Syarat & Ketentuan
          </button>
          <button
            onClick={() => setActiveTab('privasi')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'privasi'
                ? 'bg-[#0B2C6B] text-white shadow-md shadow-[#0B2C6B]/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Kebijakan Privasi
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          {activeTab === 'skk' ? <SyaratKetentuan /> : <KebijakanPrivasi />}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Terakhir diperbarui: Juli 2026
        </p>
      </main>
    </div>
  );
}

function SyaratKetentuan() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="!mb-2 text-2xl font-bold text-slate-900">Syarat & Ketentuan</h1>
      <p className="!mt-0 text-sm font-medium text-[#0B2C6B]">BinaHub Associate Management System</p>

      <p>Selamat datang di BinaHub Associate Management System (AMS).</p>

      <p>
        Dengan membuat akun dan mengisi data pada sistem ini, Anda menyatakan telah membaca, memahami, dan menyetujui
        syarat dan ketentuan berikut.
      </p>

      <h2>1. Tujuan Penggunaan</h2>
      <p>
        BinaHub Associate Management System (AMS) merupakan platform yang digunakan untuk mengelola profil profesional
        Associate BinaHub, memetakan kompetensi, serta mendukung proses kolaborasi pada berbagai program dan proyek
        BinaHub.
      </p>

      <h2>2. Keakuratan Data</h2>
      <p>
        Associate bertanggung jawab untuk memberikan informasi yang benar, lengkap, dan terkini.
      </p>
      <p>
        Associate juga diharapkan memperbarui data apabila terdapat perubahan, seperti pengalaman proyek, sertifikasi,
        pendidikan, atau informasi profesional lainnya.
      </p>

      <h2>3. Penggunaan Data</h2>
      <p>
        Data yang diberikan melalui AMS akan digunakan oleh PT BinaHub Solusi Transformasi untuk:
      </p>
      <ul>
        <li>Mengelola database Associate.</li>
        <li>Melakukan pemetaan kompetensi.</li>
        <li>Proses seleksi dan penugasan proyek.</li>
        <li>Penyusunan proposal dan dokumen pendukung.</li>
        <li>Komunikasi terkait peluang kolaborasi.</li>
        <li>Pengembangan layanan dan sistem BinaHub.</li>
      </ul>
      <p>
        BinaHub berkomitmen menjaga kerahasiaan data sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.
      </p>

      <h2>4. Hak Kekayaan Intelektual</h2>
      <p>
        Seluruh data, dokumen, portofolio, dan materi yang diunggah oleh Associate tetap menjadi milik Associate.
      </p>
      <p>
        Associate memberikan izin kepada BinaHub untuk menggunakan data profesional tersebut sepanjang diperlukan dalam
        rangka proses penawaran, proposal, tender, pemasaran layanan, dan pelaksanaan proyek yang melibatkan Associate.
      </p>

      <h2>5. Keanggotaan Associate</h2>
      <p>
        Pengisian data pada AMS merupakan proses pendaftaran dan pemetaan kompetensi.
      </p>
      <p>
        Pengisian formulir tidak secara otomatis menjadikan seseorang sebagai Associate aktif maupun menjamin
        keterlibatan dalam proyek tertentu.
      </p>
      <p>
        Keputusan mengenai penerimaan Associate maupun penugasan proyek sepenuhnya menjadi kewenangan BinaHub
        berdasarkan kebutuhan, kompetensi, pengalaman, ketersediaan, dan pertimbangan lainnya.
      </p>

      <h2>6. Penugasan Proyek</h2>
      <p>
        Apabila Associate dipilih untuk suatu proyek, BinaHub akan menghubungi Associate secara terpisah untuk proses
        konfirmasi, ruang lingkup pekerjaan, jadwal, honorarium, dan ketentuan kerja sama yang berlaku pada proyek
        tersebut.
      </p>

      <h2>7. Kerahasiaan</h2>
      <p>
        Associate diharapkan menjaga kerahasiaan seluruh informasi yang diperoleh selama proses komunikasi maupun
        pelaksanaan proyek bersama BinaHub.
      </p>
      <p>
        Ketentuan kerahasiaan yang lebih rinci dapat diatur dalam perjanjian tersendiri apabila diperlukan.
      </p>

      <h2>8. Penggunaan Akun</h2>
      <p>
        Associate bertanggung jawab atas keamanan akun dan informasi login yang dimiliki.
      </p>
      <p>
        Associate tidak diperkenankan memberikan akses akun kepada pihak lain tanpa persetujuan BinaHub.
      </p>

      <h2>9. Pembaruan Sistem</h2>
      <p>
        BinaHub dapat melakukan perubahan, pengembangan, maupun pembaruan terhadap fitur dan layanan AMS dari waktu ke
        waktu untuk meningkatkan kualitas sistem.
      </p>

      <h2>10. Perubahan Syarat & Ketentuan</h2>
      <p>
        BinaHub berhak memperbarui syarat dan ketentuan ini sewaktu-waktu. Perubahan akan diinformasikan melalui AMS
        atau media komunikasi resmi BinaHub.
      </p>

      <h2>11. Persetujuan</h2>
      <p>
        Dengan mencentang kotak persetujuan dan menggunakan BinaHub Associate Management System (AMS), Associate
        menyatakan telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang berlaku.
      </p>
    </div>
  );
}

function KebijakanPrivasi() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="!mb-2 text-2xl font-bold text-slate-900">Kebijakan Privasi</h1>
      <p className="!mt-0 text-sm font-medium text-[#0B2C6B]">BinaHub Associate Management System</p>

      <p>Terakhir diperbarui: Juli 2026</p>

      <p>
        PT BinaHub Solusi Transformasi (&quot;BinaHub&quot;) menghargai dan melindungi privasi setiap Associate yang
        menggunakan BinaHub Associate Management System (AMS).
      </p>
      <p>
        Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data
        pribadi yang Anda berikan melalui AMS.
      </p>

      <h2>1. Data yang Kami Kumpulkan</h2>
      <p>Kami dapat mengumpulkan data yang Anda berikan secara langsung, antara lain:</p>
      <ul>
        <li>Nama lengkap</li>
        <li>Informasi kontak (email dan nomor telepon)</li>
        <li>Kota domisili</li>
        <li>Foto profil</li>
        <li>Curriculum Vitae (CV)</li>
        <li>Riwayat pendidikan</li>
        <li>Pengalaman kerja dan proyek</li>
        <li>Sertifikasi</li>
        <li>Kompetensi dan bidang keahlian</li>
        <li>Portofolio</li>
        <li>Tautan profesional (misalnya LinkedIn atau website pribadi)</li>
        <li>Informasi lain yang Anda pilih untuk dibagikan melalui AMS.</li>
      </ul>

      <h2>2. Tujuan Penggunaan Data</h2>
      <p>Data yang Anda berikan digunakan untuk:</p>
      <ul>
        <li>Mengelola profil Associate.</li>
        <li>Memetakan kompetensi dan pengalaman Associate.</li>
        <li>Mencari kandidat yang sesuai untuk kebutuhan proyek.</li>
        <li>Menyusun proposal, dokumen tender, dan dokumen pendukung lainnya.</li>
        <li>Menghubungi Associate terkait peluang kolaborasi.</li>
        <li>Mengembangkan layanan dan sistem BinaHub.</li>
        <li>Melakukan analisis dan peningkatan kualitas layanan.</li>
      </ul>

      <h2>3. Penggunaan AI</h2>
      <p>AMS dapat memanfaatkan teknologi Artificial Intelligence (AI) untuk membantu:</p>
      <ul>
        <li>Membaca dan mengekstrak informasi dari CV.</li>
        <li>Membantu mengisi data profil secara otomatis.</li>
        <li>Mengelompokkan kompetensi dan pengalaman.</li>
        <li>Memberikan rekomendasi yang mendukung proses administrasi dan pencarian kandidat.</li>
      </ul>
      <p>
        Penggunaan AI bertujuan meningkatkan efisiensi dan kualitas data. Keputusan akhir mengenai penerimaan Associate
        maupun penugasan proyek tetap dilakukan oleh tim BinaHub.
      </p>

      <h2>4. Penyimpanan dan Keamanan Data</h2>
      <p>
        Kami berupaya menjaga keamanan data melalui pengelolaan sistem, kontrol akses, dan langkah-langkah teknis yang
        wajar untuk mencegah akses, penggunaan, atau pengungkapan data tanpa izin.
      </p>
      <p>
        Meskipun demikian, tidak ada sistem yang dapat menjamin keamanan secara mutlak. Oleh karena itu, kami juga
        mengharapkan Associate menjaga kerahasiaan informasi akun yang dimiliki.
      </p>

      <h2>5. Berbagi Data</h2>
      <p>BinaHub tidak menjual maupun memperdagangkan data pribadi Associate.</p>
      <p>Data hanya dapat digunakan atau dibagikan apabila diperlukan untuk:</p>
      <ul>
        <li>Proses penawaran kepada calon klien.</li>
        <li>Proposal atau tender.</li>
        <li>Pelaksanaan proyek.</li>
        <li>Kewajiban hukum yang berlaku.</li>
        <li>Persetujuan dari Associate apabila diperlukan.</li>
      </ul>
      <p>Kami hanya membagikan informasi yang relevan dengan kebutuhan tersebut.</p>

      <h2>6. Hak Associate</h2>
      <p>Associate berhak untuk:</p>
      <ul>
        <li>Melihat data yang dimiliki.</li>
        <li>Memperbarui data profil.</li>
        <li>Memperbaiki informasi yang tidak akurat.</li>
        <li>
          Menghapus atau menutup akun, sepanjang tidak bertentangan dengan kewajiban hukum atau administrasi yang masih
          berjalan.
        </li>
        <li>Menghubungi BinaHub apabila memiliki pertanyaan mengenai penggunaan data pribadi.</li>
      </ul>

      <h2>7. Penyimpanan Data</h2>
      <p>
        Data Associate akan disimpan selama masih diperlukan untuk mendukung hubungan kerja sama, proses administrasi,
        atau kepentingan operasional BinaHub.
      </p>
      <p>
        Apabila Associate tidak lagi menggunakan AMS, BinaHub dapat menghapus atau mengarsipkan data sesuai kebutuhan
        operasional dan ketentuan yang berlaku.
      </p>

      <h2>8. Perubahan Kebijakan Privasi</h2>
      <p>
        BinaHub dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Versi terbaru akan selalu tersedia melalui
        AMS.
      </p>

      <h2>9. Hubungi Kami</h2>
      <p>
        Apabila Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, silakan menghubungi PT BinaHub Solusi
        Transformasi melalui saluran komunikasi resmi yang tersedia.
      </p>

      <h2>Persetujuan</h2>
      <p>
        Dengan menggunakan BinaHub Associate Management System (AMS), Anda menyatakan telah membaca, memahami, dan
        menyetujui Kebijakan Privasi ini.
      </p>
    </div>
  );
}
