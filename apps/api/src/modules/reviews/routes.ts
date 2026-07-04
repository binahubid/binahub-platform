import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../auth/middleware/auth';
import { getDb } from '../../lib/database';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewFilterSchema
} from '@ams/shared/validators/reviews';
import type { AuthUser } from '../../types';
import type { AppEnv } from '../../types/env';

export const reviewRoutes = new Hono<AppEnv>();

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

reviewRoutes.use('*', authMiddleware);

// Get all reviews (admin/reviewer)
reviewRoutes.get('/', requireRole(['admin', 'reviewer']), async (c) => {
  const { limit = '50', offset = '0', associate_id, reviewer_id, status } = c.req.query();
  const db = getDb();
  
  let query = db
    .from('associate_reviews')
    .select('*', { count: 'exact' })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    .order('created_at', { ascending: false });

  if (associate_id) {
    query = query.eq('associate_id', associate_id);
  }

  if (reviewer_id) {
    query = query.eq('reviewer_id', reviewer_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || [], total: count || 0 });
});

// Get review by ID
reviewRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_reviews')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: 'Review tidak ditemukan' }, 404);
  }

  return c.json({ success: true, data });
});

// Get reviews for specific associate
reviewRoutes.get('/associate/:associateId', async (c) => {
  const associateId = c.req.param('associateId');
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_reviews')
    .select('*')
    .eq('associate_id', associateId)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Fetch reviewer info from Supabase Auth
  const reviewerIds = [...new Set((data || []).map(r => r.reviewer_id).filter(Boolean))];
  const reviewerMap = new Map<string, { id: string; email: string; fullName: string | null }>();

  if (reviewerIds.length > 0) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    for (const reviewerId of reviewerIds) {
      try {
        const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${reviewerId}`, {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        });
        const userData = await resp.json() as { id?: string; email?: string; user_metadata?: Record<string, unknown> };
        if (userData.id) {
          reviewerMap.set(userData.id, {
            id: userData.id,
            email: userData.email || '',
            fullName: (userData.user_metadata?.full_name as string) || null,
          });
        }
      } catch {
        // Skip if user fetch fails
      }
    }
  }

  // Transform data with reviewer info
  const transformedData = data?.map(review => ({
    ...review,
    reviewer: reviewerMap.get(review.reviewer_id) || null,
  }));

  return c.json({ success: true, data: transformedData });
});

// Create review
reviewRoutes.post('/', requireRole(['admin', 'reviewer']), async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createReviewSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_reviews')
    .insert({
      ...validation.data,
      reviewer_id: user.id,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

// Update review
reviewRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = updateReviewSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  
  // Check if user owns this review or is admin
  const { data: existingReview } = await db
    .from('associate_reviews')
    .select('reviewer_id')
    .eq('id', id)
    .single();

  if (!existingReview) {
    return c.json({ success: false, error: 'Review tidak ditemukan' }, 404);
  }

  if (existingReview.reviewer_id !== user.id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  // If status is being updated, set decision_at
  const updateData = {
    ...validation.data,
    ...(validation.data.status ? { decision_at: new Date().toISOString() } : {})
  };

  const { data, error } = await db
    .from('associate_reviews')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// Get review statistics
reviewRoutes.get('/stats/:associateId', async (c) => {
  const associateId = c.req.param('associateId');
  const db = getDb();
  
  const { data: reviews, error } = await db
    .from('associate_reviews')
    .select('status')
    .eq('associate_id', associateId);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const stats = {
    totalReviews: reviews?.length || 0,
    pendingReviews: reviews?.filter(r => r.status === 'pending').length || 0,
    approvedReviews: reviews?.filter(r => r.status === 'approved').length || 0,
    rejectedReviews: reviews?.filter(r => r.status === 'rejected').length || 0,
  };

  return c.json({ success: true, data: stats });
});
