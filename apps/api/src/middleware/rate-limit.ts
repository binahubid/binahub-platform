import type { Context, MiddlewareHandler } from 'hono';
import { getDb } from '../lib/database.js';

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
      // 1. Fetch current rate limit record from Postgres
      const { data: record, error } = await db
        .from('rate_limits')
        .select('*')
        .eq('key', k)
        .maybeSingle();

      if (error) {
        console.error('Rate limit DB fetch error:', error);
        // Fallback gracefully on DB failure
        await next();
        return;
      }

      if (!record || new Date(record.reset_at) <= now) {
        // Upsert new rate limit window bucket
        const resetAt = new Date(Date.now() + windowMs).toISOString();
        const { error: upsertError } = await db
          .from('rate_limits')
          .upsert({ key: k, count: 1, reset_at: resetAt }, { onConflict: 'key' });

        if (upsertError) {
          console.error('Rate limit upsert error:', upsertError);
        }
        await next();
        return;
      }

      // Increment hit count
      const newCount = record.count + 1;
      const { error: updateError } = await db
        .from('rate_limits')
        .update({ count: newCount })
        .eq('key', k);

      if (updateError) {
        console.error('Rate limit update error:', updateError);
      }

      if (newCount > max) {
        const retryAfter = Math.ceil((new Date(record.reset_at).getTime() - Date.now()) / 1000);
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
    }

    await next();
  };
}
