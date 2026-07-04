import { z } from 'zod';

// ============================================
// ASSOCIATE VALIDATORS
// ============================================

export const associateStatusSchema = z.enum([
  'draft',
  'pending_review',
  'active',
  'inactive',
  'suspended'
]);

export const createAssociateSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(255),
  headline: z.string().max(255).optional()
});

export const updateAssociateStatusSchema = z.object({
  status: associateStatusSchema,
  reason: z.string().optional()
});

// ============================================
// PROFILE VALIDATORS
// ============================================

export const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(255).optional(),
  headline: z.string().max(255).optional(),
  bio: z.string().max(5000).optional(),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().optional(),
  gender: genderSchema.optional(),
  nationality: z.string().max(100).optional()
});

// ============================================
// EXPERIENCE VALIDATORS
// ============================================

export const createExperienceSchema = z.object({
  company: z.string().min(1, 'Nama perusahaan wajib diisi').max(255),
  position: z.string().min(1, 'Posisi wajib diisi').max(255),
  description: z.string().max(5000).optional(),
  startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false)
}).refine(
  (data) => {
    if (!data.isCurrent && !data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Tanggal akhir wajib diisi jika bukan posisi saat ini',
    path: ['endDate']
  }
);

export const updateExperienceSchema = z.object({
  company: z.string().min(1).max(255).optional(),
  position: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional()
});

// ============================================
// EDUCATION VALIDATORS
// ============================================

export const createEducationSchema = z.object({
  institution: z.string().min(1, 'Nama institusi wajib diisi').max(255),
  degree: z.string().min(1, 'Gelar wajib diisi').max(255),
  fieldOfStudy: z.string().max(255).optional(),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).optional(),
  gpa: z.number().min(0).max(4).optional()
}).refine(
  (data) => {
    if (data.endYear && data.startYear && data.endYear < data.startYear) {
      return false;
    }
    return true;
  },
  {
    message: 'Tahun akhir harus lebih besar dari tahun mulai',
    path: ['endYear']
  }
);

export const updateEducationSchema = z.object({
  institution: z.string().min(1).max(255).optional(),
  degree: z.string().min(1).max(255).optional(),
  fieldOfStudy: z.string().max(255).optional(),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).optional(),
  gpa: z.number().min(0).max(4).optional(),
  orderIndex: z.number().int().min(0).optional()
});

// ============================================
// CERTIFICATION VALIDATORS
// ============================================

export const createCertificationSchema = z.object({
  name: z.string().min(1, 'Nama sertifikat wajib diisi').max(255),
  issuer: z.string().min(1, 'Penerbit wajib diisi').max(255),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(255).optional(),
  credentialUrl: z.string().url('URL tidak valid').optional()
});

export const updateCertificationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  issuer: z.string().min(1).max(255).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(255).optional(),
  credentialUrl: z.string().url('URL tidak valid').optional(),
  orderIndex: z.number().int().min(0).optional()
});

// ============================================
// PORTFOLIO VALIDATORS
// ============================================

export const createPortfolioSchema = z.object({
  title: z.string().min(1, 'Judul portofolio wajib diisi').max(255),
  description: z.string().max(5000).optional(),
  clientName: z.string().max(255).optional(),
  projectUrl: z.string().url('URL tidak valid').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  skillsUsed: z.array(z.string().max(100)).optional()
});

export const updatePortfolioSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  clientName: z.string().max(255).optional(),
  projectUrl: z.string().url('URL tidak valid').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  skillsUsed: z.array(z.string().max(100)).optional(),
  orderIndex: z.number().int().min(0).optional()
});

// ============================================
// SKILL VALIDATORS
// ============================================

export const skillCategorySchema = z.enum(['technical', 'soft_skill', 'industry', 'other']);
export const skillProficiencySchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

export const createSkillSchema = z.object({
  skillName: z.string().min(1, 'Nama skill wajib diisi').max(100),
  category: skillCategorySchema.optional(),
  proficiency: skillProficiencySchema.optional(),
  yearsExperience: z.number().int().min(0).max(100).optional()
});

export const deleteSkillSchema = z.object({
  skillId: z.string().uuid()
});

// ============================================
// LANGUAGE VALIDATORS
// ============================================

export const languageProficiencySchema = z.enum(['basic', 'conversational', 'fluent', 'native']);

export const createLanguageSchema = z.object({
  language: z.string().min(1, 'Nama bahasa wajib diisi').max(100),
  proficiency: languageProficiencySchema
});

export const deleteLanguageSchema = z.object({
  langId: z.string().uuid()
});

// ============================================
// AVAILABILITY VALIDATORS
// ============================================

export const availabilityStatusSchema = z.enum(['available', 'limited', 'unavailable']);
export const travelWillingnessSchema = z.enum(['no', 'limited', 'flexible']);
export const workTypeSchema = z.enum(['onsite', 'remote', 'hybrid']);

export const updateAvailabilitySchema = z.object({
  status: availabilityStatusSchema.optional(),
  maxHoursPerWeek: z.number().int().min(0).max(168).optional(),
  preferredWorkType: z.array(workTypeSchema).optional(),
  travelWillingness: travelWillingnessSchema.optional(),
  availableFrom: z.string().optional(),
  notes: z.string().max(1000).optional()
});

// ============================================
// SOCIAL LINK VALIDATORS
// ============================================

export const socialPlatformSchema = z.enum(['linkedin', 'twitter', 'github', 'website', 'other']);

export const createSocialLinkSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string().url('URL tidak valid'),
  isPrimary: z.boolean().optional().default(false)
});

export const updateSocialLinkSchema = z.object({
  url: z.string().url('URL tidak valid').optional(),
  isPrimary: z.boolean().optional()
});

// ============================================
// EMERGENCY CONTACT VALIDATORS
// ============================================

export const updateEmergencyContactSchema = z.object({
  name: z.string().min(1, 'Nama kontak wajib diisi').max(255),
  relationship: z.string().min(1, 'Hubungan wajib diisi').max(100),
  phone: z.string().min(1, 'Nomor telepon wajib diisi').max(20),
  email: z.string().email('Format email tidak valid').optional(),
  isPrimary: z.boolean().optional().default(true)
});

// ============================================
// PREFERENCE VALIDATORS
// ============================================

export const localeSchema = z.enum(['id', 'en']);
export const profileVisibilitySchema = z.enum(['public', 'private', 'contacts_only']);

export const updatePreferencesSchema = z.object({
  locale: localeSchema.optional(),
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  profileVisibility: profileVisibilitySchema.optional()
});

// ============================================
// SLUG VALIDATORS
// ============================================

export const slugSchema = z.string()
  .min(3, 'Slug minimal 3 karakter')
  .max(100, 'Slug maksimal 100 karakter')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubur');
