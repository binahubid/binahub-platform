'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'Apa itu BinaHub AMS?',
    answer: 'BinaHub AMS (Associate Management System) adalah platform untuk mengelola profil profesional, portofolio, dan peluang penugasan/proyek bagi para associate yang terdaftar di database BinaHub.',
  },
  {
    question: 'Apakah platform ini berbayar?',
    answer: 'Tidak. BinaHub AMS gratis untuk semua associate. Tidak ada biaya tersembunyi atau langganan.',
  },
  {
    question: 'Bagaimana AI membantu saya?',
    answer: 'AI kami mengekstrak informasi dari CV Anda (PDF atau Word) dan menyusunnya menjadi profil terstruktur secara otomatis. Anda tetap bisa mengedit dan menyempurnakan hasilnya.',
  },
  {
    question: 'Apa itu capability assessment?',
    answer: 'Capability assessment adalah evaluasi kemampuan Anda berdasarkan proyek selesai, feedback klien, dan self-assessment. Membantu tracking perkembangan karir Anda.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 border-t border-slate-200/70 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          {/* Left: Header */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9A441]">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-light tracking-[-0.025em] text-slate-900 sm:text-4xl md:text-5xl">
              Pertanyaan yang<br />sering diajukan.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-600 md:text-base">
              Tidak menemukan jawaban? Tim kami siap membantu di{' '}
              <a href="mailto:hello@binahub.id" className="font-medium text-[#0B2C6B] underline underline-offset-2">
                hello@binahub.id
              </a>.
            </p>
          </div>

          {/* Right: FAQ accordion */}
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className={`text-sm font-medium transition sm:text-base ${isOpen ? 'text-[#0B2C6B]' : 'text-slate-900 group-hover:text-[#0B2C6B]'}`}>
                      {faq.question}
                    </span>
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-all ${isOpen ? 'rotate-180 border-[#0B2C6B] bg-[#0B2C6B] text-white' : 'border-slate-300 text-slate-500'}`}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="animate-accordionDown overflow-hidden">
                      <p className="pb-5 pr-8 text-sm leading-relaxed text-slate-600">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
