import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig, ParsedCV } from './base';
import { CV_PARSING_PROMPT } from '../prompts/cv-parsing';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: process.env.OPENAI_API_BASE || undefined,
      defaultHeaders: {
        "HTTP-Referer": "https://binahub.id",
        "X-Title": "BinaHub Platform",
      }
    });
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-4o';
    this.temperature = config.temperature ?? 0.3;
    this.maxTokens = config.maxTokens ?? 4096;
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

    return JSON.parse(content) as ParsedCV;
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
