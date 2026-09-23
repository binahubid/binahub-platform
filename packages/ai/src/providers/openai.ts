import OpenAI from 'openai';
import { z } from 'zod';
import type { AIProvider, AIProviderConfig, ParsedCV } from './base.js';
import { CV_PARSING_PROMPT } from '../prompts/cv-parsing.js';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().default(null);
const nullableDate = z.string().trim().refine((value) => {
  if (!/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  if (!monthText) return year >= 1900 && year <= 2100;
  const month = Number(monthText);
  if (month < 1 || month > 12) return false;
  if (!dayText) return true;
  const day = Number(dayText);
  return day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}).nullable().optional().default(null);
const nullableUrl = z.string().trim().url().max(2000).nullable().optional().default(null);

const parsedCVSchema = z.object({
  fullName: nullableText(255),
  preferredName: nullableText(100),
  email: z.string().trim().email().max(320).nullable().optional().default(null),
  phone: nullableText(50),
  location: nullableText(255),
  nationality: nullableText(100),
  dateOfBirth: nullableDate,
  gender: z.enum(['male', 'female', 'other']).nullable().optional().default(null),
  headline: nullableText(255),
  bio: nullableText(5000),
  linkedIn: nullableUrl,
  website: nullableUrl,
  roles: z.array(z.string().trim().min(1).max(100)).max(20).optional().default([]),
  expertises: z.array(z.string().trim().min(1).max(100)).max(30).optional().default([]),
  skills: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    category: z.enum(['technical', 'soft_skill', 'industry', 'other']).nullable().optional().default(null),
    proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullable().optional().default(null),
    yearsExperience: z.number().int().min(0).max(100).nullable().optional().default(null),
  })).max(200).optional().default([]),
  experience: z.array(z.object({
    company: z.string().trim().min(1).max(255),
    position: z.string().trim().min(1).max(255),
    industry: nullableText(100),
    description: nullableText(5000),
    achievement: nullableText(5000),
    startDate: nullableDate,
    endDate: nullableDate,
    isCurrent: z.boolean().optional().default(false),
  })).max(100).optional().default([]),
  education: z.array(z.object({
    institution: z.string().trim().min(1).max(255),
    degree: z.string().trim().min(1).max(255),
    fieldOfStudy: nullableText(255),
    startYear: z.number().int().min(1900).max(2100).nullable().optional().default(null),
    endYear: z.number().int().min(1900).max(2100).nullable().optional().default(null),
  })).max(100).optional().default([]),
  certifications: z.array(z.object({
    name: z.string().trim().min(1).max(255),
    issuer: z.string().trim().max(255).default(''),
    issueDate: nullableDate,
    expiryDate: nullableDate,
    credentialId: nullableText(255),
    credentialUrl: nullableUrl,
  })).max(100).optional().default([]),
  languages: z.array(z.object({
    language: z.string().trim().min(1).max(100),
    proficiency: z.enum(['basic', 'conversational', 'fluent', 'native']).nullable().optional().default(null),
  })).max(50).optional().default([]),
  portfolios: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    description: nullableText(5000),
    category: nullableText(100),
    clientName: nullableText(255),
    projectUrl: nullableUrl,
    startDate: nullableDate,
    endDate: nullableDate,
    skillsUsed: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  })).max(100).optional().default([]),
});

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function pick(record: UnknownRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

function textValue(value: unknown, max: number): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function listValue(value: unknown, limit: number, itemMax = 100): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;\n]/)
      : [];
  return Array.from(new Set(values
    .map((item) => textValue(item, itemMax))
    .filter((item): item is string => Boolean(item))))
    .slice(0, limit);
}

function dateValue(value: unknown): string | null {
  const text = textValue(value, 40);
  if (!text || /^(present|current|now|sekarang|saat ini|ongoing)$/i.test(text)) return null;
  const normalized = text.replace(/[/.]/g, '-').replace(/\s+/g, '');
  const match = normalized.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  if (year < 1900 || year > 2100 || (month !== null && (month < 1 || month > 12))) return null;
  if (day !== null && month !== null && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())) return null;
  return `${year}${month === null ? '' : `-${String(month).padStart(2, '0')}`}${day === null ? '' : `-${String(day).padStart(2, '0')}`}`;
}

function yearValue(value: unknown): number | null {
  const date = dateValue(value);
  if (date) return Number(date.slice(0, 4));
  const number = Number(value);
  return Number.isInteger(number) && number >= 1900 && number <= 2100 ? number : null;
}

function urlValue(value: unknown): string | null {
  let text = textValue(value, 2000);
  if (!text) return null;
  if (/^(www\.|linkedin\.com\/)/i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function emailValue(value: unknown): string | null {
  const text = textValue(value, 320);
  return text && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return /^(true|yes|ya|current|present|sekarang)$/i.test(value.trim());
  return false;
}

function normalizeGender(value: unknown): 'male' | 'female' | 'other' | null {
  const text = textValue(value, 30)?.toLowerCase().replace(/[\s_-]+/g, '');
  if (!text) return null;
  if (['male', 'man', 'lakilaki', 'pria'].includes(text)) return 'male';
  if (['female', 'woman', 'perempuan', 'wanita'].includes(text)) return 'female';
  if (['other', 'lainnya', 'nonbinary'].includes(text)) return 'other';
  return null;
}

function normalizeSkillCategory(value: unknown): 'technical' | 'soft_skill' | 'industry' | 'other' | null {
  const text = textValue(value, 50)?.toLowerCase().replace(/[\s-]+/g, '_');
  if (!text) return null;
  if (['technical', 'tech', 'hard_skill', 'hardskill'].includes(text)) return 'technical';
  if (['soft_skill', 'softskill', 'behavioral', 'interpersonal'].includes(text)) return 'soft_skill';
  if (['industry', 'domain', 'sector'].includes(text)) return 'industry';
  return 'other';
}

function normalizeProficiency(value: unknown): 'beginner' | 'intermediate' | 'advanced' | 'expert' | null {
  const text = textValue(value, 50)?.toLowerCase().replace(/[\s-]+/g, '_');
  if (!text) return null;
  if (['beginner', 'basic', 'novice'].includes(text)) return 'beginner';
  if (['intermediate', 'competent', 'conversational'].includes(text)) return 'intermediate';
  if (['advanced', 'proficient', 'professional', 'fluent'].includes(text)) return 'advanced';
  if (['expert', 'master', 'native'].includes(text)) return 'expert';
  return null;
}

function normalizeLanguageProficiency(value: unknown): 'basic' | 'conversational' | 'fluent' | 'native' | null {
  const proficiency = normalizeProficiency(value);
  if (proficiency === 'beginner') return 'basic';
  if (proficiency === 'intermediate') return 'conversational';
  if (proficiency === 'advanced') return 'fluent';
  if (proficiency === 'expert') return 'native';
  return null;
}

function collection(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function unwrapParsedCV(value: unknown): UnknownRecord {
  const root = asRecord(value) || {};
  const recognizedKeys = ['fullName', 'full_name', 'skills', 'experience', 'experiences', 'education'];
  if (recognizedKeys.some((key) => root[key] !== undefined)) return root;
  for (const key of ['data', 'cv', 'resume', 'profile', 'parsed']) {
    const nested = asRecord(root[key]);
    if (nested) return nested;
  }
  return root;
}

function normalizeParsedCV(value: unknown): UnknownRecord {
  const root = unwrapParsedCV(value);
  const skills: UnknownRecord[] = collection(pick(root, 'skills', 'skill')).flatMap<UnknownRecord>((item) => {
    if (typeof item === 'string') {
      const name = textValue(item, 100);
      return name ? [{ name, category: null, proficiency: null, yearsExperience: null }] : [];
    }
    const entry = asRecord(item);
    const name = entry ? textValue(pick(entry, 'name', 'skill', 'title'), 100) : null;
    if (!entry || !name) return [];
    const rawYears = Number(pick(entry, 'yearsExperience', 'years_experience', 'years'));
    return [{
      name,
      category: normalizeSkillCategory(pick(entry, 'category', 'type')),
      proficiency: normalizeProficiency(pick(entry, 'proficiency', 'level')),
      yearsExperience: Number.isFinite(rawYears) ? Math.max(0, Math.min(100, Math.round(rawYears))) : null,
    }];
  }).slice(0, 200);

  const experience = collection(pick(root, 'experience', 'experiences', 'workExperience', 'work_experience')).flatMap((item) => {
    const entry = asRecord(item);
    if (!entry) return [];
    const company = textValue(pick(entry, 'company', 'companyName', 'company_name', 'organization', 'employer'), 255);
    const position = textValue(pick(entry, 'position', 'jobTitle', 'job_title', 'title', 'role'), 255);
    if (!company || !position) return [];
    const rawEnd = pick(entry, 'endDate', 'end_date', 'end');
    return [{
      company,
      position,
      industry: textValue(pick(entry, 'industry', 'sector'), 100),
      description: textValue(pick(entry, 'description', 'responsibilities', 'summary'), 5000),
      achievement: textValue(pick(entry, 'achievement', 'achievements', 'accomplishment'), 5000),
      startDate: dateValue(pick(entry, 'startDate', 'start_date', 'start')),
      endDate: dateValue(rawEnd),
      isCurrent: booleanValue(pick(entry, 'isCurrent', 'is_current', 'current'))
        || (typeof rawEnd === 'string' && /present|current|sekarang|saat ini/i.test(rawEnd)),
    }];
  }).slice(0, 100);

  const education = collection(pick(root, 'education', 'educations')).flatMap((item) => {
    const entry = asRecord(item);
    if (!entry) return [];
    const institution = textValue(pick(entry, 'institution', 'school', 'university'), 255);
    const degree = textValue(pick(entry, 'degree', 'qualification', 'level'), 255);
    if (!institution || !degree) return [];
    return [{
      institution,
      degree,
      fieldOfStudy: textValue(pick(entry, 'fieldOfStudy', 'field_of_study', 'major'), 255),
      startYear: yearValue(pick(entry, 'startYear', 'start_year', 'startDate', 'start_date')),
      endYear: yearValue(pick(entry, 'endYear', 'end_year', 'endDate', 'end_date')),
    }];
  }).slice(0, 100);

  const certifications: UnknownRecord[] = collection(pick(root, 'certifications', 'certificates', 'certification')).flatMap<UnknownRecord>((item) => {
    if (typeof item === 'string') {
      const name = textValue(item, 255);
      return name ? [{ name, issuer: '', issueDate: null, expiryDate: null, credentialId: null, credentialUrl: null }] : [];
    }
    const entry = asRecord(item);
    const name = entry ? textValue(pick(entry, 'name', 'title', 'certification'), 255) : null;
    if (!entry || !name) return [];
    return [{
      name,
      issuer: textValue(pick(entry, 'issuer', 'organization'), 255) || '',
      issueDate: dateValue(pick(entry, 'issueDate', 'issue_date', 'date')),
      expiryDate: dateValue(pick(entry, 'expiryDate', 'expiry_date', 'expirationDate')),
      credentialId: textValue(pick(entry, 'credentialId', 'credential_id', 'id'), 255),
      credentialUrl: urlValue(pick(entry, 'credentialUrl', 'credential_url', 'url')),
    }];
  }).slice(0, 100);

  const languages: UnknownRecord[] = collection(pick(root, 'languages', 'language')).flatMap<UnknownRecord>((item) => {
    if (typeof item === 'string') {
      const language = textValue(item, 100);
      return language ? [{ language, proficiency: null }] : [];
    }
    const entry = asRecord(item);
    const language = entry ? textValue(pick(entry, 'language', 'name'), 100) : null;
    return entry && language ? [{ language, proficiency: normalizeLanguageProficiency(pick(entry, 'proficiency', 'level')) }] : [];
  }).slice(0, 50);

  const portfolios = collection(pick(root, 'portfolios', 'portfolio', 'projects')).flatMap((item) => {
    const entry = asRecord(item);
    const title = entry ? textValue(pick(entry, 'title', 'name', 'project'), 255) : null;
    if (!entry || !title) return [];
    return [{
      title,
      description: textValue(pick(entry, 'description', 'summary'), 5000),
      category: textValue(pick(entry, 'category', 'type'), 100),
      clientName: textValue(pick(entry, 'clientName', 'client_name', 'client'), 255),
      projectUrl: urlValue(pick(entry, 'projectUrl', 'project_url', 'url')),
      startDate: dateValue(pick(entry, 'startDate', 'start_date', 'start')),
      endDate: dateValue(pick(entry, 'endDate', 'end_date', 'end')),
      skillsUsed: listValue(pick(entry, 'skillsUsed', 'skills_used', 'skills'), 50),
    }];
  }).slice(0, 100);

  return {
    fullName: textValue(pick(root, 'fullName', 'full_name', 'name'), 255),
    preferredName: textValue(pick(root, 'preferredName', 'preferred_name', 'nickname'), 100),
    email: emailValue(pick(root, 'email', 'emailAddress', 'email_address')),
    phone: textValue(pick(root, 'phone', 'phoneNumber', 'phone_number', 'mobile'), 50),
    location: textValue(pick(root, 'location', 'address', 'city'), 255),
    nationality: textValue(pick(root, 'nationality', 'citizenship'), 100),
    dateOfBirth: dateValue(pick(root, 'dateOfBirth', 'date_of_birth', 'dob')),
    gender: normalizeGender(pick(root, 'gender', 'sex')),
    headline: textValue(pick(root, 'headline', 'professionalHeadline', 'professional_headline', 'title'), 255),
    bio: textValue(pick(root, 'bio', 'summary', 'professionalSummary', 'professional_summary'), 5000),
    linkedIn: urlValue(pick(root, 'linkedIn', 'linkedin', 'linked_in')),
    website: urlValue(pick(root, 'website', 'portfolioUrl', 'portfolio_url')),
    roles: listValue(pick(root, 'roles', 'professionalRoles', 'professional_roles'), 20),
    expertises: listValue(pick(root, 'expertises', 'expertise', 'areasOfExpertise', 'areas_of_expertise'), 30),
    skills,
    experience,
    education,
    certifications,
    languages,
    portfolios,
  };
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private jsonMode: boolean;
  private timeoutMs: number;

  constructor(config: AIProviderConfig) {
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || process.env.OPENAI_API_BASE || "https://opencode.ai/zen/v1",
      timeout: this.timeoutMs,
      maxRetries: 0,
    });
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-4o';
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 12_000;
    this.jsonMode = config.jsonMode ?? true;
  }

  async parseCV(text: string): Promise<ParsedCV> {
    const controller = new AbortController();
    const hardTimeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: CV_PARSING_PROMPT },
          { role: 'user', content: text }
        ],
        response_format: this.jsonMode ? { type: 'json_object' } : undefined,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      }, { signal: controller.signal });
    } finally {
      clearTimeout(hardTimeout);
    }

    const providerResponse = response as typeof response & {
      error?: { message?: string; code?: string | number };
    };
    if (providerResponse.error) {
      const code = providerResponse.error.code ? ` (${providerResponse.error.code})` : '';
      const providerError = new Error(`AI provider error${code}: ${providerResponse.error.message || 'unknown error'}`) as Error & {
        status?: number;
      };
      const numericStatus = Number(providerResponse.error.code);
      if (Number.isInteger(numericStatus) && numericStatus >= 400 && numericStatus <= 599) {
        providerError.status = numericStatus;
      }
      throw providerError;
    }

    const content = providerResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let decoded: unknown;
    try {
      const normalized = content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');
      try {
        decoded = JSON.parse(normalized);
      } catch {
        const firstBrace = normalized.indexOf('{');
        const lastBrace = normalized.lastIndexOf('}');
        if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error('No JSON object found');
        decoded = JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
      }
    } catch {
      throw new Error('AI provider returned invalid JSON');
    }

    const normalizedValidation = parsedCVSchema.safeParse(normalizeParsedCV(decoded));
    if (!normalizedValidation.success) {
      const issuePaths = Array.from(new Set(normalizedValidation.error.issues
        .map((issue) => issue.path.join('.') || 'root')))
        .slice(0, 8)
        .join(',');
      throw new Error(`AI provider returned an invalid CV structure${issuePaths ? ` at ${issuePaths}` : ''}`);
    }
    return normalizedValidation.data as ParsedCV;
  }

  async generateInsight(data: Record<string, unknown>): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional HR analyst. Generate insights based on the provided data.'
        },
        {
          role: 'user',
          content: `Generate insight from this data:\n${JSON.stringify(data, null, 2)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || '';
  }

  async summarize(text: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Summarize the following text concisely.'
        },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0]?.message?.content || '';
  }
}
