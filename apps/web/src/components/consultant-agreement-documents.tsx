'use client';

import { useEffect, useRef, useState } from 'react';
import { useAmsLocale } from './ams-language';

export function ConsultantAgreementDocuments({ documents }: { documents: string[] }) {
  const { t } = useAmsLocale();
  return (
    <div className="space-y-3">
      {documents.filter(Boolean).map((document, index) => (
        <AgreementDocument key={index} document={document} title={t(
          documents.length !== 2 ? 'Perjanjian kerja sama konsultan'
            : index === 0 ? 'Perjanjian Kerahasiaan (NDA)' : 'Perjanjian Kerja Sama (ACA)',
        )} />
      ))}
    </div>
  );
}

function AgreementDocument({ document, title }: { document: string; title: string }) {
  const { t } = useAmsLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLParagraphElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  function measure() {
    const view = viewport.current;
    if (!view || !view.clientHeight) return;
    const max = view.scrollHeight - view.clientHeight;
    setScrollable(max > 4);
    setAtEnd(max - view.scrollTop <= 4);
  }

  useEffect(() => {
    const view = viewport.current;
    const body = content.current;
    if (!view || !body) return;
    const resize = new ResizeObserver(measure);
    resize.observe(view);
    resize.observe(body);
    return () => resize.disconnect();
  }, []);

  return (
    <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white" onToggle={measure}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-semibold text-[#0B2C6B]">
        {title}
        <span aria-hidden="true" className="shrink-0 text-lg leading-none transition-transform group-open:rotate-180 motion-reduce:transition-none">⌄</span>
      </summary>
      <div className="relative border-t border-slate-200 bg-slate-50">
        <div ref={viewport} role="region" aria-label={title} tabIndex={0} onScroll={measure}
          className="max-h-[min(52dvh,460px)] min-h-24 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-800">
          <p ref={content} className={`mx-auto max-w-[76ch] whitespace-pre-line break-words px-4 pt-4 text-sm leading-7 text-slate-800 sm:px-6 ${scrollable ? 'pb-18' : 'pb-4'}`}>
            {document}
          </p>
        </div>
        {scrollable && (
          <button type="button" aria-label={t(atEnd ? 'Ke awal dokumen' : 'Ke akhir dokumen')}
            className="absolute bottom-3 right-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-blue-200 bg-white px-3 text-xs font-semibold text-[#0B2C6B] shadow-sm hover:bg-blue-50 motion-reduce:transition-none"
            onClick={() => {
              const view = viewport.current;
              view?.scrollTo({ top: atEnd ? 0 : view.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
            }}>
            <span aria-hidden="true" className="text-base leading-none">{atEnd ? '↑' : '↓'}</span>
            {t(atEnd ? 'Ke awal' : 'Ke akhir')}
          </button>
        )}
      </div>
    </details>
  );
}
