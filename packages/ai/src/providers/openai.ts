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

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: process.env.OPENAI_API_BASE || "https://opencode.ai/zen/v1",
      timeout: 45_000,
      maxRetries: 1,
    });
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-4o';
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 12_000;
  }

  async parseCV(text: string): Promise<ParsedCV> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: CV_PARSING_PROMPT },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: this.temperature,
      max_tokens: this.maxTokens
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(content);
    } catch {
      throw new Error('AI provider returned invalid JSON');
    }

    const validated = parsedCVSchema.safeParse(decoded);
    if (!validated.success) {
      throw new Error('AI provider returned an invalid CV structure');
    }
    return validated.data as ParsedCV;
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
