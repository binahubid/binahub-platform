'use client';

import { useState } from 'react';
import { ProtectedFileImage } from './protected-file';
import { useAmsLocale } from "@/components/ams-language";

export function Avatar({
  src,
  alt,
  name,
  accessToken,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  alt?: string;
  name?: string;
  accessToken?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const { t } = useAmsLocale();
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initials = name
    ?.trim().split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <span role="img" aria-label={alt || name || t("Foto profil")} className={`ams-avatar ${sizeClasses[size]} ${className}`}>
      <span aria-hidden="true">{initials}</span>
      {src && accessToken ? (
        <ProtectedFileImage key={src} src={src} accessToken={accessToken} alt="" className="ams-avatar-image" />
      ) : src && failedSource !== src ? (
        // Arbitrary external URLs and temporary upload previews use a native image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="ams-avatar-image" onError={() => setFailedSource(src)} />
      ) : null}
    </span>
  );
}
