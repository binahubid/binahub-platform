import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import { createReviewSchema, updateReviewSchema } from '@ams/shared/validators/reviews';
import type { AuthUser } from '../../types';
import type { AppEnv } from '../../types/env.js';

export const reviewRoutes = new Hono<AppEnv>();

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

reviewRoutes.use('*', authMiddleware);

// Get all reviews (admin/reviewer)
reviewRoutes.get('/', requireRole(['admin', 'reviewer']), async (c) => {
  const { associate_id, reviewer_id, status } = c.req.query();
  const parsedLimit = Number.parseInt(c.req.query('limit') || '50', 10);
  const parsedOffset = Number.parseInt(c.req.query('offset') || '0', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
  const db = getDb();
  
  let query = db
    .from('associate_reviews')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
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
    console.error('List reviews failed:', error);
    return c.json({ success: false, error: 'Gagal memuat review' }, 500);
  }

  return c.json({ success: true, data: data || [], total: count || 0, limit, offset });
});

// Reviewer work queue. Deliberately excludes financial details, emergency
// contacts, private documents, and other administrator-only profile data.
reviewRoutes.get('/queue', requireRole(['admin', 'reviewer']), async (c) => {
  const requestedStatus = c.req.query('status') || 'pending_review';
  const allowedStatuses = ['pending_review', 'active', 'draft'];
  if (!allowedStatuses.includes(requestedStatus)) {
    return c.json({ success: false, error: 'Status antrean tidak valid' }, 400);
  }

  const parsedLimit = Number.parseInt(c.req.query('limit') || '50', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const db = getDb();
  const { data, error } = await db
    .from('associates')
    .select(`
      id,
      email,
      status,
      submitted_at,
      created_at,
      profile:associate_profiles(full_name, headline, photo_url),
      reviews:associate_reviews(id, reviewer_id, status, notes, decision_at, created_at)
    `)
    .eq('status', requestedStatus)
    .order('submitted_at', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('Reviewer queue failed:', error);
    return c.json({ success: false, error: 'Gagal memuat antrean review' }, 500);
  }

  return c.json({ success: true, data: data || [] });
});

reviewRoutes.get('/queue/:associateId', requireRole(['admin', 'reviewer']), async (c) => {
  const associateId = c.req.param('associateId');
  const db = getDb();
  const { data, error } = await db
    .from('associates')
    .select(`
      id,
      email,
      status,
      submitted_at,
      created_at,
      profile:associate_profiles(full_name, headline, bio, nationality, city, roles, expertises, photo_url),
      experiences:associate_experiences(*),
      educations:associate_educations(*),
      certifications:associate_certifications(*),
      portfolios:associate_portfolios(*),
      skills:associate_skills(*),
      languages:associate_languages(*),
      availability:associate_availability(*),
      documents:associate_documents(id, type, name, url, created_at, deleted_at),
      reviews:associate_reviews(id, reviewer_id, status, notes, decision_at, created_at)
    `)
    .eq('id', associateId)
    .maybeSingle();

  if (error || !data) return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  return c.json({
    success: true,
    data: {
      ...data,
      documents: (data.documents || []).filter((document: { deleted_at: string | null }) => !document.deleted_at),
    },
  });
});

reviewRoutes.patch('/associate/:associateId/decision', requireRole(['admin', 'reviewer']), async (c) => {
  const user = c.get('user') as AuthUser;
  const associateId = c.req.param('associateId');
  const body = await c.req.json().catch(() => null) as { status?: unknown; notes?: unknown } | null;
  if (!body || !['approved', 'rejected'].includes(body.status as string)) {
    return c.json({ success: false, error: 'Keputusan review tidak valid' }, 400);
  }
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.trim().length > 5000)) {
    return c.json({ success: false, error: 'Catatan review tidak valid atau terlalu panjang' }, 400);
  }

  const status = body.status as 'approved' | 'rejected';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const now = new Date().toISOString();
  const db = getDb();
  const { data: associate, error: associateError } = await db
    .from('associates')
    .update(status === 'approved'
      ? { status: 'active', approved_at: now, approved_by: user.id, updated_at: now }
      : { status: 'draft', updated_at: now })
    .eq('id', associateId)
    .eq('status', 'pending_review')
    .select('id, status')
    .maybeSingle();

  if (associateError) {
    console.error('Reviewer decision failed:', associateError);
    return c.json({ success: false, error: 'Gagal menyimpan keputusan review' }, 500);
  }
  if (!associate) {
    return c.json({ success: false, error: 'Profil sudah diputuskan atau tidak lagi menunggu review' }, 409);
  }

  const { data: latestReview } = await db
    .from('associate_reviews')
    .select('id')
    .eq('associate_id', associateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const reviewPayload = {
    associate_id: associateId,
    reviewer_id: user.id,
    status,
    notes: notes || null,
    decision_at: now,
  };
  const reviewResult = latestReview
    ? await db.from('associate_reviews').update(reviewPayload).eq('id', latestReview.id)
    : await db.from('associate_reviews').insert(reviewPayload);

  if (reviewResult.error) {
    console.error('Reviewer audit record failed:', reviewResult.error);
    const rollback = await db
      .from('associates')
      .update({ status: 'pending_review', approved_at: null, approved_by: null, updated_at: new Date().toISOString() })
      .eq('id', associateId);
    if (rollback.error) console.error('Reviewer decision rollback failed:', rollback.error);
    return c.json({ success: false, error: 'Keputusan tidak dapat dicatat lengkap; status dikembalikan untuk ditinjau ulang' }, 500);
  }

  await db.rpc('enqueue_transformation_event', {
    p_type: status === 'approved' ? 'AssociateApproved' : 'AssociateRejected',
    p_aggregate_type: 'associate',
    p_aggregate_id: associateId,
    p_payload: status === 'approved'
      ? { associate_id: associateId, approved_by: user.id, approved_at: now }
      : { associate_id: associateId, rejected_by: user.id, reason: notes },
  });

  return c.json({ success: true, data: associate, message: status === 'approved' ? 'Associate disetujui' : 'Associate ditolak' });
});

// Get review by ID
reviewRoutes.get('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
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

  const allowed = user.role === 'admin'
    || (user.role === 'reviewer' && data.reviewer_id === user.id)
    || data.associate_id === user.id;

  if (!allowed) {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  return c.json({ success: true, data });
});

// Get reviews for specific associate
reviewRoutes.get('/associate/:associateId', async (c) => {
  const associateId = c.req.param('associateId');
  const user = c.get('user') as AuthUser;

  if (user.role !== 'admin' && user.role !== 'reviewer' && user.id !== associateId) {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_reviews')
    .select('*')
    .eq('associate_id', associateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Associate reviews failed:', error);
    return c.json({ success: false, error: 'Gagal memuat review' }, 500);
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
  const body = await c.req.json().catch(() => null);
  
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
      associate_id: validation.data.associateId,
      rating: validation.data.rating,
      strengths: validation.data.strengths,
      improvements: validation.data.improvements,
      notes: validation.data.notes,
      reviewer_id: user.id,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Create review failed:', error);
    return c.json({ success: false, error: 'Gagal membuat review' }, 500);
  }

  return c.json({ success: true, data }, 201);
});

// Update review
reviewRoutes.put('/:id', requireRole(['admin', 'reviewer']), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const body = await c.req.json().catch(() => null);
  
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
    console.error('Update review failed:', error);
    return c.json({ success: false, error: 'Gagal memperbarui review' }, 500);
  }

  return c.json({ success: true, data });
});

// Get review statistics
reviewRoutes.get('/stats/:associateId', async (c) => {
  const associateId = c.req.param('associateId');
  const user = c.get('user') as AuthUser;

  if (user.role !== 'admin' && user.role !== 'reviewer' && user.id !== associateId) {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }
  const db = getDb();
  
  const { data: reviews, error } = await db
    .from('associate_reviews')
    .select('status')
    .eq('associate_id', associateId);

  if (error) {
    console.error('Review statistics failed:', error);
    return c.json({ success: false, error: 'Gagal memuat statistik review' }, 500);
  }

  const stats = {
    totalReviews: reviews?.length || 0,
    pendingReviews: reviews?.filter(r => r.status === 'pending').length || 0,
    approvedReviews: reviews?.filter(r => r.status === 'approved').length || 0,
    rejectedReviews: reviews?.filter(r => r.status === 'rejected').length || 0,
  };

  return c.json({ success: true, data: stats });
});
