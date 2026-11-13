import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

function DisclosureButton({ id, label, expanded, count, compact, onToggle }: {
  id: string;
  label: string;
  expanded: boolean;
  count?: number;
  compact?: boolean;
  onToggle: () => void;
}) {
  const action = expanded ? 'Ringkas' : 'Lihat selengkapnya';
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={id}
      aria-label={count && !expanded ? `Lihat ${count} item lainnya di ${label}` : `${action} ${label}`}
      onClick={onToggle}
      className="ams-profile-disclosure"
    >
      {compact && count && !expanded ? `+${count}` : action}
      {!compact && count && !expanded ? ` (+${count})` : ''}
      <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" className={expanded ? 'rotate-180' : ''}>
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function ProfileItems<T>({ label, items, limit, details = false, compact, children }: {
  label: string;
  items: T[];
  limit: number;
  details?: boolean;
  compact?: boolean;
  children: (visible: T[], expanded: boolean) => ReactNode;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, items.length - limit);
  const canExpand = hidden > 0 || details;
  return (
    <>
      <div id={id}>{children(expanded ? items : items.slice(0, limit), expanded || !canExpand)}</div>
      {canExpand && (
        <DisclosureButton id={id} label={label} expanded={expanded} count={hidden} compact={compact} onToggle={() => setExpanded((value) => !value)} />
      )}
    </>
  );
}

export function ProfileBio({ text }: { text: string }) {
  const id = useId();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const node = paragraph.current;
    if (!node || expanded) return;
    const check = () => setOverflow(node.scrollHeight > node.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded, text]);
  return (
    <>
      <p id={id} ref={paragraph} className={`break-words whitespace-pre-wrap text-sm leading-6 text-slate-600 ${expanded ? '' : 'line-clamp-3'}`}>{text}</p>
      {(overflow || expanded) && <DisclosureButton id={id} label="Tentang saya" expanded={expanded} onToggle={() => setExpanded((value) => !value)} />}
    </>
  );
}
