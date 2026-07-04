import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../auth/middleware/auth';
import { getDb } from '../../lib/database';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewFilterSchema
} from '@ams/shared/validators/reviews';
import type { AuthUser } from '../../types';

export const reviewRoutes = new Hono();

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
    .select(`
      *,
      reviewer:auth.users(id, email, raw_user_meta_data),
      associate:associates(slug, profile:associate_profiles(full_name))
    `, { count: 'exact' })
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

  // Transform data to include reviewer name
  const transformedData = data?.map(review => ({
    ...review,
    reviewer: {
      id: review.reviewer?.id,
      email: review.reviewer?.email,
      fullName: review.reviewer?.raw_user_meta_data?.full_name || null
    },
    associate: {
      slug: review.associate?.slug,
      fullName: review.associate?.profile?.[0]?.full_name || null
    }
  }));

  return c.json({ success: true, data: transformedData, total: count });
});

// Get review by ID
reviewRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_reviews')
    .select(`
      *,
      reviewer:auth.users(id, email, raw_user_meta_data),
      associate:associates(slug, profile:associate_profiles(full_name, headline))
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: 'Review tidak ditemukan' }, 404);
  }

  // Transform data
  const transformedData = {
    ...data,
    reviewer: {
      id: data.reviewer?.id,
      email: data.reviewer?.email,
      fullName: data.reviewer?.raw_user_meta_data?.full_name || null
    },
    associate: {
      slug: data.associate?.slug,
      fullName: data.associate?.profile?.[0]?.full_name || null,
      headline: data.associate?.profile?.[0]?.headline || null
    }
  };

  return c.json({ success: true, data: transformedData });
});

// Get reviews for specific associate
reviewRoutes.get('/associate/:associateId', async (c) => {
  const associateId = c.req.param('associateId');
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_reviews')
    .select(`
      *,
      reviewer:auth.users(id, email, raw_user_meta_data)
    `)
    .eq('associate_id', associateId)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Transform data
  const transformedData = data?.map(review => ({
    ...review,
    reviewer: {
      id: review.reviewer?.id,
      email: review.reviewer?.email,
      fullName: review.reviewer?.raw_user_meta_data?.full_name || null
    }
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
    .select('rating, status')
    .eq('associate_id', associateId);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const stats = {
    totalReviews: reviews?.length || 0,
    pendingReviews: reviews?.filter(r => r.status === 'pending').length || 0,
    approvedReviews: reviews?.filter(r => r.status === 'approved').length || 0,
    rejectedReviews: reviews?.filter(r => r.status === 'rejected').length || 0,
    averageRating: reviews?.length
      ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.filter(r => r.rating).length
      : null
  };

  return c.json({ success: true, data: stats });
});
