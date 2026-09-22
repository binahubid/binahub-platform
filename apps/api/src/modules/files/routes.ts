import { Hono } from 'hono';
import { authMiddleware } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import {
  presignedUrlRequestSchema,
  fileRegistrationSchema,
  isFileTypeAllowed,
  isFileSizeAllowed
} from '@ams/shared/validators/files';
import type { AuthUser } from '../../types';
import type { AppEnv } from '../../types/env.js';

export const fileRoutes = new Hono<AppEnv>();

function safeFileName(fileName: string): string {
  const sanitized = fileName
    .normalize('NFKC')
    .replace(/[\\/\u0000-\u001F\u007F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || 'file';
}

function expectedPathPrefix(ownerType: string, ownerId: string, category: string): string {
  return `${ownerType}/${ownerId}/${category}/`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function canReadRegisteredFile(
  user: AuthUser,
  file: { owner_id: string; uploaded_by: string; owner_type?: string | null },
): Promise<boolean> {
  if (file.owner_id === user.id || file.uploaded_by === user.id || user.role === 'admin') return true;
  if (user.role !== 'reviewer' || file.owner_type !== 'associate') return false;

  const { data } = await getDb()
    .from('associates')
    .select('id')
    .eq('id', file.owner_id)
    .eq('status', 'pending_review')
    .maybeSingle();
  return Boolean(data);
}

// ============================================
// PRESIGNED URL ENDPOINT
// ============================================

fileRoutes.post('/presigned-url', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = presignedUrlRequestSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  const { fileName, fileType, fileSize, ownerId, ownerType, category } = validation.data;

  if (ownerId !== user.id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses untuk pemilik berkas ini' }, 403);
  }

  // Validate file type
  if (!isFileTypeAllowed(category, fileType)) {
    return c.json({
      success: false,
      error: `Tipe file ${fileType} tidak diizinkan untuk kategori ${category}`
    }, 400);
  }

  // Validate file size
  if (!isFileSizeAllowed(category, fileSize)) {
    return c.json({
      success: false,
      error: `Ukuran file terlalu besar untuk kategori ${category}`
    }, 400);
  }

  // Generate unique path
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const path = `${ownerType}/${ownerId}/${category}/${timestamp}-${randomId}-${safeFileName(fileName)}`;
  const bucket = 'ams-files';

  try {
    // Create presigned URL using Supabase Storage
    const { data, error } = await getDb().storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (error) {
      console.error('Create signed upload URL failed:', error);
      return c.json({ success: false, error: 'Gagal menyiapkan unggahan' }, 500);
    }

    return c.json({
      success: true,
      data: {
        presignedUrl: data.signedUrl,
        path,
        bucket
      }
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return c.json({ success: false, error: 'Gagal membuat presigned URL' }, 500);
  }
});

// ============================================
// REGISTER FILE (after upload)
// ============================================

fileRoutes.post('/', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  const validation = fileRegistrationSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      success: false,
      error: validation.error.issues[0]?.message || 'Data tidak valid'
    }, 400);
  }

  // Prevent registration IDOR: Verify caller owns the registration or is admin
  if (validation.data.ownerId !== user.id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses untuk mendaftarkan berkas ke pemilik ini' }, 403);
  }

  const expectedPrefix = expectedPathPrefix(
    validation.data.ownerType,
    validation.data.ownerId,
    validation.data.category,
  );
  if (!validation.data.path.startsWith(expectedPrefix)) {
    return c.json({ success: false, error: 'Path berkas tidak sesuai pemilik dan kategori' }, 400);
  }

  if (!isFileTypeAllowed(validation.data.category, validation.data.mime)) {
    return c.json({ success: false, error: 'Tipe berkas tidak diizinkan' }, 400);
  }

  if (!isFileSizeAllowed(validation.data.category, validation.data.size)) {
    return c.json({ success: false, error: 'Ukuran berkas terlalu besar' }, 400);
  }

  const db = getDb();
  const { data, error } = await db
    .from('files')
    .insert({
      owner_id: validation.data.ownerId,
      owner_type: validation.data.ownerType,
      category: validation.data.category,
      provider: 'supabase',
      bucket: 'ams-files',
      path: validation.data.path,
      original_name: validation.data.originalName,
      mime: validation.data.mime,
      size: validation.data.size,
      visibility: validation.data.visibility || 'private',
      metadata: validation.data.metadata,
      uploaded_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Register file failed:', error);
    return c.json({ success: false, error: 'Gagal mendaftarkan berkas' }, 500);
  }

  return c.json({ success: true, data }, 201);
});

// ============================================
// VIEW FILE BY STORAGE PATH (Public or Auth check)
// ============================================

fileRoutes.get('/view-path', async (c) => {
  let path = c.req.query('path');
  if (!path) {
    return c.text('Path tidak valid', 400);
  }
  
  // Robustness fix: remove leading slash if present to align with database registry path column format
  if (path.startsWith('/')) {
    path = path.substring(1);
  }

  const db = getDb();
  try {
    // 1. Fetch file record to check its visibility
    const { data: file, error: fileError } = await db
      .from('files')
      .select('*')
      .eq('path', path)
      .is('deleted_at', null)
      .maybeSingle();

    if (fileError) {
      return c.text('Gagal memverifikasi akses berkas', 500);
    }

    // Default to private if file metadata is not found (for safety)
    const legacyPublicAvatar = !file && /^associate\/[0-9a-f-]{36}\/avatar\//i.test(path);
    const requiresAuth = !legacyPublicAvatar && (!file || file.visibility !== 'public');

    if (requiresAuth) {
      let token = '';
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice('Bearer '.length).trim();
      }

      if (!token) {
        return c.text('Autentikasi diperlukan untuk melihat dokumen ini', 401);
      }

      const { data: { user }, error: authError } = await db.auth.getUser(token);
      if (authError || !user) {
        return c.text('Token tidak valid', 401);
      }

      const userRole = (user.app_metadata?.role) || 'associate';

      if (file) {
        // Enforce ownership checks
        if (!await canReadRegisteredFile({ id: user.id, email: user.email || '', role: userRole } as AuthUser, file)) {
          return c.text('Tidak memiliki akses ke berkas ini', 403);
        }
      } else {
        // If file not registered, default to admin-only
        if (userRole !== 'admin') {
          return c.text('Tidak memiliki akses ke berkas ini', 403);
        }
      }
    }

    // 2. Generate signed URL for public file or verified private file
    const { data, error } = await db.storage
      .from('ams-files')
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      return c.text('Gagal membuat URL akses file', 500);
    }

    return c.redirect(data.signedUrl);
  } catch (error) {
    console.error('File view path redirect error:', error);
    return c.text('Gagal membuka file', 500);
  }
});

// Resolve a private storage path to a short-lived signed URL without exposing
// the user's Supabase access token in a query string or browser history.
fileRoutes.post('/signed-url', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json().catch(() => null);
  const path = typeof body?.path === 'string' ? body.path : '';

  if (!path || path.length > 1024 || path.startsWith('/') || path.includes('..') || path.includes('\\')) {
    return c.json({ success: false, error: 'Path berkas tidak valid' }, 400);
  }

  const db = getDb();
  const { data: file, error: lookupError } = await db
    .from('files')
    .select('owner_id, uploaded_by, owner_type, bucket, path')
    .eq('path', path)
    .is('deleted_at', null)
    .maybeSingle();

  if (lookupError) {
    console.error('Signed URL lookup failed:', lookupError);
    return c.json({ success: false, error: 'Gagal memverifikasi berkas' }, 500);
  }

  if (!file) {
    return c.json({ success: false, error: 'Berkas tidak ditemukan' }, 404);
  }

  if (!await canReadRegisteredFile(user, file)) {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  const { data, error } = await db.storage
    .from(file.bucket || 'ams-files')
    .createSignedUrl(file.path, 300);

  if (error || !data?.signedUrl) {
    console.error('Create signed file URL failed:', error);
    return c.json({ success: false, error: 'Gagal membuat URL akses berkas' }, 500);
  }

  c.header('Cache-Control', 'no-store');
  return c.json({ success: true, data: { signedUrl: data.signedUrl, expiresIn: 300 } });
});

// ============================================
// GET FILE
// ============================================

fileRoutes.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { data, error } = await db
    .from('files')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: 'File tidak ditemukan' }, 404);
  }

  // Ownership check
  if (!await canReadRegisteredFile(user, data)) {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  return c.json({ success: true, data });
});

// ============================================
// GET SIGNED URL FOR DOWNLOAD
// ============================================

fileRoutes.get('/:id/download', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { data: file, error: fileError } = await db
    .from('files')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (fileError || !file) {
    return c.json({ success: false, error: 'File tidak ditemukan' }, 404);
  }

  // Ownership check
  if (!await canReadRegisteredFile(user, file)) {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  try {
    const { data, error } = await db.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 3600); // 1 hour expiry

    if (error) {
      console.error('Create download URL failed:', error);
      return c.json({ success: false, error: 'Gagal membuat URL unduhan' }, 500);
    }

    return c.json({ success: true, data: { signedUrl: data.signedUrl } });
  } catch (error) {
    console.error('Signed URL error:', error);
    return c.json({ success: false, error: 'Gagal membuat signed URL' }, 500);
  }
});

// ============================================
// VIEW FILE (Redirects directly to signed storage URL)
// ============================================

fileRoutes.get('/:id/view', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { data: file, error: fileError } = await db
    .from('files')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (fileError || !file) {
    return c.text('File tidak ditemukan', 404);
  }

  // Ownership check
  if (!await canReadRegisteredFile(user, file)) {
    return c.text('Tidak memiliki akses', 403);
  }

  try {
    const { data, error } = await db.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 300); // 5 minutes expiry

    if (error || !data?.signedUrl) {
      return c.text('Gagal membuat URL akses file', 500);
    }

    return c.redirect(data.signedUrl);
  } catch (error) {
    console.error('File view redirect error:', error);
    return c.text('Gagal membuka file', 500);
  }
});

// ============================================
// DELETE FILE (soft delete)
// ============================================

fileRoutes.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = getDb();
  
  const { data: file, error: fileError } = await db
    .from('files')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (fileError || !file) {
    return c.json({ success: false, error: 'File tidak ditemukan' }, 404);
  }

  // Ownership check
  if (file.owner_id !== user.id && file.uploaded_by !== user.id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  // Physically remove the file from Supabase Storage bucket first
  if (file.bucket && file.path) {
    const { error: storageError } = await db.storage
      .from(file.bucket)
      .remove([file.path]);
    if (storageError) {
      console.error('Failed to delete file from Supabase storage:', storageError);
    }
  }

  // Hard delete in files table to ensure it is completely gone
  const { error } = await db
    .from('files')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Hard delete in associate_documents to ensure it is completely deleted from the database
  await db
    .from('associate_documents')
    .delete()
    .eq('id', id);

  return c.json({ success: true, message: 'File berhasil dihapus secara permanen' });
});

// ============================================
// LIST FILES BY OWNER
// ============================================

fileRoutes.get('/', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const { owner_id, owner_type, category } = c.req.query();
  const db = getDb();
  
  let query = db
    .from('files')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Prevent non-admin from reading files belonging to other users
  if (user.role === 'admin' && owner_id) {
    query = query.eq('owner_id', owner_id);
  } else {
    query = query.eq('owner_id', user.id);
  }

  if (owner_type) {
    query = query.eq('owner_type', owner_type);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// ============================================
// CV-SPECIFIC ENDPOINTS
// ============================================

// Upload CV (get presigned URL + register pending file)
fileRoutes.post('/associate/:id/cv', authMiddleware, async (c) => {
  const associateId = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const body = await c.req.json().catch(() => null);
  
  // Check if user owns this associate profile
  if (user.id !== associateId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
  const fileType = typeof body?.fileType === 'string' ? body.fileType : '';
  const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : 0;

  if (!fileName || fileName.length > 255 || fileSize < 1) {
    return c.json({ success: false, error: 'Data berkas CV tidak valid' }, 400);
  }

  // Validate CV file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(fileType)) {
    return c.json({
      success: false,
      error: 'Tipe file harus PDF atau DOCX. Format Word lama (.doc) belum didukung.'
    }, 400);
  }

  // Validate file size (10MB max for CV)
  if (fileSize > 10 * 1024 * 1024) {
    return c.json({
      success: false,
      error: 'Ukuran file CV maksimal 10MB'
    }, 400);
  }

  // Generate unique path
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const path = `associate/${associateId}/cv/${timestamp}-${randomId}-${safeFileName(fileName)}`;
  const bucket = 'ams-files';

  try {
    const db = getDb();

    // Create presigned URL
    const { data: presignedData, error: presignedError } = await db.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (presignedError) {
      console.error('Create CV upload URL failed:', presignedError);
      return c.json({ success: false, error: 'Gagal menyiapkan unggahan CV' }, 500);
    }

    // Register pending file in database
    const { data: fileData, error: fileError } = await db
      .from('files')
      .insert({
        owner_id: associateId,
        owner_type: 'associate',
        category: 'cv',
        provider: 'supabase',
        bucket,
        path,
        original_name: fileName,
        mime: fileType,
        size: fileSize,
        visibility: 'private',
        uploaded_by: user.id
      })
      .select()
      .single();

    if (fileError) {
      console.error('Register CV upload failed:', fileError);
      return c.json({ success: false, error: 'Gagal mendaftarkan CV' }, 500);
    }

    return c.json({
      success: true,
      data: {
        presignedUrl: presignedData.signedUrl,
        fileId: fileData.id,
        path,
        bucket
      }
    });
  } catch (error) {
    console.error('CV upload error:', error);
    return c.json({ success: false, error: 'Gagal mengunggah CV' }, 500);
  }
});

// Confirm CV Upload (soft-delete old ones, register to documents, and trigger parsing)
fileRoutes.post('/associate/:id/cv/confirm', authMiddleware, async (c) => {
  const associateId = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const body = await c.req.json().catch(() => null);
  const fileId = typeof body?.fileId === 'string' ? body.fileId : '';

  if (!isUuid(fileId)) {
    return c.json({ success: false, error: 'fileId tidak valid' }, 400);
  }

  // Check if user owns this associate profile
  if (user.id !== associateId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  const db = getDb();
  try {
    // 1. Verify that the file exists and is registered to this associate
    const { data: file, error: fileError } = await db
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('owner_id', associateId)
      .eq('owner_type', 'associate')
      .eq('category', 'cv')
      .is('deleted_at', null)
      .single();

    if (fileError || !file) {
      return c.json({ success: false, error: 'Berkas CV tidak ditemukan atau tidak valid' }, 404);
    }

    // A database row is created before the browser uploads the binary. Confirm
    // the object really exists before replacing the associate's previous CV.
    const pathParts = String(file.path).split('/');
    const objectName = pathParts.pop();
    const folder = pathParts.join('/');
    if (!objectName || !folder) {
      return c.json({ success: false, error: 'Lokasi berkas CV tidak valid' }, 409);
    }

    const { data: storedObjects, error: storageError } = await db.storage
      .from(file.bucket || 'ams-files')
      .list(folder, { limit: 10, search: objectName });
    if (storageError || !storedObjects?.some((object) => object.name === objectName)) {
      console.error('Confirm CV storage verification failed:', storageError);
      return c.json({ success: false, error: 'Unggahan CV belum tersedia di storage' }, 409);
    }

    // Register the replacement first. A retry is safe and the previous CV is
    // not removed until this row exists successfully.
    const { error: docError } = await db
      .from('associate_documents')
      .upsert({
        id: file.id,
        associate_id: associateId,
        type: 'cv',
        name: file.original_name,
        url: file.path
      }, { onConflict: 'id' });

    if (docError) {
      console.error('Register associate CV document failed:', docError);
      return c.json({ success: false, error: 'Gagal mendaftarkan dokumen CV' }, 500);
    }

    const { error: oldDocumentError } = await db
      .from('associate_documents')
      .delete()
      .eq('associate_id', associateId)
      .eq('type', 'cv')
      .neq('id', fileId);
    if (oldDocumentError) {
      console.error('Remove previous associate CV documents failed:', oldDocumentError);
      return c.json({ success: false, error: 'Gagal mengganti dokumen CV sebelumnya' }, 500);
    }

    const { error: oldFileError } = await db
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('owner_id', associateId)
      .eq('owner_type', 'associate')
      .eq('category', 'cv')
      .neq('id', fileId)
      .is('deleted_at', null);
    if (oldFileError) {
      console.error('Soft-delete previous CV files failed:', oldFileError);
      return c.json({ success: false, error: 'Gagal menonaktifkan CV sebelumnya' }, 500);
    }

    // Parsing is initiated explicitly by the authenticated UI after confirm.
    // Do not also enqueue a background parse here: both paths could otherwise
    // reach the AI provider before either one has persisted its cached result.
    return c.json({ success: true, data: { fileId: file.id } });
  } catch (error) {
    console.error('CV confirm error:', error);
    return c.json({ success: false, error: 'Gagal mengonfirmasi unggahan CV' }, 500);
  }
});

// Get current CV
fileRoutes.get('/associate/:id/cv', authMiddleware, async (c) => {
  const associateId = c.req.param('id');
  const user = c.get('user') as AuthUser;
  
  // Check if user owns this associate profile
  if (user.id !== associateId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  const db = getDb();
  
  const { data, error } = await db
    .from('files')
    .select('*')
    .eq('owner_id', associateId)
    .eq('owner_type', 'associate')
    .eq('category', 'cv')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: data || null });
});
