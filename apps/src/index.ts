import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { associateRoutes } from './modules/associate/routes';
import { fileRoutes } from './modules/files/routes';
import { reviewRoutes } from './modules/reviews/routes';
import { workerRoutes } from './workers/routes';

const app = new Hono();

// ============================================
// MIDDLEWARE
// ============================================

app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/', (c) => {
  return c.json({
    name: 'AMS BinaHub API',
    version: '0.1.0',
    status: 'healthy'
  });
});

// ============================================
// ROUTES
// ============================================

app.route('/associates', associateRoutes);
app.route('/files', fileRoutes);
app.route('/reviews', reviewRoutes);
app.route('/workers', workerRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    success: false,
    error: 'Internal server error'
  }, 500);
});

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found'
  }, 404);
});

// ============================================
// START SERVER
// ============================================

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 AMS API Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
