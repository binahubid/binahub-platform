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
// PROFILE VALIDATORS (8-Domain)
// ============================================

export const ASSOCIATE_ROLES = [
  'Trainer',
  'Facilitator',
  'Consultant',
  'Coach',
  'Assessor',
  'Mentor',
  'Speaker',
  'Researcher',
  'Writer',
  'Game Master',
  'Other',
] as const;

export const ASSOCIATE_EXPERTISES = [
  'Leadership & Management',
  'Human Resources',
  'Organizational Development',
  'Digital Transformation',
  'Change Management',
  'Communication & Presentation',
  'Sales & Marketing',
  'Finance & Accounting',
  'Project Management',
  'ESG & Sustainability',
  'Customer Experience',
  'Innovation & Design Thinking',
  'Agile & Scrum',
  'Data & Analytics',
  'Entrepreneurship',
  'Soft Skills',
  'Compliance & Legal',
  'Operations & Supply Chain',
  'Health & Wellness',
  'Learning & Development',
] as const;

export const ASSOCIATE_INDUSTRIES = [
  'Banking & Finance',
  'Technology & IT',
  'Manufacturing',
  'Healthcare',
  'Education',
  'Government & Public Sector',
  'Retail & FMCG',
  'Oil & Gas',
  'Consulting',
  'Telco & Media',
  'Property & Construction',
  'Transportation & Logistics',
  'Non-Profit & NGO',
  'Other',
] as const;

export const PORTFOLIO_CATEGORIES = [
  'Case Study',
  'Presentation',
  'Workshop Module',
  'Research Paper',
  'Video',
  'Publication',
  'Proposal',
  'Training Material',
  'Other',
] as const;

export const WORK_LOCATIONS = ['Remote', 'Onsite', 'Hybrid'] as const;

export const ENGAGEMENT_TYPES = [
  'Training',
  'Consulting',
  'Assessment',
  'Coaching',
  'Facilitation',
  'Speaking',
  'Research',
  'Mentoring',
] as const;

export const updateProfileSchema = z.object({
  fullName: z.string().max(255).nullable().optional(),
  preferredName: z.string().max(100).nullable().optional(),
  headline: z.string().max(255).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  timezone: z.string().max(50).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  photoUrl: z.string().max(2048).nullable().optional(),
  dateOfBirth: z.string().max(50).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  roles: z.array(z.string().max(100)).nullable().optional(),
  expertises: z.array(z.string().max(100)).nullable().optional(),
});

export const updateFinancialDetailsSchema = z.object({
  npwp: z.string().trim().regex(/^[0-9.\- ]*$/, 'Format NPWP tidak valid').max(24).nullable().optional(),
  bankName: z.string().trim().max(100).nullable().optional(),
  bankAccountNumber: z.string().trim().regex(/^[0-9]*$/, 'Nomor rekening hanya boleh berisi angka').max(40).nullable().optional(),
  bankAccountHolder: z.string().trim().max(255).nullable().optional(),
});

// ============================================
// EXPERIENCE VALIDATORS
// ============================================

export const createExperienceSchema = z.object({
  organization: z.string().min(1, 'Nama organisasi wajib diisi').max(255),
  position: z.string().min(1, 'Posisi/Peran wajib diisi').max(255),
  industry: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  achievement: z.string().max(5000).optional(),
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
  organization: z.string().min(1).max(255).optional(),
  position: z.string().min(1).max(255).optional(),
  industry: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  achievement: z.string().max(5000).optional(),
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
  credentialUrl: z.string().max(2000).optional()
});

export const updateCertificationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  issuer: z.string().min(1).max(255).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(255).optional(),
  credentialUrl: z.string().max(2000).optional(),
  orderIndex: z.number().int().min(0).optional()
});

// ============================================
// PORTFOLIO VALIDATORS
// ============================================

export const createPortfolioSchema = z.object({
  title: z.string().min(1, 'Judul portofolio wajib diisi').max(255),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  clientName: z.string().max(255).optional(),
  projectUrl: z.string().url('URL tidak valid').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  skillsUsed: z.array(z.string().max(100)).optional()
});

export const updatePortfolioSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
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

function isValidCVDate(value: string): boolean {
  if (!/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  if (!monthText) return year >= 1900 && year <= 2100;
  const month = Number(monthText);
  if (month < 1 || month > 12) return false;
  if (!dayText) return true;
  const day = Number(dayText);
  return day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const cvDateSchema = z.string().refine(isValidCVDate, 'Format tanggal hasil CV tidak valid');

// Payload approved by the associate after reviewing an AI-generated CV draft.
// Limits prevent an untrusted model response or client request from replacing
// profile collections with unbounded/invalid data.
export const importCVSchema = z.object({
  profile: z.object({
    fullName: z.string().trim().min(1).max(255).nullable().optional(),
    preferredName: z.string().trim().max(100).nullable().optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    headline: z.string().trim().max(255).nullable().optional(),
    bio: z.string().trim().max(5000).nullable().optional(),
    nationality: z.string().trim().max(100).nullable().optional(),
    dateOfBirth: cvDateSchema.nullable().optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    linkedIn: z.string().trim().url('URL LinkedIn hasil CV tidak valid').max(2000).nullable().optional(),
    website: z.string().trim().url('URL website hasil CV tidak valid').max(2000).nullable().optional(),
    roles: z.array(z.string().trim().min(1).max(100)).max(20).optional().default([]),
    expertises: z.array(z.string().trim().min(1).max(100)).max(30).optional().default([]),
  }).strict().optional().default({}),
  experiences: z.array(z.object({
    organization: z.string().trim().min(1).max(255),
    position: z.string().trim().min(1).max(255),
    industry: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    achievement: z.string().trim().max(5000).nullable().optional(),
    startDate: cvDateSchema,
    endDate: cvDateSchema.nullable().optional(),
    isCurrent: z.boolean().optional().default(false),
  }).strict()).max(100).optional().default([]),
  educations: z.array(z.object({
    institution: z.string().trim().min(1).max(255),
    degree: z.string().trim().min(1).max(255),
    fieldOfStudy: z.string().trim().max(255).nullable().optional(),
    startYear: z.number().int().min(1900).max(2100).nullable().optional(),
    endYear: z.number().int().min(1900).max(2100).nullable().optional(),
  }).strict()).max(100).optional().default([]),
  skills: z.array(z.object({
    skillName: z.string().trim().min(1).max(100),
    category: skillCategorySchema.nullable().optional(),
    proficiency: skillProficiencySchema.nullable().optional(),
    yearsExperience: z.number().int().min(0).max(100).nullable().optional(),
  }).strict()).max(200).optional().default([]),
  languages: z.array(z.object({
    language: z.string().trim().min(1).max(100),
    proficiency: languageProficiencySchema.nullable().optional(),
  }).strict()).max(50).optional().default([]),
  certifications: z.array(z.object({
    name: z.string().trim().min(1).max(255),
    issuer: z.string().trim().max(255).nullable().optional(),
    issueDate: cvDateSchema.nullable().optional(),
    expiryDate: cvDateSchema.nullable().optional(),
    credentialId: z.string().trim().max(255).nullable().optional(),
    credentialUrl: z.string().trim().url('URL kredensial hasil CV tidak valid').max(2000).nullable().optional(),
  }).strict()).max(100).optional().default([]),
  portfolios: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
    clientName: z.string().trim().max(255).nullable().optional(),
    projectUrl: z.string().trim().url('URL proyek hasil CV tidak valid').max(2000).nullable().optional(),
    startDate: cvDateSchema.nullable().optional(),
    endDate: cvDateSchema.nullable().optional(),
    skillsUsed: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  }).strict()).max(100).optional().default([]),
}).strict();

export const deleteLanguageSchema = z.object({
  langId: z.string().uuid()
});

// ============================================
// AVAILABILITY VALIDATORS
// ============================================

export const availabilityStatusSchema = z.enum(['available', 'limited', 'unavailable', 'open', 'busy']);

export const updateAvailabilitySchema = z.object({
  status: availabilityStatusSchema.optional(),
  // camelCase (used by some internal callers)
  maxHoursPerWeek: z.number().int().min(0).max(168).optional(),
  workLocations: z.array(z.string().max(50)).optional(),
  travelReady: z.boolean().optional(),
  preferredEngagements: z.array(z.string().max(100)).optional(),
  availableFrom: z.string().optional(),
  // snake_case (used by profile/onboarding forms)
  max_hours_per_week: z.number().int().min(0).max(168).nullable().optional(),
  work_locations: z.array(z.string().max(50)).optional(),
  travel_ready: z.boolean().optional(),
  preferred_engagements: z.array(z.string().max(100)).optional(),
  available_from: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional()
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
