import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../auth/middleware/auth';
import { getDb } from '../../lib/database';
import { generateUniqueSlug, isValidSlug } from '@ams/shared/utils/slug';
import {
  createAssociateSchema,
  updateProfileSchema,
  createExperienceSchema,
  updateExperienceSchema,
  createEducationSchema,
  createCertificationSchema,
  createSkillSchema,
  createLanguageSchema,
  updateAvailabilitySchema,
  createSocialLinkSchema,
  updateEmergencyContactSchema,
  updatePreferencesSchema
} from '@ams/shared/validators/associate';
import type { AuthUser } from '../../types';

export const associateRoutes = new Hono();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get associate by slug (public)
associateRoutes.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  if (!isValidSlug(slug)) {
    return c.json({ success: false, error: 'Slug tidak valid' }, 400);
  }

  const db = getDb();
  
  const { data: associate, error } = await db
    .from('associates')
    .select(`
      *,
      profile:associate_profiles(*),
      experiences:associate_experiences(*),
      educations:associate_educations(*),
      certifications:associate_certifications(*),
      portfolios:associate_portfolios(*),
      skills:associate_skills(*),
      languages:associate_languages(*),
      availability:associate_availability(*),
      socialLinks:associate_social_links(*),
      emergencyContact:associate_emergency_contacts(*),
      preferences:associate_preferences(*)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !associate) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  return c.json({ success: true, data: associate });
});

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

associateRoutes.use('*', authMiddleware);

// Get current user's associate profile
associateRoutes.get('/me', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data: associate, error } = await db
    .from('associates')
    .select(`
      *,
      profile:associate_profiles(*),
      experiences:associate_experiences(*),
      educations:associate_educations(*),
      certifications:associate_certifications(*),
      portfolios:associate_portfolios(*),
      skills:associate_skills(*),
      languages:associate_languages(*),
      availability:associate_availability(*),
      socialLinks:associate_social_links(*),
      emergencyContact:associate_emergency_contacts(*),
      preferences:associate_preferences(*)
    `)
    .eq('id', user.id)
    .single();

  if (error || !associate) {
    return c.json({ success: false, error: 'Associate profile tidak ditemukan' }, 404);
  }

  return c.json({ success: true, data: associate });
});

// Create associate profile
associateRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createAssociateSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { email, fullName, headline } = validation.data;

  // Generate unique slug
  const slug = await generateUniqueSlug(fullName, async (checkSlug) => {
    const { data } = await db
      .from('associates')
      .select('id')
      .eq('slug', checkSlug)
      .single();
    return !!data;
  });

  // Create associate
  const { data: associate, error: associateError } = await db
    .from('associates')
    .insert({
      id: user.id,
      slug,
      status: 'draft'
    })
    .select()
    .single();

  if (associateError) {
    return c.json({ success: false, error: associateError.message }, 500);
  }

  // Create profile
  const { error: profileError } = await db
    .from('associate_profiles')
    .insert({
      associate_id: user.id,
      full_name: fullName,
      headline: headline || null
    });

  if (profileError) {
    return c.json({ success: false, error: profileError.message }, 500);
  }

  return c.json({ success: true, data: associate }, 201);
});

// Update profile
associateRoutes.put('/profile', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_profiles')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString()
    })
    .eq('associate_id', user.id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// ============================================
// EXPERIENCE ROUTES
// ============================================

associateRoutes.get('/experiences', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_experiences')
    .select('*')
    .eq('associate_id', user.id)
    .order('order_index', { ascending: true });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.post('/experiences', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createExperienceSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_experiences')
    .insert({
      associate_id: user.id,
      ...validation.data
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

associateRoutes.put('/experiences/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const validation = updateExperienceSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_experiences')
    .update(validation.data)
    .eq('id', id)
    .eq('associate_id', user.id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.delete('/experiences/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { error } = await db
    .from('associate_experiences')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Experience berhasil dihapus' });
});

// ============================================
// EDUCATION ROUTES
// ============================================

associateRoutes.get('/educations', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_educations')
    .select('*')
    .eq('associate_id', user.id)
    .order('order_index', { ascending: true });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.post('/educations', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createEducationSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_educations')
    .insert({
      associate_id: user.id,
      ...validation.data
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

associateRoutes.put('/educations/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const validation = createEducationSchema.partial().safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_educations')
    .update(validation.data)
    .eq('id', id)
    .eq('associate_id', user.id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.delete('/educations/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { error } = await db
    .from('associate_educations')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Education berhasil dihapus' });
});

// ============================================
// SKILL ROUTES
// ============================================

associateRoutes.get('/skills', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_skills')
    .select('*')
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.post('/skills', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createSkillSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_skills')
    .insert({
      associate_id: user.id,
      ...validation.data
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ success: false, error: 'Skill sudah ada' }, 409);
    }
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

associateRoutes.delete('/skills/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { error } = await db
    .from('associate_skills')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Skill berhasil dihapus' });
});

// ============================================
// LANGUAGE ROUTES
// ============================================

associateRoutes.get('/languages', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_languages')
    .select('*')
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.post('/languages', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createLanguageSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_languages')
    .insert({
      associate_id: user.id,
      ...validation.data
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ success: false, error: 'Bahasa sudah ada' }, 409);
    }
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

associateRoutes.delete('/languages/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { error } = await db
    .from('associate_languages')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Bahasa berhasil dihapus' });
});

// ============================================
// AVAILABILITY ROUTES
// ============================================

associateRoutes.get('/availability', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_availability')
    .select('*')
    .eq('associate_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || null });
});

associateRoutes.put('/availability', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = updateAvailabilitySchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  
  // Upsert availability
  const { data, error } = await db
    .from('associate_availability')
    .upsert({
      associate_id: user.id,
      ...validation.data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'associate_id' })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// ============================================
// SOCIAL LINKS ROUTES
// ============================================

associateRoutes.get('/social-links', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_social_links')
    .select('*')
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.post('/social-links', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = createSocialLinkSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_social_links')
    .insert({
      associate_id: user.id,
      ...validation.data
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ success: false, error: 'Platform social media sudah ada' }, 409);
    }
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

associateRoutes.put('/social-links/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const { data, error } = await getDb()
    .from('associate_social_links')
    .update(body)
    .eq('id', id)
    .eq('associate_id', user.id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

associateRoutes.delete('/social-links/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { error } = await db
    .from('associate_social_links')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Social link berhasil dihapus' });
});

// ============================================
// EMERGENCY CONTACT ROUTES
// ============================================

associateRoutes.get('/emergency-contact', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_emergency_contacts')
    .select('*')
    .eq('associate_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || null });
});

associateRoutes.put('/emergency-contact', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = updateEmergencyContactSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  
  // Upsert emergency contact
  const { data, error } = await db
    .from('associate_emergency_contacts')
    .upsert({
      associate_id: user.id,
      ...validation.data
    }, { onConflict: 'associate_id' })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// ============================================
// PREFERENCES ROUTES
// ============================================

associateRoutes.get('/preferences', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associate_preferences')
    .select('*')
    .eq('associate_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || null });
});

associateRoutes.put('/preferences', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = updatePreferencesSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  
  // Upsert preferences
  const { data, error } = await db
    .from('associate_preferences')
    .upsert({
      associate_id: user.id,
      ...validation.data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'associate_id' })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// ============================================
// SUBMIT FOR REVIEW
// ============================================

associateRoutes.post('/submit', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  // Check if profile is complete
  const { data: profile } = await db
    .from('associate_profiles')
    .select('full_name, bio, phone')
    .eq('associate_id', user.id)
    .single();

  if (!profile?.full_name) {
    return c.json({ success: false, error: 'Profil belum lengkap' }, 400);
  }

  // Update status to pending_review
  const { data, error } = await db
    .from('associates')
    .update({
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Enqueue event
  await db.rpc('enqueue_transformation_event', {
    p_type: 'AssociateSubmitted',
    p_aggregate_type: 'associate',
    p_aggregate_id: user.id,
    p_payload: { associate_id: user.id, submitted_at: new Date().toISOString() }
  });

  return c.json({ success: true, data, message: 'Profil berhasil dikirim untuk review' });
});

// ============================================
// ADMIN ROUTES
// ============================================

associateRoutes.use('*', requireRole(['admin']));

// Get all associates (admin)
associateRoutes.get('/', async (c) => {
  const db = getDb();
  const { limit = '50', offset = '0', status } = c.req.query();
  
  let query = db
    .from('associates')
    .select(`
      *,
      profile:associate_profiles(full_name, headline, phone),
      skills:associate_skills(skill_name)
    `, { count: 'exact' })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data, total: count });
});

// Get associate by ID (admin)
associateRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  
  const { data, error } = await db
    .from('associates')
    .select(`
      *,
      profile:associate_profiles(*),
      experiences:associate_experiences(*),
      educations:associate_educations(*),
      certifications:associate_certifications(*),
      portfolios:associate_portfolios(*),
      skills:associate_skills(*),
      languages:associate_languages(*),
      availability:associate_availability(*),
      socialLinks:associate_social_links(*),
      emergencyContact:associate_emergency_contacts(*),
      preferences:associate_preferences(*),
      reviews:associate_reviews(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  return c.json({ success: true, data });
});

// Approve associate
associateRoutes.post('/:id/approve', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const db = getDb();
  
  const { data, error } = await db
    .from('associates')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Enqueue event
  await db.rpc('enqueue_transformation_event', {
    p_type: 'AssociateApproved',
    p_aggregate_type: 'associate',
    p_aggregate_id: id,
    p_payload: { associate_id: id, approved_by: user.id, approved_at: new Date().toISOString() }
  });

  return c.json({ success: true, data, message: 'Associate berhasil disetujui' });
});

// Reject associate
associateRoutes.post('/:id/reject', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  const db = getDb();
  
  const { data, error } = await db
    .from('associates')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Enqueue event
  await db.rpc('enqueue_transformation_event', {
    p_type: 'AssociateRejected',
    p_aggregate_type: 'associate',
    p_aggregate_id: id,
    p_payload: { associate_id: id, rejected_by: user.id, reason: body?.reason }
  });

  return c.json({ success: true, data, message: 'Associate ditolak' });
});

// Suspend associate
associateRoutes.post('/:id/suspend', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  
  const { data, error } = await db
    .from('associates')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data, message: 'Associate berhasil suspended' });
});

// Reactivate associate
associateRoutes.post('/:id/reactivate', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  
  const { data, error } = await db
    .from('associates')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data, message: 'Associate berhasil diaktifkan kembali' });
});
