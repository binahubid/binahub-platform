import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../modules/auth/middleware/auth.js';
import { getDb } from '../lib/database.js';
import { processPendingEvents } from './event-processor.js';
import type { AppEnv } from '../types/env.js';

export const workerRoutes = new Hono<AppEnv>();

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
