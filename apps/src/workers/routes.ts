import { Hono } from 'hono';
import { getDb } from '../lib/database';
import { processPendingEvents } from './event-processor';

export const workerRoutes = new Hono();

// ============================================
// PROCESS EVENTS
// ============================================

workerRoutes.post('/process-events', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const limit = body.limit || 10;
  
  try {
    const results = await processPendingEvents(limit);
    return c.json({ success: true, data: results });
  } catch (error) {
    console.error('Worker error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Worker processing failed'
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
    return c.json({ success: false, error: error.message }, 500);
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
