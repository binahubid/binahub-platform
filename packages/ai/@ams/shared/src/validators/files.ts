import { z } from 'zod';

// ============================================
// FILE VALIDATORS
// ============================================

export const fileCategorySchema = z.enum(['cv', 'certificate', 'portfolio', 'proposal', 'avatar', 'other']);
export const fileProviderSchema = z.enum(['supabase', 's3', 'gcs']);
export const fileVisibilitySchema = z.enum(['public', 'private', 'contacts_only']);
export const ownerTypeSchema = z.enum(['associate', 'organization', 'engagement']);

// ============================================
// PRESIGNED URL VALIDATORS
// ============================================

export const presignedUrlRequestSchema = z.object({
  fileName: z.string().min(1, 'Nama file wajib diisi').max(255),
  fileType: z.string().min(1, 'Tipe file wajib diisi'),
  fileSize: z.number().int().min(1, 'Ukuran file tidak valid').max(50 * 1024 * 1024), // 50MB max
  ownerId: z.string().uuid(),
  ownerType: ownerTypeSchema,
  category: fileCategorySchema
});

// ============================================
// FILE REGISTRATION VALIDATORS
// ============================================

export const fileRegistrationSchema = z.object({
  ownerId: z.string().uuid(),
  ownerType: ownerTypeSchema,
  category: fileCategorySchema,
  path: z.string().min(1),
  originalName: z.string().min(1).max(255),
  mime: z.string().min(1),
  size: z.number().int().min(1),
  visibility: fileVisibilitySchema.optional().default('private'),
  metadata: z.record(z.unknown()).optional()
});

// ============================================
// FILE FILTER VALIDATORS
// ============================================

export const fileFilterSchema = z.object({
  ownerId: z.string().uuid().optional(),
  ownerType: ownerTypeSchema.optional(),
  category: fileCategorySchema.optional(),
  visibility: fileVisibilitySchema.optional()
});

// ============================================
// ALLOWED MIME TYPES
// ============================================

export const allowedMimeTypes: Record<string, string[]> = {
  cv: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  certificate: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  portfolio: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4'
  ],
  proposal: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  avatar: [
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  other: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// ============================================
// FILE SIZE LIMITS (in bytes)
// ============================================

export const fileSizeLimits: Record<string, number> = {
  cv: 10 * 1024 * 1024,           // 10MB
  certificate: 5 * 1024 * 1024,   // 5MB
  portfolio: 50 * 1024 * 1024,    // 50MB
  proposal: 20 * 1024 * 1024,     // 20MB
  avatar: 5 * 1024 * 1024,        // 5MB
  other: 20 * 1024 * 1024         // 20MB
};

// ============================================
// VALIDATION HELPERS
// ============================================

export function isFileTypeAllowed(category: string, mime: string): boolean {
  const allowed = allowedMimeTypes[category];
  if (!allowed) return false;
  return allowed.includes(mime);
}

export function isFileSizeAllowed(category: string, size: number): boolean {
  const limit = fileSizeLimits[category];
  if (!limit) return false;
  return size <= limit;
}
