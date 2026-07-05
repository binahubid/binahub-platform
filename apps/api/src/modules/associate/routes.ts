import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import { generateUniqueSlug, ensureUniqueSlug, isValidSlug } from '@ams/shared/utils/slug';
import {
  createAssociateSchema,
  updateProfileSchema,
  createExperienceSchema,
  updateExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  createCertificationSchema,
  createSkillSchema,
  createLanguageSchema,
  updateAvailabilitySchema,
  createSocialLinkSchema,
  updateEmergencyContactSchema,
  updatePreferencesSchema
} from '@ams/shared/validators/associate';
import type { AuthUser } from '../../types';
import type { AppEnv } from '../../types/env.js';

export const associateRoutes = new Hono<AppEnv>();

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

  if (user.role === 'admin') {
    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: 'admin',
        profile: null,
        experiences: [],
        educations: [],
        certifications: [],
        portfolios: [],
        skills: [],
        languages: [],
        availability: null,
        socialLinks: [],
        emergencyContact: null,
        preferences: null,
        documents: [],
      },
    });
  }

  const db = getDb();
  
  let { data: associate, error } = await db
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
      documents:associate_documents(*)
    `)
    .eq('id', user.id)
    .single();

  if (error || !associate) {
    // Only create new associate if it truly doesn't exist
    const { data: existing } = await db
      .from('associates')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const baseName = user.email.split('@')[0] || 'associate';
      const slug = await ensureUniqueSlug(generateUniqueSlug(baseName), async (checkSlug) => {
        const { data } = await db
          .from('associates')
          .select('id')
          .eq('slug', checkSlug)
          .single();
        return !!data;
      });

      await db
        .from('associates')
        .insert({
          id: user.id,
          email: user.email,
          slug,
          status: 'draft'
        });

      await db
        .from('associate_profiles')
        .insert({
          associate_id: user.id,
          full_name: baseName
        });
    }

    // Re-fetch after creation
    const refetched = await db
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
        documents:associate_documents(*)
      `)
      .eq('id', user.id)
      .single();

    associate = refetched.data;
  }

  // Fetch reviews separately
  const { data: reviews } = await db
    .from('associate_reviews')
    .select('*')
    .eq('associate_id', user.id);

  // Fetch assignments with my participation status
  const { data: allAssignments } = await db
    .from('assignments')
    .select('*')
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false });

  const { data: myAssignments } = await db
    .from('assignment_assignees')
    .select('assignment_id, status, role, notes, invited_at, accepted_at')
    .eq('associate_id', user.id);

  const assigneeMap: Record<string, { status: string; role: string | null; notes: string | null; invited_at: string; accepted_at: string | null }> = {};
  for (const a of (myAssignments || []) as Array<{ assignment_id: string; status: string; role: string | null; notes: string | null; invited_at: string; accepted_at: string | null }>) {
    assigneeMap[a.assignment_id] = { status: a.status, role: a.role, notes: a.notes, invited_at: a.invited_at, accepted_at: a.accepted_at };
  }

  const assignmentsWithStatus = (allAssignments || []).map((a: Record<string, unknown>) => ({
    ...a,
    my_status: assigneeMap[a.id as string]?.status || null,
    my_role: assigneeMap[a.id as string]?.role || null,
    my_notes: assigneeMap[a.id as string]?.notes || null,
    my_invited_at: assigneeMap[a.id as string]?.invited_at || null,
  }));

  // Fetch assessments
  const { data: assessments } = await db
    .from('associate_assessments')
    .select('*')
    .eq('associate_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch development plan
  const { data: developmentPlan } = await db
    .from('associate_development_plans')
    .select('*')
    .eq('associate_id', user.id)
    .single();

  return c.json({ success: true, data: { ...associate, reviews: reviews || [], assignments: assignmentsWithStatus, assessments: assessments || [], development_plan: developmentPlan || null } });
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
  const slug = await ensureUniqueSlug(generateUniqueSlug(fullName), async (checkSlug) => {
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
    console.error('Update profile validation error:', validation.error.format());
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid',
      details: validation.error.issues
    }, 400);
  }

  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vd = validation.data as any;
  const {
    fullName, preferredName, headline, bio, phone,
    city, timezone, nationality, photoUrl,
    dateOfBirth, gender,
    roles, expertises
  } = vd as {
    fullName?: string;
    preferredName?: string | null;
    headline?: string | null;
    bio?: string | null;
    phone?: string | null;
    city?: string | null;
    timezone?: string | null;
    nationality?: string | null;
    photoUrl?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    roles?: string[];
    expertises?: string[];
  };

  const now = new Date().toISOString();

  // Fetch existing profile to preserve required columns (like full_name)
  const { data: existingProfile } = await db
    .from('associate_profiles')
    .select('full_name')
    .eq('associate_id', user.id)
    .single();

  const upsertData: Record<string, unknown> = {
    associate_id: user.id,
    updated_at: now
  };

  if (fullName !== undefined) {
    upsertData.full_name = fullName || '';
  } else if (existingProfile?.full_name) {
    upsertData.full_name = existingProfile.full_name;
  } else {
    // Fallback if profile doesn't exist yet and fullName not supplied
    upsertData.full_name = user.email ? user.email.split('@')[0] : 'Associate';
  }

  if (preferredName !== undefined) upsertData.preferred_name = preferredName ?? null;
  if (headline !== undefined) upsertData.headline = headline ?? null;
  if (bio !== undefined) upsertData.bio = bio ?? null;
  if (phone !== undefined) upsertData.phone = phone ?? null;
  if (city !== undefined) upsertData.city = city ?? null;
  if (timezone !== undefined) upsertData.timezone = timezone ?? null;
  if (nationality !== undefined) upsertData.nationality = nationality ?? null;
  if (photoUrl !== undefined) upsertData.photo_url = photoUrl ?? null;
  if (dateOfBirth !== undefined) upsertData.date_of_birth = dateOfBirth ?? null;
  if (gender !== undefined) upsertData.gender = gender ?? null;
  if (roles !== undefined) upsertData.roles = roles;
  if (expertises !== undefined) upsertData.expertises = expertises;

  const { data, error } = await db
    .from('associate_profiles')
    .upsert(upsertData, { onConflict: 'associate_id' })
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expData = validation.data as any as {
    organization: string;
    position: string;
    industry?: string;
    description?: string;
    achievement?: string;
    startDate: string;
    endDate?: string;
    isCurrent?: boolean;
  };
  const { organization, position, industry, description, achievement, startDate, endDate, isCurrent } = expData;

  // Check for duplicate experience (same organization + position)
  const { data: existing } = await db
    .from('associate_experiences')
    .select('id')
    .eq('associate_id', user.id)
    .ilike('organization', organization)
    .ilike('position', position)
    .maybeSingle();

  if (existing) {
    return c.json({ success: false, error: 'Pengalaman dengan organisasi dan posisi yang sama sudah ada' }, 409);
  }

  const { data, error } = await db
    .from('associate_experiences')
    .insert({
      associate_id: user.id,
      organization,
      position,
      industry: industry ?? null,
      description: description ?? null,
      achievement: achievement ?? null,
      start_date: startDate,
      end_date: endDate ?? null,
      is_current: isCurrent ?? false
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = validation.data as any as {
    organization?: string;
    position?: string;
    industry?: string;
    description?: string;
    achievement?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    orderIndex?: number;
  };
  const updateData: Record<string, unknown> = {};
  if (v.organization !== undefined) updateData.organization = v.organization;
  if (v.position !== undefined) updateData.position = v.position;
  if (v.industry !== undefined) updateData.industry = v.industry;
  if (v.description !== undefined) updateData.description = v.description;
  if (v.achievement !== undefined) updateData.achievement = v.achievement;
  if (v.startDate !== undefined) updateData.start_date = v.startDate;
  if (v.endDate !== undefined) updateData.end_date = v.endDate;
  if (v.isCurrent !== undefined) updateData.is_current = v.isCurrent;
  if (v.orderIndex !== undefined) updateData.order_index = v.orderIndex;

  const { data, error } = await db
    .from('associate_experiences')
    .update(updateData)
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
      institution: validation.data.institution,
      degree: validation.data.degree,
      field_of_study: validation.data.fieldOfStudy || null,
      start_year: validation.data.startYear || null,
      end_year: validation.data.endYear || null,
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
  
  const validation = updateEducationSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const db = getDb();
  const updateData: Record<string, unknown> = {};
  if (validation.data.institution !== undefined) updateData.institution = validation.data.institution;
  if (validation.data.degree !== undefined) updateData.degree = validation.data.degree;
  if (validation.data.fieldOfStudy !== undefined) updateData.field_of_study = validation.data.fieldOfStudy;
  if (validation.data.startYear !== undefined) updateData.start_year = validation.data.startYear;
  if (validation.data.endYear !== undefined) updateData.end_year = validation.data.endYear;
  if (validation.data.orderIndex !== undefined) updateData.order_index = validation.data.orderIndex;

  const { data, error } = await db
    .from('associate_educations')
    .update(updateData)
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
      skill_name: validation.data.skillName,
      category: validation.data.category || null,
      proficiency: validation.data.proficiency || null,
      years_experience: validation.data.yearsExperience || null,
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
// PORTFOLIO ROUTES
// ============================================

associateRoutes.post('/portfolios', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  const db = getDb();
  
  const { title, description, category, clientName, projectUrl } = body;
  if (!title) {
    return c.json({ success: false, error: 'Judul portofolio wajib diisi' }, 400);
  }

  const { data, error } = await db
    .from('associate_portfolios')
    .insert({
      associate_id: user.id,
      title,
      description: description ?? null,
      category: category ?? null,
      client_name: clientName ?? null,
      project_url: projectUrl ?? null
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

associateRoutes.delete('/portfolios/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { error } = await db
    .from('associate_portfolios')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Portofolio berhasil dihapus' });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const av = validation.data as any as {
    status?: string;
    maxHoursPerWeek?: number;
    workLocations?: string[];
    travelReady?: boolean;
    preferredEngagements?: string[];
    availableFrom?: string;
    notes?: string;
  };
  const availData: Record<string, unknown> = { associate_id: user.id, updated_at: new Date().toISOString() };
  if (av.status !== undefined) availData.status = av.status;
  if (av.maxHoursPerWeek !== undefined) availData.max_hours_per_week = av.maxHoursPerWeek;
  if (av.workLocations !== undefined) availData.work_locations = av.workLocations;
  if (av.travelReady !== undefined) availData.travel_ready = av.travelReady;
  if (av.preferredEngagements !== undefined) availData.preferred_engagements = av.preferredEngagements;
  if (av.availableFrom !== undefined) availData.available_from = av.availableFrom;
  if (av.notes !== undefined) availData.notes = av.notes;

  const { data, error } = await db
    .from('associate_availability')
    .upsert(availData, { onConflict: 'associate_id' })
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
      platform: validation.data.platform,
      url: validation.data.url,
      is_primary: validation.data.isPrimary ?? false,
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
// ASSIGNMENTS (for associates)
// ============================================

associateRoutes.get('/assignments', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();

  const { data: associate } = await db
    .from('associates')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!associate) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  const { data: assignments, error } = await db
    .from('assignments')
    .select('*')
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const { data: myAssignments } = await db
    .from('assignment_assignees')
    .select('assignment_id, status, role, notes, invited_at, accepted_at')
    .eq('associate_id', associate.id);

  const assigneeMap: Record<string, { status: string; role: string | null; notes: string | null; invited_at: string; accepted_at: string | null }> = {};
  for (const a of (myAssignments || []) as Array<{ assignment_id: string; status: string; role: string | null; notes: string | null; invited_at: string; accepted_at: string | null }>) {
    assigneeMap[a.assignment_id] = { status: a.status, role: a.role, notes: a.notes, invited_at: a.invited_at, accepted_at: a.accepted_at };
  }

  const result = (assignments || []).map((a: Record<string, unknown>) => ({
    ...a,
    my_status: assigneeMap[a.id as string]?.status || null,
    my_role: assigneeMap[a.id as string]?.role || null,
    my_notes: assigneeMap[a.id as string]?.notes || null,
    my_invited_at: assigneeMap[a.id as string]?.invited_at || null,
  }));

  return c.json({ success: true, data: result });
});

associateRoutes.get('/assignments/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const assignmentId = c.req.param('id');
  const db = getDb();

  const { data: assignment, error } = await db
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    return c.json({ success: false, error: 'Assignment tidak ditemukan' }, 404);
  }

  const { data: associate } = await db
    .from('associates')
    .select('id')
    .eq('id', user.id)
    .single();

  let myAssignment: Record<string, unknown> | null = null;
  if (associate) {
    const { data: assignee } = await db
      .from('assignment_assignees')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('associate_id', associate.id)
      .single();
    myAssignment = assignee as Record<string, unknown> | null;
  }

  const { data: assignees } = await db
    .from('assignment_assignees')
    .select('status, role')
    .eq('assignment_id', assignmentId);

  const acceptedCount = (assignees || []).filter((a: { status: string }) => a.status === 'accepted' || a.status === 'in_progress').length;

  return c.json({
    success: true,
    data: {
      ...assignment,
      my_assignment: myAssignment,
      accepted_count: acceptedCount,
      total_assignees: (assignees || []).length,
    },
  });
});

associateRoutes.post('/assignments/:id/apply', async (c) => {
  const user = c.get('user') as AuthUser;
  const assignmentId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { role, notes } = body;
  const db = getDb();

  const { data: associate } = await db
    .from('associates')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!associate) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  const { data: assignment } = await db
    .from('assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .single();

  if (!assignment) {
    return c.json({ success: false, error: 'Assignment tidak ditemukan' }, 404);
  }

  if ((assignment as { status: string }).status === 'cancelled' || (assignment as { status: string }).status === 'completed') {
    return c.json({ success: false, error: 'Assignment sudah tidak menerima pendaftar' }, 400);
  }

  const { data: existing } = await db
    .from('assignment_assignees')
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('associate_id', associate.id)
    .maybeSingle();

  if (existing) {
    return c.json({ success: false, error: 'Anda sudah terdaftar di assignment ini' }, 400);
  }

  const { data, error } = await db
    .from('assignment_assignees')
    .insert({
      assignment_id: assignmentId,
      associate_id: associate.id,
      status: 'applied',
      role: role || null,
      notes: notes || null,
      invited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data, message: 'Berhasil apply ke assignment' }, 201);
});

associateRoutes.patch('/assignments/:id/status', async (c) => {
  const user = c.get('user') as AuthUser;
  const assignmentId = c.req.param('id');
  const body = await c.req.json();
  const { status } = body;
  const db = getDb();

  const validStatuses = ['accepted', 'declined', 'in_progress', 'completed', 'withdrawn'];
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Status tidak valid' }, 400);
  }

  const { data: associate } = await db
    .from('associates')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!associate) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'accepted') updateData.accepted_at = new Date().toISOString();
  if (status === 'completed') updateData.completed_at = new Date().toISOString();

  const { data, error } = await db
    .from('assignment_assignees')
    .update(updateData)
    .eq('assignment_id', assignmentId)
    .eq('associate_id', associate.id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  if (!data) {
    return c.json({ success: false, error: 'Anda tidak terdaftar di assignment ini' }, 404);
  }

  return c.json({ success: true, data, message: `Status diubah ke ${status}` });
});

// ============================================
// NOTIFICATIONS (for associates - must be before admin routes)
// ============================================
associateRoutes.get('/notifications', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();

  const { data: invitations } = await db
    .from('assignment_assignees')
    .select('id, assignment_id, status, role, notes, invited_at, accepted_at, updated_at')
    .eq('associate_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  const notifications = [];
  for (const inv of (invitations || []) as Array<{ id: string; assignment_id: string; status: string; role: string | null; notes: string | null; invited_at: string; accepted_at: string | null; updated_at: string }>) {
    const { data: assignment } = await db
      .from('assignments')
      .select('id, title, client_name, status, needed_roles')
      .eq('id', inv.assignment_id)
      .single();

    if (assignment) {
      const a = assignment as { id: string; title: string; client_name: string | null; status: string; needed_roles: string[] | null };
      let title = `Undangan ke Assignment: ${a.title}`;
      let message = `Anda diundang oleh admin untuk bergabung ke assignment "${a.title}"${a.client_name ? ` dari ${a.client_name}` : ''}`;
      let created_at = inv.invited_at;

      if (inv.status === 'accepted') {
        title = `Undangan diterima: ${a.title}`;
        message = `Anda menerima undangan ke assignment "${a.title}"`;
        created_at = inv.accepted_at || inv.updated_at;
      } else if (inv.status === 'declined') {
        title = `Undangan ditolak: ${a.title}`;
        message = `Anda menolak undangan ke assignment "${a.title}"`;
        created_at = inv.updated_at;
      } else if (inv.status === 'in_progress') {
        title = `Assignment berjalan: ${a.title}`;
        message = `Assignment "${a.title}" sedang berjalan`;
        created_at = inv.updated_at;
      } else if (inv.status === 'completed') {
        title = `Assignment selesai: ${a.title}`;
        message = `Assignment "${a.title}" telah selesai`;
        created_at = inv.updated_at;
      }

      notifications.push({
        id: inv.id,
        type: 'invitation',
        status: inv.status,
        title,
        message,
        assignment_id: inv.assignment_id,
        assignment_title: a.title,
        role: inv.role,
        invited_at: inv.invited_at,
        created_at,
        read: inv.status !== 'invited',
      });
    }
  }

  return c.json({ success: true, data: notifications });
});

associateRoutes.get('/notifications/count', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();

  const { count } = await db
    .from('assignment_assignees')
    .select('*', { count: 'exact', head: true })
    .eq('associate_id', user.id);

  return c.json({ success: true, data: { count: count || 0 } });
});

// ============================================
// TASKS (for associates)
// ============================================

associateRoutes.get('/tasks', async (c) => {
  const user = c.get('user') as AuthUser;
  const db = getDb();

  const { data, error } = await db
    .from('associate_tasks')
    .select('*')
    .eq('associate_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data: data || [] });
});

associateRoutes.post('/tasks', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  const { title } = body;

  if (!title || !title.trim()) {
    return c.json({ success: false, error: 'Judul tugas wajib diisi' }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('associate_tasks')
    .insert({
      associate_id: user.id,
      title: title.trim(),
      completed: false,
    })
    .select()
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data }, 201);
});

associateRoutes.patch('/tasks/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { title, completed } = body;

  const db = getDb();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updateData.title = title;
  if (completed !== undefined) updateData.completed = completed;

  const { data, error } = await db
    .from('associate_tasks')
    .update(updateData)
    .eq('id', id)
    .eq('associate_id', user.id)
    .select()
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  if (!data) return c.json({ success: false, error: 'Task tidak ditemukan' }, 404);
  return c.json({ success: true, data });
});

associateRoutes.delete('/tasks/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();

  const { error } = await db
    .from('associate_tasks')
    .delete()
    .eq('id', id)
    .eq('associate_id', user.id);

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, message: 'Task berhasil dihapus' });
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
      preferences:associate_preferences(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  const { data: reviews } = await db
    .from('associate_reviews')
    .select('*')
    .eq('associate_id', id);

  return c.json({ success: true, data: { ...data, reviews: reviews || [] } });
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
