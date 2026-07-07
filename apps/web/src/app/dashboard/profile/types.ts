export type ProfileData = {
  full_name: string;
  preferred_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  timezone?: string | null;
  nationality?: string | null;
  photo_url?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  roles?: string[];
  expertises?: string[];
};

export type Experience = {
  id: string;
  organization: string;
  position: string;
  industry?: string | null;
  description?: string | null;
  achievement?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
};

export type Education = {
  id: string;
  institution: string;
  degree: string;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
};

export type Skill = {
  id: string;
  skill_name: string;
  proficiency?: string | null;
  category?: string | null;
  years_experience?: number | null;
};

export type Document = {
  id: string;
  type: string;
  name: string;
  file_name: string;
  file_size: number;
  storage_path?: string | null;
  created_at: string;
};

export type Language = {
  id: string;
  language: string;
  proficiency: string;
};

export type Availability = {
  status?: string;
  work_locations?: string[];
  travel_ready?: boolean;
  preferred_engagements?: string[];
  max_hours_per_week?: number | null;
  available_from?: string | null;
  notes?: string | null;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  is_primary?: boolean;
};

export type EmergencyContact = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
};

export type AssociateData = {
  id: string;
  status: string;
  profile: ProfileData | null;
  experiences: Experience[];
  educations: Education[];
  certifications: { id: string; name: string; issuer: string }[];
  skills: Skill[];
  languages: Language[];
  documents: Document[];
  portfolios: { id: string; title: string }[];
  availability: Availability | null;
  socialLinks: SocialLink[];
  emergencyContact: EmergencyContact | null;
};
