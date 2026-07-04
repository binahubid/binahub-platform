import { z } from "zod";

export const AssociateStatusEnum = z.enum([
  "draft", "pending_review", "active", "inactive", "suspended",
]);

export const AssociateCategoryEnum = z.enum([
  "assessor", "facilitator", "trainer", "coach",
  "project_manager", "consultant", "speaker",
]);

export const DocumentTypeEnum = z.enum([
  "cv", "certificate", "portfolio", "other",
]);

export const GenderEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);

export const LanguageProficiencyEnum = z.enum([
  "basic", "conversational", "fluent", "native",
]);

export const SkillCategoryEnum = z.enum(["technical", "soft_skill", "industry", "other"]);

export const SkillProficiencyEnum = z.enum(["beginner", "intermediate", "advanced", "expert"]);

export const AvailabilityStatusEnum = z.enum(["available", "limited", "unavailable"]);

export const TravelWillingnessEnum = z.enum(["no", "limited", "flexible"]);

export const WorkTypeEnum = z.enum(["onsite", "remote", "hybrid"]);

export const SocialPlatformEnum = z.enum(["linkedin", "twitter", "github", "website", "other"]);

const slugSchema = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/);
const urlSchema = z.string().url().optional().or(z.literal(""));
const emailSchema = z.string().email();

export const RegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password minimal 8 karakter"),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
});

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const AssociateProfileSchema = z.object({
  associate_id: z.string().uuid().optional(),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  headline: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: GenderEnum.optional(),
  nationality: z.string().optional(),
  photo_url: urlSchema,
});

export const AssociateExperienceSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  company: z.string().min(1, "Perusahaan wajib diisi"),
  position: z.string().min(1, "Posisi wajib diisi"),
  description: z.string().optional(),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  is_current: z.boolean().default(false),
  order_index: z.number().int().default(0),
});

export const AssociateEducationSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field_of_study: z.string().optional(),
  start_year: z.number().int().optional(),
  end_year: z.number().int().optional(),
  gpa: z.string().optional(),
  order_index: z.number().int().default(0),
});

export const AssociateCertificationSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  name: z.string().min(1),
  issuer: z.string().min(1),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  credential_id: z.string().optional(),
  credential_url: urlSchema,
  order_index: z.number().int().default(0),
});

export const AssociatePortfolioSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  client_name: z.string().optional(),
  project_url: urlSchema,
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  skills_used: z.array(z.string()).default([]),
  order_index: z.number().int().default(0),
});

export const AssociateSkillSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  skill_name: z.string().min(1),
  category: SkillCategoryEnum.optional(),
  proficiency: SkillProficiencyEnum.optional(),
  years_experience: z.number().int().optional(),
});

export const AssociateLanguageSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  language: z.string().min(1),
  proficiency: LanguageProficiencyEnum,
});

export const AssociateAvailabilitySchema = z.object({
  status: AvailabilityStatusEnum.default("available"),
  max_hours_per_week: z.number().int().positive().optional(),
  preferred_work_type: z.array(WorkTypeEnum).default([]),
  travel_willingness: TravelWillingnessEnum.default("flexible"),
  available_from: z.string().optional(),
  notes: z.string().optional(),
});

export const AssociateSocialLinkSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  platform: SocialPlatformEnum,
  url: z.string().url("URL tidak valid"),
  is_primary: z.boolean().default(false),
});

export const AssociateEmergencyContactSchema = z.object({
  id: z.string().uuid().optional(),
  associate_id: z.string().uuid().optional(),
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
  email: emailSchema.optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
});

export const AssociatePreferencesSchema = z.object({
  locale: z.enum(["id", "en"]).default("id"),
  email_notifications: z.boolean().default(true),
  whatsapp_notifications: z.boolean().default(true),
  profile_visibility: z.enum(["public", "private", "contacts_only"]).default("private"),
});

export const AssociateFullSchema = z.object({
  profile: AssociateProfileSchema,
  experiences: z.array(AssociateExperienceSchema).default([]),
  educations: z.array(AssociateEducationSchema).default([]),
  certifications: z.array(AssociateCertificationSchema).default([]),
  portfolios: z.array(AssociatePortfolioSchema).default([]),
  skills: z.array(AssociateSkillSchema).default([]),
  languages: z.array(AssociateLanguageSchema).default([]),
  availability: AssociateAvailabilitySchema.optional(),
  social_links: z.array(AssociateSocialLinkSchema).default([]),
  emergency_contact: AssociateEmergencyContactSchema.optional(),
  preferences: AssociatePreferencesSchema.optional(),
});

export const DocumentUploadSchema = z.object({
  type: DocumentTypeEnum,
  name: z.string().min(1),
  url: z.string().url(),
});

export const ReviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  notes: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AssociateProfileInput = z.infer<typeof AssociateProfileSchema>;
export type AssociateExperienceInput = z.infer<typeof AssociateExperienceSchema>;
export type AssociateEducationInput = z.infer<typeof AssociateEducationSchema>;
export type AssociateCertificationInput = z.infer<typeof AssociateCertificationSchema>;
export type AssociatePortfolioInput = z.infer<typeof AssociatePortfolioSchema>;
export type AssociateSkillInput = z.infer<typeof AssociateSkillSchema>;
export type AssociateLanguageInput = z.infer<typeof AssociateLanguageSchema>;
export type AssociateFullInput = z.infer<typeof AssociateFullSchema>;
export type ReviewInput = z.infer<typeof ReviewSchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
