import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../../lib/database.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { generateSlug } from '@ams/shared/utils/slug';
import { createAssociateSchema } from '@ams/shared/validators/associate';
import { authMiddleware } from './middleware/auth.js';
import type { AppEnv } from '../../types/env.js';

const auth = new Hono<AppEnv>();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

function getAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

auth.post('/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: 'Format permintaan tidak valid' }, 400);
  }

  const validation = createAssociateSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ success: false, error: validation.error.issues[0]?.message || 'Data tidak valid' }, 400);
  }

  const { email, fullName, headline } = validation.data;
  const password = body.password;
  if (!password || password.length < 8) {
    return c.json({ success: false, error: 'Password minimal 8 karakter' }, 400);
  }

  const anonClient = getAnonClient();
  const { data: authData, error: authError } = await anonClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (authError) {
    console.warn('Register rejected by auth provider:', authError.code || authError.name);
    return c.json({ success: false, error: 'Registrasi gagal. Periksa data atau gunakan email lain.' }, 400);
  }

  if (!authData.user) {
    return c.json({ success: false, error: 'Registrasi gagal' }, 400);
  }

  if (authData.user.app_metadata?.role === 'admin') {
    return c.json({ success: true, message: 'Akun admin sudah terdaftar.' }, 200);
  }

  const db = getDb();
  const slug = generateSlug(fullName);

  const { error: associateError } = await db
    .from('associates')
    .insert({
      id: authData.user.id,
      email,
      slug,
      status: 'draft',
    });

  if (associateError) {
    console.error('Create associate error:', associateError);
    // Rollback auth user
    try {
      await db.auth.admin.deleteUser(authData.user.id);
    } catch (rollbackErr) {
      console.error('Rollback user failed:', rollbackErr);
    }
    return c.json({ success: false, error: 'Gagal membuat data associate' }, 500);
  }

  const { error: profileError } = await db
    .from('associate_profiles')
    .insert({
      associate_id: authData.user.id,
      full_name: fullName,
      headline: headline || null,
    });

  if (profileError) {
    console.error('Create profile error:', profileError);
    // Rollback associate table & auth user
    try {
      await db.from('associates').delete().eq('id', authData.user.id);
      await db.auth.admin.deleteUser(authData.user.id);
    } catch (rollbackErr) {
      console.error('Rollback user/table failed:', rollbackErr);
    }
    return c.json({ success: false, error: 'Gagal membuat profil' }, 500);
  }

  const { error: eventError } = await db.rpc('enqueue_transformation_event', {
    p_type: 'AssociateCreated',
    p_aggregate_type: 'associate',
    p_aggregate_id: authData.user.id,
    p_payload: { associate_id: authData.user.id },
  });
  if (eventError) console.error('Failed to enqueue APP identity sync:', eventError);

  const { error: reminderError } = await db.from('event_queue').insert({
    type: 'ProfileIncompleteReminder',
    aggregate_type: 'associate',
    aggregate_id: authData.user.id,
    payload: { associate_id: authData.user.id },
    status: 'pending',
    attempts: 0,
    max_attempts: 3,
    available_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  });
  if (reminderError) console.error('Failed to schedule profile reminder:', reminderError);

  return c.json({ success: true, message: 'Registrasi berhasil. Cek email untuk konfirmasi.' }, 201);
});

auth.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: 'Format permintaan tidak valid' }, 400);
  }
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: 'Email dan password wajib diisi' }, 400);
  }

  const anonClient = getAnonClient();
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

  if (error) {
    return c.json({ success: false, error: 'Email atau password salah' }, 401);
  }

  return c.json({
    success: true,
    data: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
      user: { id: data.user?.id, email: data.user?.email },
    },
  });
});

auth.post('/logout', authMiddleware, async (c) => {
  const token = c.get('token');
  const db = getDb();
  const { error } = await db.auth.admin.signOut(token, 'global');
  if (error) {
    console.error('Logout error:', error);
    return c.json({ success: false, error: 'Logout gagal' }, 500);
  }

  return c.json({ success: true, message: 'Logout berhasil' });
});

auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token tidak ditemukan' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const db = getDb();

  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) {
    return c.json({ success: false, error: 'Token tidak valid' }, 401);
  }

  const { data: associate } = await db
    .from('associates')
    .select(`
      *,
      profile:associate_profiles(*)
    `)
    .eq('id', user.id)
    .single();

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email },
      associate: associate || null,
    },
  });
});

export default auth;
