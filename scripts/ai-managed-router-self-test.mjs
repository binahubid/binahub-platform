import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { parseCVWithFallback, rankCandidates } from '../packages/ai/dist/index.js';

const secret = 'synthetic-managed-test-secret';
let fail = false;
const requests = [];
const server = createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk.toString();
  const timestamp = req.headers['x-binahub-timestamp'];
  assert.equal(req.url, '/api/integrations/ams/ai/chat/completions');
  assert.equal(req.headers.authorization, undefined);
  assert.equal(req.headers['x-binahub-signature'], createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex'));
  const body = JSON.parse(raw); assert.equal(body.model, 'binahub-managed'); requests.push(body);
  res.setHeader('content-type', 'application/json');
  if (fail) { res.writeHead(503).end(JSON.stringify({ error: { message: 'Synthetic failure' } })); return; }
  const isRanking = body.messages[0].content.includes('Talent Matcher');
  res.end(JSON.stringify({ id: 'test', object: 'chat.completion', model: 'test',
    choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(isRanking
      ? { recommendations: [{ associate_id: 'synthetic-id', score: 80, reasoning: 'Synthetic match' }] }
      : { fullName: 'Synthetic Person', email: 'synthetic@example.invalid', roles: [], expertises: [], skills: [], experience: [], education: [], certifications: [], languages: [], portfolios: [] }) }, finish_reason: 'stop' }] }));
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const environment = { APP_INTEGRATION_SECRET: secret, APP_INTEGRATION_API_URL: base,
  LAPAKVIP_API_KEY: 'must-not-use', LAPAKVIP_BASE_URL: 'http://127.0.0.1:1',
  OPENROUTER_API_KEY: 'must-not-use', OPENROUTER_BASE_URL: 'http://127.0.0.1:1' };
const previous = { APP_INTEGRATION_SECRET: process.env.APP_INTEGRATION_SECRET, APP_INTEGRATION_API_URL: process.env.APP_INTEGRATION_API_URL };
try {
  const parsed = await parseCVWithFallback('Synthetic CV text only', environment);
  assert.equal(parsed.fullName, 'Synthetic Person'); assert.equal(requests.length, 1);
  Object.assign(process.env, { APP_INTEGRATION_SECRET: secret, APP_INTEGRATION_API_URL: base });
  const ranking = await rankCandidates({ title: 'Synthetic project', client_name: 'Synthetic client', description: '', needed_roles: [] }, []);
  assert.equal(ranking[0].associate_id, 'synthetic-id'); assert.equal(requests.length, 2);
  fail = true;
  await assert.rejects(() => parseCVWithFallback('Synthetic CV', environment), { name: 'AIProviderExhaustedError' });
  assert.equal(requests.length, 3, 'Managed failure must not trigger a direct-provider or SDK retry');
  console.log('Managed AI tests passed: signed CV/ranking, no credential exposure, no bypass or automatic duplicate retry.');
} finally {
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await new Promise((resolve) => server.close(resolve));
}
