'use client';

const benefits = [
  {
    title: 'Sistem Kelola profil',
    description: 'Semua pengalaman, keahlian, dan pencapaian dalam satu tempat terstruktur. Input sekali, pakai berulang kali.',
    category: 'Profil',
  },
  {
    title: 'Dibantu AI',
    description: 'Upload CV, AI menyusun profil Anda otomatis. Hemat waktu, akurasi tinggi, tetap bisa di-edit.',
    category: 'Otomatisasi',
  },
  {
    title: 'Portfolio terpusat',
    description: 'Pamerkan karya terbaik Anda dengan portfolio yang mudah dibagikan kepada klien.',
    category: 'Showcase',
  },
  {
    title: 'Capability berkembang',
    description: 'Pantau perkembangan kemampuan lewat assessment dan feedback terstruktur dari setiap assignment.',
    category: 'Growth',
  },
  {
    title: 'Mudah ditemukan',
    description: 'Profil Anda terlihat oleh klien dan reviewer yang mencari talenta sesuai kebutuhan mereka.',
    category: 'Visibility',
  },
  {
    title: 'Siap untuk penugasan',
    description: 'Dapatkan peluang proyek yang sesuai dengan keahlian, ketersediaan, dan lokasi Anda.',
    category: 'Peluang',
  },
];

export function Benefits() {
  return (
    <section className="border-t border-slate-200/70 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9A441]">
              Manfaat
            </span>
            <h2 className="mt-4 text-3xl font-light tracking-[-0.025em] text-slate-900 sm:text-4xl md:text-5xl">
              Dirancang untuk<br />pertumbuhan karir Anda.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600 md:text-base">
            Platform yang mendukung associate dari pendaftaran hingga karir senior berkembang.
          </p>
        </div>

        {/* Benefits list - clean rows with category tag */}
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200/70 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group flex flex-col gap-4 bg-white p-7 transition-colors hover:bg-slate-50/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-all group-hover:border-[#0B2C6B] group-hover:bg-[#0B2C6B] group-hover:text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition-colors group-hover:bg-[#D9A441]/10 group-hover:text-[#a77c1f]">
                  {benefit.category}
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 md:text-lg">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
