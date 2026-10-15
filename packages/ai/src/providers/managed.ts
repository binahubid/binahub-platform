import { createHmac } from 'node:crypto';
import OpenAI from 'openai';

export function usesManagedAI(environment: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(environment.APP_INTEGRATION_SECRET?.trim());
}

export function createManagedAIClient(environment: NodeJS.ProcessEnv = process.env): OpenAI {
  const secret = environment.APP_INTEGRATION_SECRET?.trim();
  if (!secret) throw new Error('BinaHub AI integration is not configured');
  const base = (environment.APP_INTEGRATION_API_URL?.trim() || 'https://api.binahub.id').replace(/\/+$/, '');
  const target = new URL(`${base}/api/integrations/ams/ai/chat/completions`);
  if (target.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(target.hostname)) {
    throw new Error('BinaHub AI integration requires HTTPS');
  }
  return new OpenAI({
    apiKey: 'binahub-managed', baseURL: `${base}/api/integrations/ams/ai`, timeout: 70_000, maxRetries: 0,
    fetch: async (url, init) => {
      if (String(url) !== target.href || typeof init?.body !== 'string') throw new Error('Invalid managed AI request');
      const timestamp = String(Date.now());
      const headers = new Headers(init.headers);
      headers.delete('authorization');
      headers.set('x-binahub-timestamp', timestamp);
      headers.set('x-binahub-signature', createHmac('sha256', secret).update(`${timestamp}.${init.body}`).digest('hex'));
      return fetch(url, { ...init, headers, redirect: 'error' });
    },
  });
}
