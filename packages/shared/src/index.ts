export enum AssociateStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum DocumentType {
  CV = "cv",
  CERTIFICATE = "certificate",
  PORTFOLIO = "portfolio",
  OTHER = "other",
}

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export type AssociateCategory =
  | "assessor"
  | "facilitator"
  | "trainer"
  | "coach"
  | "project_manager"
  | "consultant"
  | "speaker";

export interface Associate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  title?: string;
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
  specializations: string[];
  categories: AssociateCategory[];
  experience_years?: number;
  is_profile_complete: boolean;
  status: AssociateStatus;
  created_at: string;
  updated_at: string;
}

export interface AssociateDocument {
  id: string;
  associate_id: string;
  type: DocumentType;
  name: string;
  url: string;
  parsed_data?: Record<string, unknown>;
  created_at: string;
}

export interface AssociateReview {
  id: string;
  associate_id: string;
  reviewer_id: string;
  status: ReviewStatus;
  notes?: string;
  created_at: string;
}

// Re-export detailed types from types/associate.ts
export type {
  AssociateStatus as AssociateStatusType,
  AssociateProfile,
  AssociateExperience,
  AssociateEducation,
  AssociateCertification,
  AssociatePortfolio,
  AssociateSkill,
  AssociateLanguage,
  AssociateAvailability,
  AssociateSocialLink,
  AssociateEmergencyContact,
  AssociatePreference,
  AssociateWithProfile
} from './types/associate';
