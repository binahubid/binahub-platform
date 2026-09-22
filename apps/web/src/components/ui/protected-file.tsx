'use client';

import { useEffect, useState, type AnchorHTMLAttributes, type ImgHTMLAttributes, type ReactNode } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ApiResult = {
  success?: boolean;
  error?: string;
  data?: { signedUrl?: string };
};

export async function resolveProtectedFileUrl(source: string, accessToken: string): Promise<string> {
  if (!source || !accessToken) throw new Error('Sesi atau alamat berkas tidak tersedia');
  if (source.startsWith('data:') || source.startsWith('blob:')) return source;

  let url: URL;
  try {
    url = new URL(source, apiUrl);
  } catch {
    throw new Error('Alamat berkas tidak valid');
  }

  if (url.origin !== new URL(apiUrl).origin) return url.toString();

  const fileIdMatch = url.pathname.match(/^\/api\/files\/([0-9a-f-]{36})\/(?:view|download)$/i);
  let response: Response;

  if (fileIdMatch) {
    response = await fetch(`${apiUrl}/api/files/${fileIdMatch[1]}/download`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } else {
    const path = url.pathname.endsWith('/view-path')
      ? url.searchParams.get('path')
      : source.startsWith('http')
        ? null
        : source;

    if (!path) return url.toString();

    response = await fetch(`${apiUrl}/api/files/signed-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
      cache: 'no-store',
    });
  }

  const result = await response.json().catch(() => null) as ApiResult | null;
  if (!response.ok || !result?.success || !result.data?.signedUrl) {
    throw new Error(result?.error || 'Berkas tidak dapat dibuka');
  }

  return result.data.signedUrl;
}

type ProtectedFileImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  accessToken: string | null;
  fallback?: ReactNode;
};

export function ProtectedFileImage({ src, accessToken, fallback = null, alt = '', ...props }: ProtectedFileImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (!accessToken) {
      setResolvedUrl('');
      return () => { active = false; };
    }

    resolveProtectedFileUrl(src, accessToken)
      .then((url) => {
        if (active) setResolvedUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => { active = false; };
  }, [src, accessToken]);

  if (failed) return <>{fallback}</>;
  if (!resolvedUrl) {
    return <span className={props.className} aria-label="Memuat berkas" role="status" />;
  }

  // Signed storage URLs are intentionally rendered with a native image: their
  // short lifetime makes Next's persistent image optimizer cache unsuitable.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={resolvedUrl} alt={alt} />;
}

type ProtectedFileLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  accessToken: string | null;
  onOpenError?: (message: string) => void;
};

export function ProtectedFileLink({
  href,
  accessToken,
  onOpenError,
  children,
  ...props
}: ProtectedFileLinkProps) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    if (opening || !accessToken) return;
    setOpening(true);
    const target = window.open('', '_blank');
    if (target) {
      target.opener = null;
      target.document.title = 'Membuka berkas…';
    }

    try {
      const resolvedUrl = await resolveProtectedFileUrl(href, accessToken);
      if (target) target.location.replace(resolvedUrl);
      else window.location.assign(resolvedUrl);
    } catch (error) {
      target?.close();
      onOpenError?.(error instanceof Error ? error.message : 'Berkas tidak dapat dibuka');
    } finally {
      setOpening(false);
    }
  };

  return (
    <a
      {...props}
      href="#"
      aria-busy={opening}
      onClick={(event) => {
        event.preventDefault();
        void handleOpen();
      }}
    >
      {opening ? 'Membuka…' : children}
    </a>
  );
}
