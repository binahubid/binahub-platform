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
    <div className="space-y-5">
      {/* Title */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Syarat & Ketentuan</h1>
        <p className="mt-1 text-sm font-medium text-[#0B2C6B]">BinaHub Associate Management System</p>
      </div>

      {/* Intro */}
      <div className="space-y-2 text-[15px] leading-relaxed text-slate-700">
        <p>Selamat datang di BinaHub Associate Management System (AMS).</p>
        <p>
          Dengan membuat akun dan mengisi data pada sistem ini, Anda menyatakan telah membaca, memahami, dan menyetujui
          syarat dan ketentuan berikut.
        </p>
      </div>

      {/* Section 1 */}
      <Section number={1} title="Tujuan Penggunaan">
        BinaHub Associate Management System (AMS) merupakan platform yang digunakan untuk mengelola profil profesional
        Associate BinaHub, memetakan kompetensi, serta mendukung proses kolaborasi pada berbagai program dan proyek
        BinaHub.
      </Section>

      {/* Section 2 */}
      <Section number={2} title="Keakuratan Data">
        <p>
          Associate bertanggung jawab untuk memberikan informasi yang benar, lengkap, dan terkini.
        </p>
        <p className="mt-1.5">
          Associate juga diharapkan memperbarui data apabila terdapat perubahan, seperti pengalaman proyek, sertifikasi,
          pendidikan, atau informasi profesional lainnya.
        </p>
      </Section>

      {/* Section 3 */}
      <Section number={3} title="Penggunaan Data">
        <p>
          Data yang diberikan melalui AMS akan digunakan oleh PT BinaHub Solusi Transformasi untuk:
        </p>
        <ul className="mt-1.5 space-y-1 pl-1">
          {[
            'Mengelola database Associate.',
            'Melakukan pemetaan kompetensi.',
            'Proses seleksi dan penugasan proyek.',
            'Penyusunan proposal dan dokumen pendukung.',
            'Komunikasi terkait peluang kolaborasi.',
            'Pengembangan layanan dan sistem BinaHub.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0B2C6B]" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          BinaHub berkomitmen menjaga kerahasiaan data sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.
        </p>
      </Section>

      {/* Section 4 */}
      <Section number={4} title="Hak Kekayaan Intelektual">
        <p>
          Seluruh data, dokumen, portofolio, dan materi yang diunggah oleh Associate tetap menjadi milik Associate.
        </p>
        <p className="mt-1.5">
          Associate memberikan izin kepada BinaHub untuk menggunakan data profesional tersebut sepanjang diperlukan dalam
          rangka proses penawaran, proposal, tender, pemasaran layanan, dan pelaksanaan proyek yang melibatkan Associate.
        </p>
      </Section>

      {/* Section 5 */}
      <Section number={5} title="Keanggotaan Associate">
        <p>
          Pengisian data pada AMS merupakan proses pendaftaran dan pemetaan kompetensi.
        </p>
        <p className="mt-1.5">
          Pengisian formulir tidak secara otomatis menjadikan seseorang sebagai Associate aktif maupun menjamin
          keterlibatan dalam proyek tertentu.
        </p>
        <p className="mt-1.5">
          Keputusan mengenai penerimaan Associate maupun penugasan proyek sepenuhnya menjadi kewenangan BinaHub
          berdasarkan kebutuhan, kompetensi, pengalaman, ketersediaan, dan pertimbangan lainnya.
        </p>
      </Section>

      {/* Section 6 */}
      <Section number={6} title="Penugasan Proyek">
        Apabila Associate dipilih untuk suatu proyek, BinaHub akan menghubungi Associate secara terpisah untuk proses
        konfirmasi, ruang lingkup pekerjaan, jadwal, honorarium, dan ketentuan kerja sama yang berlaku pada proyek
        tersebut.
      </Section>

      {/* Section 7 */}
      <Section number={7} title="Kerahasiaan">
        <p>
          Associate diharapkan menjaga kerahasiaan seluruh informasi yang diperoleh selama proses komunikasi maupun
          pelaksanaan proyek bersama BinaHub.
        </p>
        <p className="mt-1.5">
          Ketentuan kerahasiaan yang lebih rinci dapat diatur dalam perjanjian tersendiri apabila diperlukan.
        </p>
      </Section>

      {/* Section 8 */}
      <Section number={8} title="Penggunaan Akun">
        <p>
          Associate bertanggung jawab atas keamanan akun dan informasi login yang dimiliki.
        </p>
        <p className="mt-1.5">
          Associate tidak diperkenankan memberikan akses akun kepada pihak lain tanpa persetujuan BinaHub.
        </p>
      </Section>

      {/* Section 9 */}
      <Section number={9} title="Pembaruan Sistem">
        BinaHub dapat melakukan perubahan, pengembangan, maupun pembaruan terhadap fitur dan layanan AMS dari waktu ke
        waktu untuk meningkatkan kualitas sistem.
      </Section>

      {/* Section 10 */}
      <Section number={10} title="Perubahan Syarat & Ketentuan">
        BinaHub berhak memperbarui syarat dan ketentuan ini sewaktu-waktu. Perubahan akan diinformasikan melalui AMS
        atau media komunikasi resmi BinaHub.
      </Section>

      {/* Section 11 */}
      <Section number={11} title="Persetujuan">
        Dengan mencentang kotak persetujuan dan menggunakan BinaHub Associate Management System (AMS), Associate
        menyatakan telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang berlaku.
      </Section>
    </div>
  );
}

function KebijakanPrivasi() {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kebijakan Privasi</h1>
        <p className="mt-1 text-sm font-medium text-[#0B2C6B]">BinaHub Associate Management System</p>
        <p className="mt-1.5 text-sm text-slate-500">Terakhir diperbarui: Juli 2026</p>
      </div>

      {/* Intro */}
      <div className="space-y-2 text-[15px] leading-relaxed text-slate-700">
        <p>
          PT BinaHub Solusi Transformasi (&quot;BinaHub&quot;) menghargai dan melindungi privasi setiap Associate yang
          menggunakan BinaHub Associate Management System (AMS).
        </p>
        <p>
          Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data
          pribadi yang Anda berikan melalui AMS.
        </p>
      </div>

      {/* Section 1 */}
      <Section number={1} title="Data yang Kami Kumpulkan">
        <p>Kami dapat mengumpulkan data yang Anda berikan secara langsung, antara lain:</p>
        <ul className="mt-1.5 space-y-1 pl-1">
          {[
            'Nama lengkap',
            'Informasi kontak (email dan nomor telepon)',
            'Kota domisili',
            'Foto profil',
            'Curriculum Vitae (CV)',
            'Riwayat pendidikan',
            'Pengalaman kerja dan proyek',
            'Sertifikasi',
            'Kompetensi dan bidang keahlian',
            'Portofolio',
            'Tautan profesional (misalnya LinkedIn atau website pribadi)',
            'Informasi lain yang Anda pilih untuk dibagikan melalui AMS.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0B2C6B]" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* Section 2 */}
      <Section number={2} title="Tujuan Penggunaan Data">
        <p>Data yang Anda berikan digunakan untuk:</p>
        <ul className="mt-1.5 space-y-1 pl-1">
          {[
            'Mengelola profil Associate.',
            'Memetakan kompetensi dan pengalaman Associate.',
            'Mencari kandidat yang sesuai untuk kebutuhan proyek.',
            'Menyusun proposal, dokumen tender, dan dokumen pendukung lainnya.',
            'Menghubungi Associate terkait peluang kolaborasi.',
            'Mengembangkan layanan dan sistem BinaHub.',
            'Melakukan analisis dan peningkatan kualitas layanan.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0B2C6B]" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* Section 3 */}
      <Section number={3} title="Penggunaan AI">
        <p>AMS dapat memanfaatkan teknologi Artificial Intelligence (AI) untuk membantu:</p>
        <ul className="mt-1.5 space-y-1 pl-1">
          {[
            'Membaca dan mengekstrak informasi dari CV.',
            'Membantu mengisi data profil secara otomatis.',
            'Mengelompokkan kompetensi dan pengalaman.',
            'Memberikan rekomendasi yang mendukung proses administrasi dan pencarian kandidat.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0B2C6B]" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Penggunaan AI bertujuan meningkatkan efisiensi dan kualitas data. Keputusan akhir mengenai penerimaan Associate
          maupun penugasan proyek tetap dilakukan oleh tim BinaHub.
        </p>
      </Section>

      {/* Section 4 */}
      <Section number={4} title="Penyimpanan dan Keamanan Data">
        <p>
          Kami berupaya menjaga keamanan data melalui pengelolaan sistem, kontrol akses, dan langkah-langkah teknis yang
          wajar untuk mencegah akses, penggunaan, atau pengungkapan data tanpa izin.
        </p>
        <p className="mt-1.5">
          Meskipun demikian, tidak ada sistem yang dapat menjamin keamanan secara mutlak. Oleh karena itu, kami juga
          mengharapkan Associate menjaga kerahasiaan informasi akun yang dimiliki.
        </p>
      </Section>

      {/* Section 5 */}
      <Section number={5} title="Berbagi Data">
        <p>BinaHub tidak menjual maupun memperdagangkan data pribadi Associate.</p>
        <p className="mt-1.5">Data hanya dapat digunakan atau dibagikan apabila diperlukan untuk:</p>
        <ul className="mt-1.5 space-y-1 pl-1">
          {[
            'Proses penawaran kepada calon klien.',
            'Proposal atau tender.',
            'Pelaksanaan proyek.',
            'Kewajiban hukum yang berlaku.',
            'Persetujuan dari Associate apabila diperlukan.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0B2C6B]" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2">Kami hanya membagikan informasi yang relevan dengan kebutuhan tersebut.</p>
      </Section>

      {/* Section 6 */}
      <Section number={6} title="Hak Associate">
        <p>Associate berhak untuk:</p>
        <ul className="mt-1.5 space-y-1 pl-1">
          {[
            'Melihat data yang dimiliki.',
            'Memperbarui data profil.',
            'Memperbaiki informasi yang tidak akurat.',
            'Menghapus atau menutup akun, sepanjang tidak bertentangan dengan kewajiban hukum atau administrasi yang masih berjalan.',
            'Menghubungi BinaHub apabila memiliki pertanyaan mengenai penggunaan data pribadi.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0B2C6B]" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* Section 7 */}
      <Section number={7} title="Penyimpanan Data">
        <p>
          Data Associate akan disimpan selama masih diperlukan untuk mendukung hubungan kerja sama, proses administrasi,
          atau kepentingan operasional BinaHub.
        </p>
        <p className="mt-1.5">
          Apabila Associate tidak lagi menggunakan AMS, BinaHub dapat menghapus atau mengarsipkan data sesuai kebutuhan
          operasional dan ketentuan yang berlaku.
        </p>
      </Section>

      {/* Section 8 */}
      <Section number={8} title="Perubahan Kebijakan Privasi">
        BinaHub dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Versi terbaru akan selalu tersedia melalui
        AMS.
      </Section>

      {/* Section 9 */}
      <Section number={9} title="Hubungi Kami">
        Apabila Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, silakan menghubungi PT BinaHub Solusi
        Transformasi melalui saluran komunikasi resmi yang tersedia.
      </Section>

      {/* Consent */}
      <div className="rounded-xl border border-[#0B2C6B]/20 bg-[#0B2C6B]/5 p-5">
        <h3 className="text-sm font-bold tracking-tight text-[#0B2C6B]">Persetujuan</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
          Dengan menggunakan BinaHub Associate Management System (AMS), Anda menyatakan telah membaca, memahami, dan
          menyetujui Kebijakan Privasi ini.
        </p>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-base font-bold tracking-tight text-slate-900">
        {number}. {title}
      </h2>
      <div className="text-[15px] leading-relaxed text-slate-700">
        {children}
      </div>
    </div>
  );
}
