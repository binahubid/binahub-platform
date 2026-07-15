import { Context, Next } from 'hono';
import { getDb } from '../../../lib/database.js';
import type { AuthUser } from '../../../types';
import type { AppEnv } from '../../../types/env.js';

// ============================================
// AUTH MIDDLEWARE
// ============================================

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  let token = '';
  const authHeader = c.req.header('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  } else {
    const queryToken = c.req.query('token');
    if (queryToken) {
      token = queryToken;
    }
  }

  if (!token) {
    return c.json({ success: false, error: 'Token tidak ditemukan' }, 401);
  }
  
  try {
    const db = getDb();
    const { data: { user }, error } = await db.auth.getUser(token);
    
    if (error || !user) {
      return c.json({ success: false, error: 'Token tidak valid' }, 401);
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      role: (user.app_metadata?.role as AuthUser['role']) || 'associate'
    };

    c.set('user', authUser);
    c.set('token', token);
    
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ success: false, error: 'Autentikasi gagal' }, 401);
  }
}

// ============================================
// ROLE-BASED AUTH MIDDLEWARE
// ============================================

export function requireRole(roles: AuthUser['role'][]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Tidak terautentikasi' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
    }

    await next();
  };
}

// ============================================
// OPTIONAL AUTH MIDDLEWARE
// ============================================

export async function optionalAuthMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    await next();
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const db = getDb();
    const { data: { user }, error } = await db.auth.getUser(token);
    
    if (!error && user) {
      const authUser: AuthUser = {
        id: user.id,
        email: user.email || '',
        role: (user.app_metadata?.role as AuthUser['role']) || 'associate'
      };

      c.set('user', authUser);
      c.set('token', token);
    }
  } catch {
    // Ignore auth errors for optional auth
  }

  await next();
}
