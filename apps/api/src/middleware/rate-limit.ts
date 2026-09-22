import type { Context, MiddlewareHandler } from 'hono';
import { getDb } from '../lib/database.js';

type LocalBucket = { count: number; resetAt: number };
const localBuckets = new Map<string, LocalBucket>();

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
    const k = key(c);
    const db = getDb();
    const now = new Date();

    try {
      const { data, error } = await db.rpc('consume_rate_limit', {
        p_key: k,
        p_window_ms: windowMs,
        p_max: max,
      });
      if (error) throw error;

      const record = Array.isArray(data) ? data[0] : data;
      if (!record || typeof record.allowed !== 'boolean') throw new Error('Invalid rate limit response');

      c.header('RateLimit-Limit', String(max));
      c.header('RateLimit-Remaining', String(record.remaining ?? 0));

      if (!record.allowed) {
        const retryAfter = Math.max(1, Math.ceil((new Date(record.reset_at).getTime() - now.getTime()) / 1000));
        c.header('Retry-After', String(retryAfter));
        return c.json(
          {
            success: false,
            error: 'Terlalu banyak permintaan. Coba lagi nanti.',
          },
          429
        );
      }
    } catch (err) {
      console.error('Rate limit middleware exception:', err);

      // Never fail open on sensitive endpoints. This per-instance fallback is
      // intentionally conservative while the shared database is unavailable.
      const current = localBuckets.get(k);
      const nowMs = Date.now();
      const bucket = !current || current.resetAt <= nowMs
        ? { count: 1, resetAt: nowMs + windowMs }
        : { count: current.count + 1, resetAt: current.resetAt };
      localBuckets.set(k, bucket);

      if (localBuckets.size > 5000) {
        for (const [bucketKey, value] of localBuckets) {
          if (value.resetAt <= nowMs) localBuckets.delete(bucketKey);
        }
      }

      c.header('RateLimit-Limit', String(max));
      c.header('RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));
      if (bucket.count > max) {
        const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - nowMs) / 1000));
        c.header('Retry-After', String(retryAfter));
        return c.json({ success: false, error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, 429);
      }
    }

    await next();
  };
}
