import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import type { AppEnv } from '../../types/env.js';

const admin = new Hono<AppEnv>();

admin.use('*', authMiddleware);
admin.use('*', requireRole(['admin']));

admin.get('/stats', async (c) => {
  const db = getDb();

  const { count: total } = await db.from('associates').select('*', { count: 'exact', head: true });
  const { count: pending } = await db.from('associates').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');
  const { count: active } = await db.from('associates').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: draft } = await db.from('associates').select('*', { count: 'exact', head: true }).eq('status', 'draft');

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: newThisWeek } = await db.from('associates').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo);

  let incompleteProfiles = 0;
  const { data: profiles } = await db.from('associate_profiles').select('bio, phone, photo_url');
  if (profiles) {
    for (const p of profiles) {
      const pr = p as Record<string, unknown>;
      if (!pr.bio || !pr.phone || !pr.photo_url) incompleteProfiles++;
    }
  }

  const { count: totalDocuments } = await db.from('associate_documents').select('*', { count: 'exact', head: true });

  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const { count: cvToday } = await db.from('associate_documents').select('*', { count: 'exact', head: true }).eq('type', 'cv').gte('created_at', dayStart);

  return c.json({
    success: true,
    data: {
      total: total || 0,
      pending_review: pending || 0,
      active: active || 0,
      draft: draft || 0,
      new_this_week: newThisWeek || 0,
      incomplete_profiles: incompleteProfiles,
      total_documents: totalDocuments || 0,
      cv_uploaded_today: cvToday || 0,
    },
  });
});

admin.get('/associates', async (c) => {
  const { search, status, limit = '50', offset = '0' } = c.req.query();
  const db = getDb();

  let query = db
    .from('associates')
    .select(`
      *,
      profile:associate_profiles(full_name, headline, photo_url, city, phone, roles, expertises),
      skills:associate_skills(skill_name),
      experiences:associate_experiences(id),
      educations:associate_educations(id),
      portfolios:associate_portfolios(id),
      documents:associate_documents(id),
      availability:associate_availability(status),
      reviews:associate_reviews(id, status, notes, reviewer_id, decision_at, created_at)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    // Search by email directly + by profile name via a subquery
    const { data: matchingProfiles } = await db
      .from('associate_profiles')
      .select('associate_id')
      .ilike('full_name', `%${search}%`);
    const profileIds = (matchingProfiles || []).map((p: { associate_id: string }) => p.associate_id);
    if (profileIds.length > 0) {
      query = query.or(`email.ilike.%${search}%,id.in.(${profileIds.map((id: string) => `"${id}"`).join(',')})`);
    } else {
      query = query.ilike('email', `%${search}%`);
    }
  } else {
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const enriched = (data || []).map((a: Record<string, unknown>) => {
    let filled = 0;
    const total = 9;
    const profile = a.profile as Record<string, unknown> | null;
    if (profile && profile.full_name) filled++;
    if (a.experiences && (a.experiences as unknown[]).length > 0) filled++;
    if (a.educations && (a.educations as unknown[]).length > 0) filled++;
    const skills = a.skills as unknown[] | undefined;
    if (skills && skills.length > 0) filled++;
    const expertises = profile?.expertises as unknown[] | undefined;
    if (expertises && expertises.length > 0) filled++;
    if (a.portfolios && (a.portfolios as unknown[]).length > 0) filled++;
    if (a.documents && (a.documents as unknown[]).length > 0) filled++;
    if (profile && profile.photo_url) filled++;
    if (a.availability) {
      const avail = Array.isArray(a.availability) ? a.availability[0] : a.availability;
      if (avail && (avail as Record<string, unknown>).status) filled++;
    }
    return { ...a, completeness: Math.round((filled / total) * 100) };
  });

  return c.json({
    success: true,
    data: enriched,
    total: count || 0,
  });
});

admin.get('/associates/:id', async (c) => {
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
      documents:associate_documents(*)
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

admin.patch('/associates/:id/review', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const { status, notes } = body;
  const db = getDb();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status === 'approved') {
    updateData.status = 'active';
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = user.id;
  } else if (status === 'rejected') {
    updateData.status = 'draft';
  }

  const { data, error } = await db
    .from('associates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Check if review already exists
  const { data: existingReview } = await db
    .from('associate_reviews')
    .select('id')
    .eq('associate_id', id)
    .maybeSingle();

  let reviewError;
  if (existingReview) {
    const { error } = await db
      .from('associate_reviews')
      .update({
        reviewer_id: user.id,
        status,
        notes: notes || null,
        decision_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .eq('associate_id', id);
    reviewError = error;
  } else {
    const { error } = await db
      .from('associate_reviews')
      .insert({
        associate_id: id,
        reviewer_id: user.id,
        status,
        notes: notes || null,
        decision_at: new Date().toISOString(),
      });
    reviewError = error;
  }

  if (reviewError) {
    console.error('Review save error:', reviewError);
    return c.json({ success: false, error: `Associate updated but review failed: ${reviewError.message}` }, 500);
  }

  return c.json({ success: true, data, message: `Associate ${status}` });
});

admin.get('/capabilities', async (c) => {
  const db = getDb();

  const { data, error } = await db
    .from('associate_skills')
    .select('skill_name');

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const counts: Record<string, number> = {};
  for (const row of (data || []) as { skill_name: string }[]) {
    const name = row.skill_name;
    counts[name] = (counts[name] || 0) + 1;
  }

  const sorted = Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return c.json({ success: true, data: sorted });
});

admin.get('/activities', async (c) => {
  const db = getDb();
  const limit = parseInt(c.req.query('limit') || '50');

  // Fetch profile names map
  const { data: profiles } = await db.from('associate_profiles').select('associate_id, full_name');
  const profileMap = new Map<string, string>();
  for (const p of (profiles || []) as { associate_id: string; full_name: string }[]) {
    profileMap.set(p.associate_id, p.full_name);
  }

  type ActivityItem = { icon: string; iconBg: string; iconColor: string; text: string; time: string; id: string; ts: number };
  const activities: ActivityItem[] = [];

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  // 1. Associate registrations & status changes
  const { data: associates } = await db
    .from('associates')
    .select('id, email, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  for (const a of (associates || []) as { id: string; email: string; status: string; created_at: string; updated_at: string }[]) {
    const name = profileMap.get(a.id) || a.email;
    if (a.status === 'pending_review') {
      activities.push({ icon: 'clock', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', text: `${name} mengirim profil untuk review`, time: formatTime(a.updated_at), id: `assoc-${a.id}`, ts: new Date(a.updated_at).getTime() });
    } else if (a.status === 'active') {
      activities.push({ icon: 'check', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', text: `${name} telah disetujui`, time: formatTime(a.updated_at), id: `assoc-${a.id}`, ts: new Date(a.updated_at).getTime() });
    } else if (a.status === 'draft') {
      activities.push({ icon: 'user', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', text: `${name} mendaftar di BinaHub`, time: formatTime(a.created_at), id: `assoc-${a.id}`, ts: new Date(a.created_at).getTime() });
    }
  }

  // 2. Reviews
  const { data: reviews } = await db
    .from('associate_reviews')
    .select('id, associate_id, status, decision_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  for (const r of (reviews || []) as { id: string; associate_id: string; status: string; decision_at: string | null; created_at: string }[]) {
    const name = profileMap.get(r.associate_id) || 'Associate';
    if (r.status === 'approved' && r.decision_at) {
      activities.push({ icon: 'check', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', text: `Review disetujui untuk ${name}`, time: formatTime(r.decision_at), id: `review-${r.id}`, ts: new Date(r.decision_at).getTime() });
    } else if (r.status === 'rejected' && r.decision_at) {
      activities.push({ icon: 'x', iconBg: 'bg-red-100', iconColor: 'text-red-600', text: `Review ditolak untuk ${name}`, time: formatTime(r.decision_at), id: `review-${r.id}`, ts: new Date(r.decision_at).getTime() });
    } else if (r.status === 'pending') {
      activities.push({ icon: 'clock', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', text: `Review baru dari ${name}`, time: formatTime(r.created_at), id: `review-${r.id}`, ts: new Date(r.created_at).getTime() });
    }
  }

  // 3. Document uploads
  const { data: docs } = await db
    .from('associate_documents')
    .select('id, associate_id, type, name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  for (const d of (docs || []) as { id: string; associate_id: string; type: string; name: string; created_at: string }[]) {
    const name = profileMap.get(d.associate_id) || 'Associate';
    activities.push({ icon: 'upload', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', text: `${name} mengunggah ${d.type === 'cv' ? 'CV' : d.name}`, time: formatTime(d.created_at), id: `doc-${d.id}`, ts: new Date(d.created_at).getTime() });
  }

  // 4. Assignments
  const { data: assignments } = await db
    .from('assignments')
    .select('id, title, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  for (const asgn of (assignments || []) as { id: string; title: string; status: string; created_at: string; updated_at: string }[]) {
    if (asgn.status === 'active') {
      activities.push({ icon: 'briefcase', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', text: `Assignment "${asgn.title}" diaktifkan`, time: formatTime(asgn.updated_at), id: `asgn-${asgn.id}`, ts: new Date(asgn.updated_at).getTime() });
    } else {
      activities.push({ icon: 'briefcase', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', text: `Assignment "${asgn.title}" dibuat`, time: formatTime(asgn.created_at), id: `asgn-${asgn.id}`, ts: new Date(asgn.created_at).getTime() });
    }
  }

  // Sort by timestamp descending, then limit
  activities.sort((a, b) => b.ts - a.ts);

  return c.json({ success: true, data: activities.slice(0, limit).map(({ ts, ...rest }) => rest) });
});

admin.get('/assignments', async (c) => {
  const { status, limit = '50', offset = '0' } = c.req.query();
  const db = getDb();

  let query = db
    .from('assignments')
    .select('*', { count: 'exact' })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || [], total: count || 0 });
});

admin.post('/assignments', async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const { title, client_name, description, start_date, end_date, needed_roles, needed_count } = body;

  if (!title || !client_name) {
    return c.json({ success: false, error: 'title dan client_name wajib diisi' }, 400);
  }

  const db = getDb();

  const { data, error } = await db
    .from('assignments')
    .insert({
      title,
      client_name,
      description: description || null,
      start_date: start_date || null,
      end_date: end_date || null,
      needed_roles: needed_roles || [],
      needed_count: needed_count || 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

admin.patch('/assignments/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.client_name !== undefined) updateData.client_name = body.client_name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.start_date !== undefined) updateData.start_date = body.start_date;
  if (body.end_date !== undefined) updateData.end_date = body.end_date;
  if (body.needed_roles !== undefined) updateData.needed_roles = body.needed_roles;
  if (body.needed_count !== undefined) updateData.needed_count = body.needed_count;

  const { data, error } = await db
    .from('assignments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

admin.delete('/assignments/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const { error } = await db.from('assignments').delete().eq('id', id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Assignment dihapus' });
});

admin.post('/assignments/:id/invite', async (c) => {
  const user = c.get('user') as { id: string };
  const assignmentId = c.req.param('id');
  const body = await c.req.json();
  const { associate_ids, role } = body;

  if (!associate_ids || !Array.isArray(associate_ids) || associate_ids.length === 0) {
    return c.json({ success: false, error: 'associate_ids wajib diisi (array)' }, 400);
  }

  const db = getDb();

  const { data: assignment } = await db
    .from('assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .single();

  if (!assignment) {
    return c.json({ success: false, error: 'Assignment tidak ditemukan' }, 404);
  }

  const { data: existing } = await db
    .from('assignment_assignees')
    .select('associate_id')
    .eq('assignment_id', assignmentId);

  const existingIds = (existing || []).map((e: { associate_id: string }) => e.associate_id);
  const newIds = associate_ids.filter((id: string) => !existingIds.includes(id));

  if (newIds.length === 0) {
    return c.json({ success: false, error: 'Semua associate sudah diinvite ke assignment ini' }, 400);
  }

  const inserts = newIds.map((associateId: string) => ({
    assignment_id: assignmentId,
    associate_id: associateId,
    status: 'invited',
    role: role || null,
    invited_by: user.id,
  }));

  const { data, error } = await db
    .from('assignment_assignees')
    .insert(inserts)
    .select();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data, invited: newIds.length }, 201);
});

admin.get('/assignments/:id/assignees', async (c) => {
  const assignmentId = c.req.param('id');
  const db = getDb();

  const { data, error } = await db
    .from('assignment_assignees')
    .select(`
      *,
      associate:associates(id, email, status),
      profile:associate_profiles(full_name, headline, photo_url, city)
    `)
    .eq('assignment_id', assignmentId)
    .order('invited_at', { ascending: true });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

admin.patch('/assignments/:id/assignees/:aid', async (c) => {
  const assignmentId = c.req.param('id');
  const assigneeId = c.req.param('aid');
  const body = await c.req.json();
  const { status, role, notes } = body;

  const db = getDb();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) {
    updateData.status = status;
    if (status === 'accepted') updateData.accepted_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
  }
  if (role !== undefined) updateData.role = role;
  if (notes !== undefined) updateData.notes = notes;

  const { data, error } = await db
    .from('assignment_assignees')
    .update(updateData)
    .eq('id', assigneeId)
    .eq('assignment_id', assignmentId)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  if (!data) {
    return c.json({ success: false, error: 'Assignee tidak ditemukan' }, 404);
  }

  return c.json({ success: true, data });
});

admin.delete('/assignments/:id/assignees/:aid', async (c) => {
  const assignmentId = c.req.param('id');
  const assigneeId = c.req.param('aid');
  const db = getDb();

  const { error } = await db
    .from('assignment_assignees')
    .delete()
    .eq('id', assigneeId)
    .eq('assignment_id', assignmentId);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Assignee dihapus dari assignment' });
});

admin.get('/users', async (c) => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  const body = await response.json() as { data?: { users?: Record<string, unknown>[] }; error?: { message: string } };

  if (body.error) {
    return c.json({ success: false, error: body.error.message }, 500);
  }

  const users = (body.data?.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    role: ((u.app_metadata as Record<string, unknown>)?.role as string) || 'associate',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    user_metadata: u.user_metadata,
  }));

  return c.json({ success: true, data: users });
});

admin.patch('/users/:id/role', async (c) => {
  const targetUserId = c.req.param('id');
  const body = await c.req.json();
  const { role } = body;

  if (!['admin', 'reviewer', 'associate'].includes(role)) {
    return c.json({ success: false, error: 'Role tidak valid' }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      app_metadata: { role },
    }),
  });

  const data = await response.json() as { error?: { message: string } };

  if (data.error) {
    return c.json({ success: false, error: data.error.message }, 500);
  }

  return c.json({ success: true, message: `Role diubah ke ${role}` });
});

admin.get('/reports/summary', async (c) => {
  const db = getDb();

  const { count: totalAssociates } = await db.from('associates').select('*', { count: 'exact', head: true });
  const { count: activeAssociates } = await db.from('associates').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: pendingAssociates } = await db.from('associates').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');
  const { count: totalDocuments } = await db.from('associate_documents').select('*', { count: 'exact', head: true });
  const { count: totalAssignments } = await db.from('assignments').select('*', { count: 'exact', head: true });
  const { count: activeAssignments } = await db.from('assignments').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalReviews } = await db.from('associate_reviews').select('*', { count: 'exact', head: true });
  const { count: totalSkills } = await db.from('associate_skills').select('*', { count: 'exact', head: true });

  const { data: skills } = await db.from('associate_skills').select('skill_name');
  const skillCounts: Record<string, number> = {};
  for (const row of (skills || []) as { skill_name: string }[]) {
    skillCounts[row.skill_name] = (skillCounts[row.skill_name] || 0) + 1;
  }
  const topSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const { data: profiles } = await db.from('associate_profiles').select('city');
  const cityCounts: Record<string, number> = {};
  let unknownCityCount = 0;
  for (const row of (profiles || []) as { city: string | null }[]) {
    if (row.city && row.city.trim() !== '') {
      cityCounts[row.city] = (cityCounts[row.city] || 0) + 1;
    } else {
      unknownCityCount++;
    }
  }
  const topCities = Object.entries(cityCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  let incompleteProfiles = 0;
  const { data: allProfiles } = await db.from('associate_profiles').select('bio, phone, photo_url');
  if (allProfiles) {
    for (const p of allProfiles) {
      const pr = p as Record<string, unknown>;
      if (!pr.bio || !pr.phone || !pr.photo_url) incompleteProfiles++;
    }
  }

  return c.json({
    success: true,
    data: {
      total_associates: totalAssociates || 0,
      active_associates: activeAssociates || 0,
      pending_associates: pendingAssociates || 0,
      incomplete_profiles: incompleteProfiles,
      total_documents: totalDocuments || 0,
      total_assignments: totalAssignments || 0,
      active_assignments: activeAssignments || 0,
      total_reviews: totalReviews || 0,
      total_skills: totalSkills || 0,
      top_skills: topSkills,
      top_cities: topCities,
      unknown_city_count: unknownCityCount,
    },
  });
});

admin.get('/preferences', async (c) => {
  const user = c.get('user') as { id: string };
  const db = getDb();

  const { data, error } = await db
    .from('admin_preferences')
    .select('*')
    .eq('admin_id', user.id)
    .maybeSingle();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || {} });
});

admin.put('/preferences', async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const db = getDb();

  const { data, error } = await db
    .from('admin_preferences')
    .upsert({
      admin_id: user.id,
      email_notifications: body.email_notifications,
      review_alerts: body.review_alerts,
      weekly_summary: body.weekly_summary,
      new_associate_alerts: body.new_associate_alerts,
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

admin.get('/growth', async (c) => {
  const db = getDb();
  const { data, error } = await db
    .from('associates')
    .select('created_at');

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Group by month
  const monthCounts: Record<string, number> = {};
  const now = new Date();
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[key] = 0;
  }

  for (const row of (data || []) as { created_at: string }[]) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in monthCounts) {
      monthCounts[key]++;
    }
  }

  const months = Object.entries(monthCounts).map(([key, value]) => {
    const [y, m] = key.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return {
      label: date.toLocaleDateString('id-ID', { month: 'short' }),
      value,
    };
  });

  // Assignment status distribution
  const { data: assignments } = await db
    .from('assignments')
    .select('status');

  const statusCounts: Record<string, number> = { draft: 0, active: 0, completed: 0, cancelled: 0 };
  for (const row of (assignments || []) as { status: string }[]) {
    if (row.status in statusCounts) {
      statusCounts[row.status]++;
    }
  }

  return c.json({
    success: true,
    data: {
      growth: months,
      assignment_status: statusCounts,
    },
  });
});

admin.get('/associates/:id/cv', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const { data: associate, error: assocError } = await db
    .from('associates')
    .select('id, email, status, created_at')
    .eq('id', id)
    .single();

  if (assocError || !associate) {
    return c.json({ success: false, error: 'Associate tidak ditemukan' }, 404);
  }

  const [
    { data: profile },
    { data: experiences },
    { data: educations },
    { data: certifications },
    { data: portfolios },
    { data: skills },
    { data: languages },
    { data: availability },
    { data: socialLinks },
  ] = await Promise.all([
    db.from('associate_profiles').select('*').eq('associate_id', id).single(),
    db.from('associate_experiences').select('*').eq('associate_id', id).order('start_year', { ascending: false }),
    db.from('associate_educations').select('*').eq('associate_id', id).order('start_year', { ascending: false }),
    db.from('associate_certifications').select('*').eq('associate_id', id).order('issued_date', { ascending: false }),
    db.from('associate_portfolios').select('*').eq('associate_id', id).order('created_at', { ascending: false }),
    db.from('associate_skills').select('*').eq('associate_id', id).order('proficiency', { ascending: false }),
    db.from('associate_languages').select('*').eq('associate_id', id),
    db.from('associate_availability').select('*').eq('associate_id', id),
    db.from('associate_social_links').select('*').eq('associate_id', id),
  ]);

  return c.json({
    success: true,
    data: {
      associate,
      profile,
      experiences: experiences || [],
      educations: educations || [],
      certifications: certifications || [],
      portfolios: portfolios || [],
      skills: skills || [],
      languages: languages || [],
      availability: availability || [],
      social_links: socialLinks || [],
    },
  });
});

// ============================================
// ADMIN NOTIFICATIONS
// ============================================
admin.get('/notifications', async (c) => {
  const user = c.get('user') as { id: string };
  const db = getDb();

  const notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    assignment_id: string;
    assignment_title: string;
    associate_id: string;
    associate_name: string;
    status: string;
    created_at: string;
  }> = [];

  // 1. Associates who accepted invitations
  const { data: acceptedAssignees } = await db
    .from('assignment_assignees')
    .select('id, assignment_id, associate_id, status, accepted_at')
    .eq('invited_by', user.id)
    .in('status', ['accepted', 'in_progress'])
    .order('accepted_at', { ascending: false })
    .limit(20);

  if (acceptedAssignees) {
    for (const a of acceptedAssignees as Array<{
      id: string; assignment_id: string; associate_id: string;
      status: string; accepted_at: string | null;
    }>) {
      const { data: assignment } = await db
        .from('assignments')
        .select('id, title')
        .eq('id', a.assignment_id)
        .single();
      const { data: profile } = await db
        .from('associate_profiles')
        .select('full_name')
        .eq('associate_id', a.associate_id)
        .single();
      if (assignment && profile) {
        notifications.push({
          id: `accepted-${a.id}`,
          type: 'accepted',
          title: `${profile.full_name} menerima undangan`,
          message: `${profile.full_name} menerima undangan ke assignment "${(assignment as { title: string }).title}"`,
          assignment_id: a.assignment_id,
          assignment_title: (assignment as { title: string }).title,
          associate_id: a.associate_id,
          associate_name: profile.full_name,
          status: a.status,
          created_at: a.accepted_at || new Date().toISOString(),
        });
      }
    }
  }

  // 2. Associates who declined invitations
  const { data: declinedAssignees } = await db
    .from('assignment_assignees')
    .select('id, assignment_id, associate_id, status, updated_at')
    .eq('invited_by', user.id)
    .eq('status', 'declined')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (declinedAssignees) {
    for (const a of declinedAssignees as Array<{
      id: string; assignment_id: string; associate_id: string;
      status: string; updated_at: string;
    }>) {
      const { data: assignment } = await db
        .from('assignments')
        .select('id, title')
        .eq('id', a.assignment_id)
        .single();
      const { data: profile } = await db
        .from('associate_profiles')
        .select('full_name')
        .eq('associate_id', a.associate_id)
        .single();
      if (assignment && profile) {
        notifications.push({
          id: `declined-${a.id}`,
          type: 'declined',
          title: `${profile.full_name} menolak undangan`,
          message: `${profile.full_name} menolak undangan ke assignment "${(assignment as { title: string }).title}"`,
          assignment_id: a.assignment_id,
          assignment_title: (assignment as { title: string }).title,
          associate_id: a.associate_id,
          associate_name: profile.full_name,
          status: a.status,
          created_at: a.updated_at,
        });
      }
    }
  }

  // 3. New associate applications (applied status)
  const { data: appliedAssignees } = await db
    .from('assignment_assignees')
    .select('id, assignment_id, associate_id, status, invited_at')
    .eq('invited_by', user.id)
    .eq('status', 'applied')
    .order('invited_at', { ascending: false })
    .limit(20);

  if (appliedAssignees) {
    for (const a of appliedAssignees as Array<{
      id: string; assignment_id: string; associate_id: string;
      status: string; invited_at: string;
    }>) {
      const { data: assignment } = await db
        .from('assignments')
        .select('id, title')
        .eq('id', a.assignment_id)
        .single();
      const { data: profile } = await db
        .from('associate_profiles')
        .select('full_name')
        .eq('associate_id', a.associate_id)
        .single();
      if (assignment && profile) {
        notifications.push({
          id: `applied-${a.id}`,
          type: 'applied',
          title: `${profile.full_name} mendaftar ke assignment`,
          message: `${profile.full_name} mendaftar sendiri ke assignment "${(assignment as { title: string }).title}"`,
          assignment_id: a.assignment_id,
          assignment_title: (assignment as { title: string }).title,
          associate_id: a.associate_id,
          associate_name: profile.full_name,
          status: a.status,
          created_at: a.invited_at,
        });
      }
    }
  }

  // Sort by created_at descending
  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return c.json({ success: true, data: notifications.slice(0, 50) });
});

admin.get('/notifications/count', async (c) => {
  const user = c.get('user') as { id: string };
  const db = getDb();

  const { count: appliedCount } = await db
    .from('assignment_assignees')
    .select('*', { count: 'exact', head: true })
    .eq('invited_by', user.id)
    .eq('status', 'applied');

  const { count: acceptedCount } = await db
    .from('assignment_assignees')
    .select('*', { count: 'exact', head: true })
    .eq('invited_by', user.id)
    .eq('status', 'accepted');

  const { count: declinedCount } = await db
    .from('assignment_assignees')
    .select('*', { count: 'exact', head: true })
    .eq('invited_by', user.id)
    .eq('status', 'declined');

  return c.json({
    success: true,
    data: {
      count: (appliedCount || 0) + (acceptedCount || 0) + (declinedCount || 0),
      applied: appliedCount || 0,
      accepted: acceptedCount || 0,
      declined: declinedCount || 0,
    },
  });
});

// ============================================
// ASSESSMENTS
// ============================================

admin.get('/assessments', async (c) => {
  const db = getDb();
  const { associate_id } = c.req.query();

  let query = db.from('associate_assessments').select('*').order('created_at', { ascending: false });
  if (associate_id) {
    query = query.eq('associate_id', associate_id);
  }

  const { data, error } = await query;
  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data: data || [] });
});

admin.post('/assessments', async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { associate_id, skill_name, assessment_type, score, max_score, status, assessor, feedback } = body;

  if (!associate_id || !skill_name || !assessment_type) {
    return c.json({ success: false, error: 'associate_id, skill_name, assessment_type wajib diisi' }, 400);
  }

  const { data, error } = await db
    .from('associate_assessments')
    .insert({
      associate_id,
      skill_name,
      assessment_type,
      score: score || 0,
      max_score: max_score || 100,
      status: status || 'pending',
      assessor: assessor || null,
      feedback: feedback || null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data }, 201);
});

admin.put('/assessments/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const body = await c.req.json();
  const { skill_name, assessment_type, score, max_score, status, assessor, feedback } = body;

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (skill_name !== undefined) updateData.skill_name = skill_name;
  if (assessment_type !== undefined) updateData.assessment_type = assessment_type;
  if (score !== undefined) updateData.score = score;
  if (max_score !== undefined) updateData.max_score = max_score;
  if (status !== undefined) {
    updateData.status = status;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
  }
  if (assessor !== undefined) updateData.assessor = assessor;
  if (feedback !== undefined) updateData.feedback = feedback;

  const { data, error } = await db
    .from('associate_assessments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data });
});

admin.delete('/assessments/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');

  const { error } = await db
    .from('associate_assessments')
    .delete()
    .eq('id', id);

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, message: 'Assessment berhasil dihapus' });
});

// ============================================
// DEVELOPMENT PLANS
// ============================================

admin.get('/development-plans', async (c) => {
  const db = getDb();
  const { associate_id } = c.req.query();

  let query = db.from('associate_development_plans').select('*').order('created_at', { ascending: false });
  if (associate_id) {
    query = query.eq('associate_id', associate_id);
  }

  const { data, error } = await query;
  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data: data || [] });
});

admin.post('/development-plans', async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { associate_id, current_score, target_score, recommended_actions, learning_paths } = body;

  if (!associate_id) {
    return c.json({ success: false, error: 'associate_id wajib diisi' }, 400);
  }

  const { data, error } = await db
    .from('associate_development_plans')
    .upsert({
      associate_id,
      current_score: current_score || 0,
      target_score: target_score || 80,
      recommended_actions: recommended_actions || [],
      learning_paths: learning_paths || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'associate_id' })
    .select()
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data }, 201);
});

admin.put('/development-plans/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const body = await c.req.json();
  const { current_score, target_score, recommended_actions, learning_paths } = body;

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (current_score !== undefined) updateData.current_score = current_score;
  if (target_score !== undefined) updateData.target_score = target_score;
  if (recommended_actions !== undefined) updateData.recommended_actions = recommended_actions;
  if (learning_paths !== undefined) updateData.learning_paths = learning_paths;

  const { data, error } = await db
    .from('associate_development_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, data });
});

admin.delete('/development-plans/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');

  const { error } = await db
    .from('associate_development_plans')
    .delete()
    .eq('id', id);

  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, message: 'Development plan berhasil dihapus' });
});

export default admin;
