import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../../lib/database.js';
import { generateSlug } from '@ams/shared/utils/slug';
import { createAssociateSchema } from '@ams/shared/validators/associate';
import type { AuthUser } from '../../types';
import type { AppEnv } from '../../types/env.js';

const auth = new Hono<AppEnv>();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

function getAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

auth.post('/register', async (c) => {
  const body = await c.req.json();

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
    return c.json({ success: false, error: authError.message }, 400);
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
  }

  return c.json({ success: true, message: 'Registrasi berhasil. Cek email untuk konfirmasi.' }, 201);
});

auth.post('/login', async (c) => {
  const body = await c.req.json();
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

auth.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token tidak ditemukan' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const anonClient = getAnonClient();
  await anonClient.auth.admin.signOut(token);

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
