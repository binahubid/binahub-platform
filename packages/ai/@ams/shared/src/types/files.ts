// ============================================
// FILE TYPES
// ============================================

export type FileCategory = 'cv' | 'certificate' | 'portfolio' | 'proposal' | 'avatar' | 'other';
export type FileProvider = 'supabase' | 's3' | 'gcs';
export type FileVisibility = 'public' | 'private' | 'contacts_only';
export type OwnerType = 'associate' | 'organization' | 'engagement';

export interface File {
  id: string;
  ownerId: string;
  ownerType: OwnerType;
  category: FileCategory;
  provider: FileProvider;
  bucket: string;
  path: string;
  originalName: string;
  mime: string;
  size: number;
  visibility: FileVisibility;
  metadata: Record<string, unknown>;
  uploadedBy: string | null;
  createdAt: string;
  deletedAt: string | null;
}

// ============================================
// FILE UPLOAD TYPES
// ============================================

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  ownerType: OwnerType;
  category: FileCategory;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  path: string;
  bucket: string;
  fileId: string;
}

export interface FileRegistrationRequest {
  ownerId: string;
  ownerType: OwnerType;
  category: FileCategory;
  path: string;
  originalName: string;
  mime: string;
  size: number;
  visibility?: FileVisibility;
  metadata?: Record<string, unknown>;
}

// ============================================
// FILE FILTER TYPES
// ============================================

export interface FileFilter {
  ownerId?: string;
  ownerType?: OwnerType;
  category?: FileCategory;
  visibility?: FileVisibility;
}
