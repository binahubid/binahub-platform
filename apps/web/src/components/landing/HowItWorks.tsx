'use client';

const steps = [
  { number: '01', title: 'Buat Akun', description: 'Daftar dengan email atau Google, langsung masuk dashboard.' },
  { number: '02', title: 'Upload CV', description: 'Unggah CV dalam format PDF atau Word.' },
  { number: '03', title: 'AI Menyusun Profil', description: 'AI mengekstrak pengalaman, keahlian, riwayat karir otomatis.' },
  { number: '04', title: 'Lengkapi Profil', description: 'Tambah portofolio, sertifikasi, dan informasi tambahan.' },
  { number: '05', title: 'Siap Mendapat Assignment', description: 'Profil Anda aktif dan ditampilkan kepada klien.' },
];

export function HowItWorks() {
  return (
    <section id="alur" className="scroll-mt-20 border-t border-slate-200/70 bg-[#F5F7FA] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header: left-right split */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9A441]">
              Cara Kerja
            </span>
            <h2 className="mt-4 text-3xl font-light tracking-[-0.025em] text-slate-900 sm:text-4xl md:text-5xl">
              Lima langkah sederhana<br />untuk memulai.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600 md:text-base">
            Dari pendaftaran hingga mendapat assignment pertama, semua berjalan dalam satu alur yang ringkas.
          </p>
        </div>

        {/* Steps: horizontal */}
        <div className="relative mt-16">
          {/* Horizontal connecting line */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-slate-300/70 lg:block" aria-hidden="true" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                {/* Number circle */}
                <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0B2C6B] bg-[#F5F7FA] text-sm font-bold text-[#0B2C6B]">
                  {step.number}
                </div>

                <h3 className="mb-2 text-base font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>

                {/* Arrow connector (between steps, not last) */}
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-7 hidden -translate-x-0 -translate-y-1/2 lg:block" aria-hidden="true">
                    <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
