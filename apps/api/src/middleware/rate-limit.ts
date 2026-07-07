import type { Context, MiddlewareHandler } from 'hono';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function key(c: Context): string {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown';
  return `${ip}:${c.req.path}`;
}

export function rateLimit(opts: {
  windowMs: number;
  max: number;
}): MiddlewareHandler {
  const { windowMs, max } = opts;

  return async (c, next) => {
    const now = Date.now();
    const k = key(c);
    const bucket = buckets.get(k);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(k, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          success: false,
          error: 'Terlalu banyak permintaan. Coba lagi nanti.',
        },
        429
      );
    }

    await next();
  };
}

export function cleanupRateLimitBuckets(): void {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

setInterval(cleanupRateLimitBuckets, 5 * 60 * 1000).unref?.();
