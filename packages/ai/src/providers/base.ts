// ============================================
// PARSED CV TYPES
// ============================================

export interface ParsedCV {
  fullName: string | null;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  headline: string | null;
  bio: string | null;
  linkedIn: string | null;
  website: string | null;
  roles: string[];
  expertises: string[];
  skills: ParsedSkill[];
  experience: ParsedExperience[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  languages: ParsedLanguage[];
  portfolios: ParsedPortfolio[];
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
  industry: string | null;
  description: string | null;
  achievement: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
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
  credentialId: string | null;
  credentialUrl: string | null;
}

export interface ParsedLanguage {
  language: string;
  proficiency: string | null;
}

export interface ParsedPortfolio {
  title: string;
  description: string | null;
  category: string | null;
  clientName: string | null;
  projectUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  skillsUsed: string[];
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
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}
