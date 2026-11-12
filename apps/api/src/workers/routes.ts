import { Hono, type Context } from 'hono';
import { authMiddleware, requireRole } from '../modules/auth/middleware/auth.js';
import { getDb } from '../lib/database.js';
import { processPendingEvents } from './event-processor.js';
import type { AppEnv } from '../types/env.js';
import { timingSafeEqual } from 'node:crypto';
import { notificationPushConfig, runNotificationWorker } from '../lib/notifications.js';

export const workerRoutes = new Hono<AppEnv>();

function validWorkerSecret(value: string | undefined, secret: string | undefined) {
  if (!secret || !value) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(value.replace(/^Bearer\s+/i, ''));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function processCron(c: Context<AppEnv>) {
  if (!validWorkerSecret(c.req.header('authorization') || c.req.header('x-worker-secret'), process.env.AMS_WORKER_SECRET || process.env.CRON_SECRET)) {
    return c.json({ success: false, error: 'Worker secret tidak valid' }, 401);
  }
  try {
    const results = await processPendingEvents(100);
    return c.json({ success: true, data: results });
  } catch (error) {
    console.error('Scheduled worker error:', error);
    return c.json({ success: false, error: 'Pemrosesan event terjadwal gagal' }, 500);
  }
}

// Registered before the interactive admin middleware so a scheduler can retry
// queued integration and email events without owning an admin session.
workerRoutes.get('/cron', processCron);
workerRoutes.post('/cron', processCron);

workerRoutes.post('/notifications', async c => {
  c.header('Cache-Control', 'no-store');
  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer ') || !validWorkerSecret(authorization, process.env.AMS_NOTIFICATION_WORKER_SECRET))
    return c.json({ success: false, error: 'Worker secret tidak valid' }, 401);
  if (!notificationPushConfig().enabled)
    return c.json({ success: false, error: 'Notifikasi HP belum diaktifkan.' }, 503);
  const [email, push] = await Promise.allSettled([processPendingEvents(3, true), runNotificationWorker()]);
  if (email.status === 'rejected' || push.status === 'rejected')
    return c.json({ success: false, error: 'Sebagian antrean notifikasi belum dapat diproses.' }, 503);
  return c.json({ success: true, data: { email: email.value, push: push.value } });
});

// ============================================
// PROTECTED (admin only)
// ============================================
workerRoutes.use('*', authMiddleware);
workerRoutes.use('*', requireRole(['admin']));

// ============================================
// PROCESS EVENTS
// ============================================

workerRoutes.post('/process-events', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const requestedLimit = Number.parseInt(String(body.limit ?? 10), 10);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 10, 1), 100);
  
  try {
    const results = await processPendingEvents(limit);
    return c.json({ success: true, data: results });
  } catch (error) {
    console.error('Worker error:', error);
    return c.json({
      success: false,
      error: 'Pemrosesan event gagal'
    }, 500);
  }
});

// ============================================
// HEALTH CHECK
// ============================================

workerRoutes.get('/health', async (c) => {
  const db = getDb();
  
  // Check pending events count
  const { count, error } = await db
    .from('event_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('Worker health query failed:', error);
    return c.json({ success: false, error: 'Status worker tidak dapat dibaca' }, 500);
  }

  return c.json({
    success: true,
    data: {
      status: 'healthy',
      pendingEvents: count || 0,
      timestamp: new Date().toISOString()
    }
  });
});
