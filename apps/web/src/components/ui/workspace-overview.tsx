"use client";

import Link from 'next/link';
import Image from 'next/image';
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
type ShortcutArtwork = 'document' | 'availability' | 'assessment' | 'development';
export type WorkspaceShortcut = { label: string; tone: ShortcutTone } & (
  { href: string; icon: string; artwork?: never } |
  { href?: string; artwork: ShortcutArtwork; icon?: never }
);

export function WorkspaceShortcuts({ items }: { items: WorkspaceShortcut[] }) {
  const { t } = useAmsLocale();
  return (
    <section className="ams-shortcuts" aria-labelledby="workspace-shortcuts-heading">
      <h2 id="workspace-shortcuts-heading">{t("Akses cepat")}</h2>
      <div className="ams-shortcut-grid">
        {items.map((item) => {
          const content = (
            <>
              <span className={`ams-shortcut-icon ams-shortcut-${item.tone}`}>
                {item.artwork ? (
                  <>
                    <Image className="ams-shortcut-tile" src={`/workspace-icons/tile-${item.artwork}.webp`} alt="" width={54} height={54} unoptimized />
                    <Image className="ams-shortcut-art" src={`/workspace-icons/${item.artwork}.webp`} alt="" width={44} height={44} unoptimized />
                  </>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                )}
              </span>
              <span>
                <span className="block">{t(item.label)}</span>
                {!item.href && <span className="ams-shortcut-soon">{t("Segera hadir")}</span>}
              </span>
            </>
          );
          return item.href ? (
            <Link key={item.label} href={item.href} className="ams-shortcut">{content}</Link>
          ) : (
            <div key={item.label} className="ams-shortcut ams-shortcut-disabled">{content}</div>
          );
        })}
      </div>
    </section>
  );
}
