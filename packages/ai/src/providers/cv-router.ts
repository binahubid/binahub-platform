import type { ParsedCV } from './base.js';
import { OpenAIProvider } from './openai.js';

type CVProviderAttempt = {
  provider: 'lapakvip' | 'openrouter' | 'legacy';
  apiKey: string;
  baseURL: string;
  model: string;
  jsonMode: boolean;
};

type SafeFailure = {
  provider: CVProviderAttempt['provider'];
  model: string;
  reason: string;
};

function commaList(value: string | undefined): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeLapakVipModel(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized.startsWith('lv/')) return normalized;
  if (normalized.startsWith('deepseek/')) return `lv/${normalized.slice('deepseek/'.length)}`;
  if (normalized.startsWith('x-ai/')) return `lv/${normalized.slice('x-ai/'.length)}`;
  return `lv/${normalized}`;
}

function normalizeOpenRouterModel(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'lv/deepseek-v4.1-flash' || normalized === 'deepseek-v4.1-flash') {
    return 'deepseek/deepseek-v4.1-flash';
  }
  if (normalized === 'lv/grok-4.6' || normalized === 'grok-4.6') {
    return 'x-ai/grok-4.6';
  }
  return normalized;
}

function uniqueAttempts(attempts: CVProviderAttempt[]): CVProviderAttempt[] {
  const seen = new Set<string>();
  return attempts.filter((attempt) => {
    const key = `${attempt.baseURL.replace(/\/$/, '')}|${attempt.apiKey}|${attempt.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildCVProviderAttempts(
  environment: NodeJS.ProcessEnv = process.env,
): CVProviderAttempt[] {
  const attempts: CVProviderAttempt[] = [];
  const lapakVipKey = environment.LAPAKVIP_API_KEY?.trim();
  if (lapakVipKey) {
    const models = [
      environment.LAPAKVIP_MODEL?.trim() || 'lv/deepseek-v4.1-flash',
      ...commaList(environment.LAPAKVIP_FALLBACK_MODELS || 'lv/grok-4.6'),
    ].map(normalizeLapakVipModel);
    for (const model of new Set(models)) {
      attempts.push({
        provider: 'lapakvip',
        apiKey: lapakVipKey,
        baseURL: environment.LAPAKVIP_BASE_URL?.trim() || 'https://router.lapakvip.com/api/v1',
        model,
        jsonMode: environment.LAPAKVIP_JSON_MODE_ENABLED === 'true',
      });
    }
  }

  const openRouterKey = environment.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    const models = [
      environment.OPENROUTER_MODEL?.trim() || 'deepseek/deepseek-v4.1-flash',
      ...commaList(environment.OPENROUTER_FALLBACK_MODELS || 'x-ai/grok-4.6'),
    ].map(normalizeOpenRouterModel);
    for (const model of new Set(models)) {
      attempts.push({
        provider: 'openrouter',
        apiKey: openRouterKey,
        baseURL: environment.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1',
        model,
        jsonMode: environment.AI_JSON_MODE_ENABLED !== 'false',
      });
    }
  }

  // Backward compatibility for existing AMS deployments that still use
  // OPENAI_* for an OpenAI-compatible gateway such as OpenRouter.
  const legacyKey = environment.OPENAI_API_KEY?.trim();
  if (legacyKey) {
    const baseURL = environment.OPENAI_API_BASE?.trim() || 'https://api.openai.com/v1';
    const isOpenRouter = new URL(baseURL).hostname.toLowerCase().includes('openrouter');
    const defaultFallbacks = isOpenRouter
      ? 'qwen/qwen3.8-27b:free,google/gemma-4-31b-it:free'
      : '';
    const models = [
      environment.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
      ...commaList(environment.OPENAI_FALLBACK_MODELS || defaultFallbacks),
    ];
    for (const model of new Set(models)) {
      attempts.push({
        provider: isOpenRouter ? 'openrouter' : 'legacy',
        apiKey: legacyKey,
        baseURL,
        model,
        jsonMode: environment.AI_JSON_MODE_ENABLED !== 'false',
      });
    }
  }

  return uniqueAttempts(attempts);
}

function failureReason(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown_error';
  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number') return `http_${status}`;
  if (error instanceof Error) {
    if (error.name === 'AbortError' || /timeout|timed out/i.test(error.message)) return 'timeout';
    if (/invalid CV structure|invalid JSON/i.test(error.message)) return 'invalid_output';
    if (/provider error/i.test(error.message)) return 'provider_error';
    return error.name || 'error';
  }
  return 'unknown_error';
}

export class AIProviderConfigurationError extends Error {
  constructor() {
    super('AI provider is not configured');
    this.name = 'AIProviderConfigurationError';
  }
}

export class AIProviderExhaustedError extends Error {
  readonly failures: SafeFailure[];

  constructor(failures: SafeFailure[]) {
    super('All configured AI providers failed');
    this.name = 'AIProviderExhaustedError';
    this.failures = failures;
  }
}

export async function parseCVWithFallback(
  text: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<ParsedCV> {
  const attempts = buildCVProviderAttempts(environment);
  if (!attempts.length) throw new AIProviderConfigurationError();

  const failures: SafeFailure[] = [];
  const configuredTimeout = Number(environment.AI_REQUEST_TIMEOUT_MS) || 25_000;
  const perAttemptTimeout = Math.max(5_000, Math.min(configuredTimeout, 45_000));
  const configuredDeadline = Number(environment.AI_TOTAL_TIMEOUT_MS) || 55_000;
  const deadline = Date.now() + Math.max(10_000, Math.min(configuredDeadline, 120_000));
  const blockedCredentials = new Set<string>();

  for (const attempt of attempts) {
    const credentialId = `${attempt.baseURL.replace(/\/$/, '')}|${attempt.apiKey}`;
    if (blockedCredentials.has(credentialId)) continue;
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;

    try {
      const provider = new OpenAIProvider({
        apiKey: attempt.apiKey,
        baseURL: attempt.baseURL,
        model: attempt.model,
        maxTokens: Math.max(2_048, Math.min(Number(environment.AI_MAX_TOKENS) || 12_000, 32_768)),
        timeoutMs: Math.min(perAttemptTimeout, remaining),
        jsonMode: attempt.jsonMode,
      });
      const parsed = await provider.parseCV(text);
      console.info('[AI CV Router] parsing succeeded', {
        provider: attempt.provider,
        model: attempt.model,
      });
      return parsed;
    } catch (error) {
      const status = error && typeof error === 'object'
        ? (error as { status?: unknown }).status
        : undefined;
      const reason = failureReason(error);
      failures.push({ provider: attempt.provider, model: attempt.model, reason });
      console.warn('[AI CV Router] attempt failed; trying fallback', {
        provider: attempt.provider,
        model: attempt.model,
        reason,
      });
      if ([401, 402, 403].includes(typeof status === 'number' ? status : 0)) {
        blockedCredentials.add(credentialId);
      }
    }
  }

  throw new AIProviderExhaustedError(failures);
}
