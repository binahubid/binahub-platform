export const REFERRAL_ICON = 'M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2';

export function referralLink(code: string) {
  const link = new URL('https://binahub.id/');
  link.searchParams.set('ref', code);
  return link.toString();
}

export async function referralRequest<T>(token: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    cache: 'no-store',
    signal: signal || AbortSignal.timeout(15000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw Object.assign(new Error(result?.error || 'Referral belum dapat diakses. Coba lagi sebentar.'), { code: result?.code });
  }
  return result.data as T;
}
