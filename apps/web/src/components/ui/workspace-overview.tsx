"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAmsLocale } from "@/components/ams-language";

type WorkspaceOverviewProps = {
  heading: string;
  value: number | null;
  label: string;
  detail: string;
  href: string;
  action: string;
  completion: number;
  completionLabel: string;
  completionHref: string;
};

export function WorkspaceOverview({ heading, value, label, detail, href, action, completion, completionLabel, completionHref }: WorkspaceOverviewProps) {
  const percentage = Math.min(100, Math.max(0, completion));
  return (
    <section className="ams-overview" aria-label={heading}>
      <div className="ams-overview-copy">
        <h2>{heading}</h2>
        {value !== null && <p className="ams-overview-number"><strong>{value}</strong><span>{label}</span></p>}
        <p className="ams-overview-detail">{detail}</p>
        <Link href={href} className="ams-overview-action">
          {action}<span aria-hidden="true">↗</span>
        </Link>
      </div>
      <Link href={completionHref} className="ams-overview-completion" aria-label={`${completionLabel}: ${percentage}%`}>
        <span className="ams-completion-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="42" className="ams-completion-track" />
            <circle cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${percentage} 100`} className="ams-completion-value" />
          </svg>
          <strong>{percentage}<small>%</small></strong>
        </span>
        <span>{completionLabel}</span>
      </Link>
    </section>
  );
}

type ShortcutTone = 'blue' | 'teal' | 'gold' | 'violet';
type ShortcutArtwork = 'consultant' | 'document' | 'availability' | 'assessment' | 'development';
export type WorkspaceShortcut = { label: string; tone: ShortcutTone } & (
  { icon: string; artwork?: never } | { artwork: ShortcutArtwork; icon?: never }
) & (
  { href?: string; onClick?: never; busy?: never } | { href?: never; onClick: () => void; busy?: boolean }
);

export function WorkspaceShortcuts({ items }: { items: WorkspaceShortcut[] }) {
  const { t } = useAmsLocale();
  const strip = useRef<HTMLDivElement>(null);
  const stripId = useId();
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);

  const updateScroll = useCallback(() => {
    const row = strip.current;
    if (!row?.parentElement) return;
    const overflow = row.scrollWidth - row.parentElement.clientWidth > 1;
    const forward = row.scrollWidth - row.clientWidth - row.scrollLeft > 1;
    setDirection(overflow ? (forward ? 1 : -1) : 0);
  }, []);

  useEffect(() => {
    const row = strip.current;
    if (!row) return;
    const observer = new ResizeObserver(updateScroll);
    observer.observe(row);
    return () => observer.disconnect();
  }, [items.length, updateScroll]);

  function scrollShortcuts() {
    const row = strip.current;
    if (!row) return;
    if (direction === -1) row.scrollTo({ left: 0 });
    if (direction === 1) row.scrollBy({ left: Math.floor(row.clientWidth / 2) });
  }

  return (
    <section className="ams-shortcuts" aria-labelledby="workspace-shortcuts-heading">
      <h2 id="workspace-shortcuts-heading">{t("Akses cepat")}</h2>
      <div className="ams-shortcut-row">
        <div id={stripId} ref={strip} className="ams-shortcut-strip" onScroll={updateScroll}>
          {items.map((item) => {
            const tile = item.artwork === 'consultant' ? 'document' : item.artwork;
            const content = (
              <>
                <span className={`ams-shortcut-icon ams-shortcut-${item.tone}`}>
                  {item.artwork ? (
                    <>
                      <Image className="ams-shortcut-tile" src={`/workspace-icons/tile-${tile}.webp`} alt="" width={54} height={54} unoptimized />
                      <Image className="ams-shortcut-art" src={`/workspace-icons/${item.artwork}.webp`} alt="" width={44} height={44} unoptimized />
                    </>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  )}
                </span>
                <span>
                  <span className="block">{t(item.busy ? "Membuka portal…" : item.label)}</span>
                  {!item.href && !item.onClick && <span className="ams-shortcut-soon">{t("Segera hadir")}</span>}
                </span>
              </>
            );
            return item.href ? (
              <Link key={item.label} href={item.href} className="ams-shortcut">{content}</Link>
            ) : item.onClick ? (
              <button key={item.label} type="button" className="ams-shortcut" disabled={item.busy} aria-busy={item.busy || undefined} onClick={item.onClick}>{content}</button>
            ) : (
              <div key={item.label} className="ams-shortcut ams-shortcut-disabled">{content}</div>
            );
          })}
        </div>
        {direction !== 0 && (
          <button className="ams-shortcut-arrow" type="button" aria-controls={stripId}
            aria-label={t(direction === -1 ? "Geser menu ke kiri" : "Geser menu ke kanan")}
            onClick={scrollShortcuts}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={direction === -1 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
