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
  const path = `${ownerType}/${ownerId}/${category}/${timestamp}-${randomId}-${fileName}`;
  const bucket = 'ams-files';

  try {
    // Create presigned URL using Supabase Storage
    const { data, error } = await getDb().storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
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
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
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
  if (data.owner_id !== user.id && data.uploaded_by !== user.id && user.role !== 'admin') {
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
  if (file.owner_id !== user.id && file.uploaded_by !== user.id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  try {
    const { data, error } = await db.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 3600); // 1 hour expiry

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
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
  if (file.owner_id !== user.id && file.uploaded_by !== user.id && user.role !== 'admin') {
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

// Upload CV (get presigned URL + register)
fileRoutes.post('/associate/:id/cv', authMiddleware, async (c) => {
  const associateId = c.req.param('id');
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  
  // Check if user owns this associate profile
  if (user.id !== associateId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Tidak memiliki akses' }, 403);
  }

  const { fileName, fileType, fileSize } = body;

  // Validate CV file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(fileType)) {
    return c.json({
      success: false,
      error: 'Tipe file harus PDF atau Word'
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
  const path = `associate/${associateId}/cv/${timestamp}-${randomId}-${fileName}`;
  const bucket = 'ams-files';

  try {
    const db = getDb();
    
    // Soft-delete old CVs before registering the new one
    await db
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('owner_id', associateId)
      .eq('owner_type', 'associate')
      .eq('category', 'cv')
      .is('deleted_at', null);

    await db
      .from('associate_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('associate_id', associateId)
      .eq('type', 'cv')
      .is('deleted_at', null);

    // Create presigned URL
    const { data: presignedData, error: presignedError } = await db.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (presignedError) {
      return c.json({ success: false, error: presignedError.message }, 500);
    }

    // Register file in database
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
      return c.json({ success: false, error: fileError.message }, 500);
    }

    // Register CV file in associate_documents to display in UI
    const { error: docError } = await db
      .from('associate_documents')
      .insert({
        id: fileData.id,
        associate_id: associateId,
        type: 'cv',
        name: fileName,
        url: path
      });

    if (docError) {
      console.error('Failed to register associate document:', docError);
    }

    // Enqueue CVUploaded event
    await db.rpc('enqueue_transformation_event', {
      p_type: 'CVUploaded',
      p_aggregate_type: 'file',
      p_aggregate_id: fileData.id,
      p_payload: { associate_id: associateId, file_id: fileData.id, file_name: fileName }
    });

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
