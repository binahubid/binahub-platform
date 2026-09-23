import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { parseCVWithFallback } from '../packages/ai/dist/index.js';

const requestedModels = [];
const server = http.createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
    response.writeHead(404).end();
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  requestedModels.push(body.model);

  response.setHeader('Content-Type', 'application/json');
  if (body.model === 'lv/deepseek-3.2') {
    response.end(JSON.stringify({
      id: 'primary-overloaded',
      error: { message: 'Provider overloaded', code: 503 },
    }));
    return;
  }

  response.end(JSON.stringify({
    id: 'fallback-success',
    object: 'chat.completion',
    choices: [{
      index: 0,
      finish_reason: 'stop',
      message: { role: 'assistant', content: '```json\n{}\n```' },
    }],
  }));
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  const address = server.address();
  assert.equal(typeof address, 'object');
  const baseURL = `http://127.0.0.1:${address.port}/v1`;
  const parsed = await parseCVWithFallback('Nama: Pengguna Uji\nPengalaman: Fasilitator', {
    LAPAKVIP_API_KEY: 'lapak-test-key',
    LAPAKVIP_BASE_URL: baseURL,
    LAPAKVIP_MODEL: 'lv/deepseek-3.2',
    OPENROUTER_API_KEY: 'openrouter-test-key',
    OPENROUTER_BASE_URL: baseURL,
    OPENROUTER_MODEL: 'openrouter-fallback',
    OPENROUTER_FALLBACK_MODELS: 'openrouter-fallback',
    AI_REQUEST_TIMEOUT_MS: '5000',
    AI_TOTAL_TIMEOUT_MS: '15000',
  });

  assert.deepEqual(requestedModels, ['lv/deepseek-3.2', 'openrouter-fallback']);
  assert.equal(parsed.fullName, null);
  assert.deepEqual(parsed.skills, []);
  console.log('[PASS] LapakVIP overload berpindah ke OpenRouter fallback');
  console.log('[PASS] JSON berbungkus code fence dinormalisasi dan divalidasi');
} finally {
  server.close();
}
