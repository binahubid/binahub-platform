import Link from 'next/link';

type WorkspaceOverviewProps = {
  heading: string;
  value: number;
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
        <p className="ams-overview-number"><strong>{value}</strong><span>{label}</span></p>
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

export type WorkspaceShortcut = { label: string; href: string; icon: string; tone: 'blue' | 'teal' | 'gold' | 'violet' };

export function WorkspaceShortcuts({ items }: { items: WorkspaceShortcut[] }) {
  return (
    <section className="ams-shortcuts" aria-labelledby="workspace-shortcuts-heading">
      <h2 id="workspace-shortcuts-heading">Akses cepat</h2>
      <div className="ams-shortcut-grid">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="ams-shortcut">
            <span className={`ams-shortcut-icon ams-shortcut-${item.tone}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
