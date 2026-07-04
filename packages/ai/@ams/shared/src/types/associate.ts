// ============================================
// ASSOCIATE TYPES
// ============================================

export type AssociateStatus = 'draft' | 'pending_review' | 'active' | 'inactive' | 'suspended';

export interface Associate {
  id: string;
  slug: string;
  status: AssociateStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PROFILE TYPES
// ============================================

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface AssociateProfile {
  id: string;
  associateId: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  nationality: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EXPERIENCE TYPES
// ============================================

export interface AssociateExperience {
  id: string;
  associateId: string;
  company: string;
  position: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  orderIndex: number;
  createdAt: string;
}

// ============================================
// EDUCATION TYPES
// ============================================

export interface AssociateEducation {
  id: string;
  associateId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
  gpa: number | null;
  orderIndex: number;
  createdAt: string;
}

// ============================================
// CERTIFICATION TYPES
// ============================================

export interface AssociateCertification {
  id: string;
  associateId: string;
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  orderIndex: number;
  createdAt: string;
}

// ============================================
// PORTFOLIO TYPES
// ============================================

export interface AssociatePortfolio {
  id: string;
  associateId: string;
  title: string;
  description: string | null;
  clientName: string | null;
  projectUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  skillsUsed: string[];
  orderIndex: number;
  createdAt: string;
}

// ============================================
// SKILL TYPES
// ============================================

export type SkillCategory = 'technical' | 'soft_skill' | 'industry' | 'other';
export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface AssociateSkill {
  id: string;
  associateId: string;
  skillName: string;
  category: SkillCategory | null;
  proficiency: SkillProficiency | null;
  yearsExperience: number | null;
  createdAt: string;
}

// ============================================
// LANGUAGE TYPES
// ============================================

export type LanguageProficiency = 'basic' | 'conversational' | 'fluent' | 'native';

export interface AssociateLanguage {
  id: string;
  associateId: string;
  language: string;
  proficiency: LanguageProficiency;
  createdAt: string;
}

// ============================================
// AVAILABILITY TYPES
// ============================================

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';
export type TravelWillingness = 'no' | 'limited' | 'flexible';
export type WorkType = 'onsite' | 'remote' | 'hybrid';

export interface AssociateAvailability {
  id: string;
  associateId: string;
  status: AvailabilityStatus;
  maxHoursPerWeek: number | null;
  preferredWorkType: WorkType[];
  travelWillingness: TravelWillingness;
  availableFrom: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SOCIAL LINK TYPES
// ============================================

export type SocialPlatform = 'linkedin' | 'twitter' | 'github' | 'website' | 'other';

export interface AssociateSocialLink {
  id: string;
  associateId: string;
  platform: SocialPlatform;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

// ============================================
// EMERGENCY CONTACT TYPES
// ============================================

export interface AssociateEmergencyContact {
  id: string;
  associateId: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
  createdAt: string;
}

// ============================================
// PREFERENCE TYPES
// ============================================

export type Locale = 'id' | 'en';
export type ProfileVisibility = 'public' | 'private' | 'contacts_only';

export interface AssociatePreference {
  id: string;
  associateId: string;
  locale: Locale;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  profileVisibility: ProfileVisibility;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMPLETE ASSOCIATE (WITH ALL RELATIONS)
// ============================================

export interface AssociateWithProfile extends Associate {
  profile: AssociateProfile | null;
  experiences: AssociateExperience[];
  educations: AssociateEducation[];
  certifications: AssociateCertification[];
  portfolios: AssociatePortfolio[];
  skills: AssociateSkill[];
  languages: AssociateLanguage[];
  availability: AssociateAvailability | null;
  socialLinks: AssociateSocialLink[];
  emergencyContact: AssociateEmergencyContact | null;
  preferences: AssociatePreference | null;
}
