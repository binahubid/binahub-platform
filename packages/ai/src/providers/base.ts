import type { AssociateProfile, AssociateSkill, AssociateExperience, AssociateEducation, AssociateCertification } from '@ams/shared';

// ============================================
// PARSED CV TYPES
// ============================================

export interface ParsedCV {
  headline: string | null;
  bio: string | null;
  skills: ParsedSkill[];
  experience: ParsedExperience[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  languages: ParsedLanguage[];
}

export interface ParsedSkill {
  name: string;
  category: string | null;
  proficiency: string | null;
  yearsExperience: number | null;
}

export interface ParsedExperience {
  company: string;
  position: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
}

export interface ParsedCertification {
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
}

export interface ParsedLanguage {
  language: string;
  proficiency: string | null;
}

// ============================================
// AI PROVIDER INTERFACE
// ============================================

export interface AIProvider {
  /**
   * Parse CV text and extract structured data
   */
  parseCV(text: string): Promise<ParsedCV>;

  /**
   * Generate insight from data
   */
  generateInsight(data: Record<string, unknown>): Promise<string>;

  /**
   * Summarize text
   */
  summarize(text: string): Promise<string>;
}

// ============================================
// AI PROVIDER CONFIGURATION
// ============================================

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
