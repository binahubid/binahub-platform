import assert from 'node:assert/strict';
import test from 'node:test';

Object.assign(process.env, {
  NODE_ENV:'production', SUPABASE_URL:'https://example.invalid',
  SUPABASE_ANON_KEY:'synthetic-anon', SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',
  CORS_ALLOWED_ORIGINS:'', FRONTEND_URL:'', APP_URL:'',
});
let outbound=0,rateChecks=0;
globalThis.fetch=async input=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin==='https://example.invalid'&&url.pathname==='/rest/v1/rpc/consume_rate_limit'){
    rateChecks++;
    return Response.json({allowed:true,remaining:9,reset_at:'2099-01-01T00:00:00Z'});
  }
  outbound++;throw new Error('Unexpected outbound requests are forbidden in the API contract.');
};
const {default:app}=await import('../apps/api/dist/app.js');

test('built Hono app preserves health version and request/security headers', async()=>{
  const response=await app.request('https://example.invalid/api/health',{headers:{'X-Request-Id':'synthetic-contract'}});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:'ok',version:'0.11.1'});
  assert.equal(response.headers.get('X-Request-Id'),'synthetic-contract');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(outbound,0);
});
test('built app rejects malformed registration/login without reaching an auth provider', async()=>{
  for(const route of ['register','login']){
    const response=await app.request('https://example.invalid/api/auth/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,400);
    assert.equal((await response.json()).success,false);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
  assert.equal(outbound,0);
  assert.equal(rateChecks,2);
});
test('private associate/admin/worker routes still reject missing authentication', async()=>{
  for(const [route,method] of [['associate/me','GET'],['admin/stats','GET'],['workers/process-events','POST']]){
    const response=await app.request('https://example.invalid/api/'+route,{method});
    assert.equal(response.status,401,route);
  }
  assert.equal(outbound,0);
});
test('CORS allows only the approved frontend, not an arbitrary caller', async()=>{
  for(const origin of ['https://ams.binahub.id','https://untrusted.invalid']){
    const response=await app.request('https://example.invalid/api/health',{headers:{Origin:origin}});
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin==='https://ams.binahub.id'?origin:null);
  }
  assert.equal(outbound,0);
});
